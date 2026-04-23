import { withFallback } from '@/lib/ai-pool/cascade'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import type { CodeExample, CodeLanguage, Endpoint } from './types'

const DEFAULT_LANGUAGES: CodeLanguage[] = ['js', 'ts', 'py', 'go', 'rb', 'curl']

const FEW_SHOT = `
Exemple 1 — JS (fetch) pour GET /users/{id}:
\`\`\`js
const res = await fetch('https://api.example.com/users/42', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
});
const user = await res.json();
\`\`\`

Exemple 2 — Python (requests) pour POST /orders:
\`\`\`py
import requests
r = requests.post(
  'https://api.example.com/orders',
  json={'item_id': 7, 'qty': 2},
  headers={'Authorization': 'Bearer YOUR_TOKEN'},
)
order = r.json()
\`\`\`

Exemple 3 — curl pour DELETE /sessions/{sid}:
\`\`\`sh
curl -X DELETE 'https://api.example.com/sessions/abc123' \\
  -H 'Authorization: Bearer YOUR_TOKEN'
\`\`\`
`.trim()

const LANG_LABEL: Record<CodeLanguage, string> = {
  js: 'JavaScript (fetch)',
  ts: 'TypeScript (fetch)',
  py: 'Python (requests)',
  go: 'Go (net/http)',
  rb: 'Ruby (net/http)',
  curl: 'curl (shell)',
  rs: 'Rust (reqwest)',
  java: 'Java (HttpClient)',
  php: 'PHP (Guzzle)',
}

function stripFences(text: string): string {
  const m = text.match(/```(?:[a-z]+)?\n?([\s\S]*?)```/)
  if (m) return m[1].trim()
  return text.trim()
}

function buildPrompt(endpoint: Endpoint, baseUrl: string, lang: CodeLanguage): string {
  const params = endpoint.params.length
    ? endpoint.params.map(p => `  - ${p.name} (${p.in}${p.required ? ', requis' : ''})`).join('\n')
    : '  (aucun)'
  const body = endpoint.body_schema
    ? `\nRequest body (schema JSON):\n${JSON.stringify(endpoint.body_schema).slice(0, 600)}`
    : ''
  return `Génère un exemple de code ${LANG_LABEL[lang]} minimal et exécutable pour appeler :

${endpoint.method} ${baseUrl}${endpoint.path}
Résumé : ${endpoint.summary ?? endpoint.description ?? endpoint.operation_id ?? 'endpoint API'}
Paramètres :
${params}${body}

Contraintes :
- Code idiomatique, prêt à copier-coller
- Utilise 'YOUR_TOKEN' comme placeholder d'auth si une security est requise
- Valeurs d'exemple réalistes pour les paramètres path
- Pas de commentaires superflus, pas de dépendances exotiques
- Répond UNIQUEMENT avec le bloc de code, sans préambule ni explication

Exemples de style attendu :
${FEW_SHOT}
`.trim()
}

export type GenerateExamplesResult = {
  examples: Partial<Record<CodeLanguage, string>>
  costUsd: number
  provider: string
}

export async function generateExamplesForEndpoint(
  endpoint: Endpoint,
  baseUrl: string,
  languages: CodeLanguage[] = DEFAULT_LANGUAGES,
): Promise<GenerateExamplesResult> {
  const out: Partial<Record<CodeLanguage, string>> = {}
  let totalCost = 0
  let lastProvider = ''

  for (const lang of languages) {
    const prompt = buildPrompt(endpoint, baseUrl, lang)
    try {
      const res = await withFallback(
        {
          prompt,
          system: 'Tu es un expert API. Génère des exemples de code concis et exécutables.',
          temperature: 0.2,
          maxTokens: 600,
        },
        { project: 'cc' },
      )
      out[lang] = stripFences(res.text)
      totalCost += res.costUsd ?? 0
      lastProvider = res.provider
    } catch (e) {
      out[lang] = `// erreur: ${(e as Error).message.slice(0, 120)}`
    }
  }

  return { examples: out, costUsd: totalCost, provider: lastProvider }
}

export async function persistExamples(
  specId: string,
  endpoint: Endpoint,
  result: GenerateExamplesResult,
): Promise<number> {
  const admin = createSupabaseAdmin()
  const entries = Object.entries(result.examples)
    .filter(([, code]) => typeof code === 'string' && code.length > 0)
  const perExampleCost = entries.length > 0 ? (result.costUsd ?? 0) / entries.length : 0
  const rows = entries.map(([language, code]) => ({
    spec_id: specId,
    endpoint_path: endpoint.path,
    http_method: endpoint.method,
    language,
    code: code as string,
    tested: false,
    cost_eur: perExampleCost,
  }))

  if (!rows.length) return 0
  const { error, data } = await admin
    .from('api_doc_code_examples')
    .insert(rows)
    .select('id')
  if (error) throw new Error(`persistExamples: ${error.message}`)
  return data?.length ?? 0
}

export async function fetchCachedExamples(
  specId: string,
  endpointPath: string,
  method: string,
): Promise<CodeExample[]> {
  const admin = createSupabaseAdmin()
  const { data, error } = await admin
    .from('api_doc_code_examples')
    .select('*')
    .eq('spec_id', specId)
    .eq('endpoint_path', endpointPath)
    .eq('http_method', method)
  if (error) throw new Error(`fetchCachedExamples: ${error.message}`)
  return (data ?? []) as CodeExample[]
}

export { DEFAULT_LANGUAGES }
