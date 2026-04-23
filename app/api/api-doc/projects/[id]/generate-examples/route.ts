import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server'
import {
  DEFAULT_LANGUAGES,
  generateExamplesForEndpoint,
  persistExamples,
} from '@/lib/api-doc/examples-generator'
import type { CodeLanguage, ParsedAST } from '@/lib/api-doc/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const VALID_LANGS: CodeLanguage[] = ['js', 'ts', 'py', 'go', 'rb', 'curl', 'rs', 'java', 'php']

type GenBody = {
  spec_id?: string
  languages?: string[]
  max_endpoints?: number
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'non autorisé' }, { status: 401 })

  const { data: project, error: projErr } = await sb
    .from('api_doc_projects')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (projErr || !project) return NextResponse.json({ error: 'projet introuvable' }, { status: 404 })
  if (project.user_id !== user.id) return NextResponse.json({ error: 'accès refusé' }, { status: 403 })

  let body: GenBody
  try {
    body = (await req.json()) as GenBody
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const specId = body.spec_id
  if (!specId) return NextResponse.json({ error: 'spec_id requis' }, { status: 400 })

  const languages: CodeLanguage[] = Array.isArray(body.languages) && body.languages.length
    ? body.languages.filter((l): l is CodeLanguage => VALID_LANGS.includes(l as CodeLanguage))
    : DEFAULT_LANGUAGES
  if (!languages.length) return NextResponse.json({ error: 'langues invalides' }, { status: 400 })

  const admin = createSupabaseAdmin()
  const { data: spec, error: specErr } = await admin
    .from('api_doc_specs')
    .select('id, project_id, parsed_ast')
    .eq('id', specId)
    .single()

  if (specErr || !spec) return NextResponse.json({ error: 'spec introuvable' }, { status: 404 })
  if (spec.project_id !== id) return NextResponse.json({ error: 'spec hors projet' }, { status: 403 })

  const ast = spec.parsed_ast as ParsedAST | null
  if (!ast || !Array.isArray(ast.endpoints)) {
    return NextResponse.json({ error: 'AST absente — parse le spec d\'abord' }, { status: 400 })
  }

  const baseUrl = ast.servers?.[0]?.url ?? 'https://api.example.com'
  const maxEndpoints = Math.max(1, Math.min(body.max_endpoints ?? 50, 200))
  const endpoints = ast.endpoints.slice(0, maxEndpoints)

  let totalInserted = 0
  let totalCostUsd = 0
  const errors: { endpoint: string; error: string }[] = []

  for (const endpoint of endpoints) {
    try {
      const result = await generateExamplesForEndpoint(endpoint, baseUrl, languages)
      totalCostUsd += result.costUsd
      const inserted = await persistExamples(specId, endpoint, result)
      totalInserted += inserted
    } catch (e) {
      errors.push({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        error: (e as Error).message.slice(0, 160),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    inserted_count: totalInserted,
    endpoint_count: endpoints.length,
    languages,
    cost_usd: Number(totalCostUsd.toFixed(6)),
    errors,
  })
}
