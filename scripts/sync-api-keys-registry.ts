/**
 * sync-api-keys-registry — scans every project's .env.local for recognised
 * API-key patterns and upserts one row per key into `api_keys_registry`.
 *
 * Minato / simulator scale-readiness reads this table to tell the user which
 * agents have enough active credentials to actually scale. Run on the VPS:
 *
 *   npx tsx scripts/sync-api-keys-registry.ts
 *
 * Safe to run repeatedly — idempotent upsert on (provider, key_hash, project).
 */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

function loadEnv() {
  const p = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

type Pattern = { provider: string; regex: RegExp; dailyQuota: number | null; perMinQuota: number | null }

// Patterns recognised as scaling-relevant API keys. Auth tokens, DB urls,
// Supabase service roles are deliberately excluded — they're infrastructure,
// not scale levers.
const PATTERNS: Pattern[] = [
  { provider: 'gemini',      regex: /^(GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|GOOGLE_GENAI_API_KEY)(_\d+)?$/, dailyQuota: 1_500_000, perMinQuota: 15 },
  { provider: 'groq',        regex: /^GROQ_API_KEY(_\d+)?$/,                                     dailyQuota: 14_400,    perMinQuota: 30 },
  { provider: 'cloudflare',  regex: /^CF_API_TOKEN(_\d+)?$/,                                     dailyQuota: 10_000,    perMinQuota: null },
  { provider: 'huggingface', regex: /^(HUGGINGFACE|HF)_API_KEY(_\d+)?$/,                         dailyQuota: 7_200,     perMinQuota: 120 },
  { provider: 'resend',      regex: /^RESEND_API_KEY(_\d+)?$/,                                   dailyQuota: 100,       perMinQuota: null },
  { provider: 'places',      regex: /^(GOOGLE_PLACES|PLACES)_API_KEY(_\d+)?$/,                   dailyQuota: 11_500,    perMinQuota: null },
  { provider: 'serper',      regex: /^SERPER_API_KEY(_\d+)?$/,                                   dailyQuota: 83,        perMinQuota: null },
  { provider: 'mistral',     regex: /^MISTRAL_API_KEY(_\d+)?$/,                                  dailyQuota: 1_000,     perMinQuota: 60 },
  { provider: 'openai',      regex: /^OPENAI_API_KEY(_\d+)?$/,                                   dailyQuota: null,      perMinQuota: null },
  { provider: 'together',    regex: /^TOGETHER_API_KEY(_\d+)?$/,                                 dailyQuota: null,      perMinQuota: 10 },
  { provider: 'fal',         regex: /^FAL_(KEY|API_KEY)(_\d+)?$/,                                dailyQuota: null,      perMinQuota: null },
]

const PROJECTS: { name: string; envPath: string }[] = [
  { name: 'ofa',  envPath: '/var/www/site-factory/.env.local' },
  { name: 'ftg',  envPath: '/var/www/feel-the-gap/.env.local' },
  { name: 'cc',   envPath: '/root/command-center/.env.local' },
]

function readEnvFile(p: string): Record<string, string> {
  if (!fs.existsSync(p)) return {}
  const out: Record<string, string> = {}
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const m = t.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function keyHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

async function main() {
  const sb = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  let totalUpserts = 0
  const seenByProvider: Record<string, number> = {}

  for (const proj of PROJECTS) {
    const env = readEnvFile(proj.envPath)
    console.log(`\n[${proj.name}] reading ${proj.envPath} (${Object.keys(env).length} keys)`)
    for (const [name, val] of Object.entries(env)) {
      if (!val || val.length < 8) continue
      for (const pat of PATTERNS) {
        if (!pat.regex.test(name)) continue
        const row = {
          provider: pat.provider,
          env_var_name: name,
          key_hash: keyHash(val),
          project: proj.name,
          status: 'active',
          daily_quota: pat.dailyQuota,
          per_minute_quota: pat.perMinQuota,
          updated_at: new Date().toISOString(),
        }
        const { error } = await sb.from('api_keys_registry').upsert(row, { onConflict: 'provider,key_hash,project' })
        if (error) {
          console.error(`  ERR ${name} → ${pat.provider}: ${error.message}`)
        } else {
          totalUpserts++
          seenByProvider[pat.provider] = (seenByProvider[pat.provider] ?? 0) + 1
          console.log(`  + ${pat.provider} · ${name} · ${row.key_hash.slice(0, 8)}…`)
        }
        break // a name matches at most one provider
      }
    }
  }

  console.log(`\n=== DONE === ${totalUpserts} keys upserted`)
  for (const [p, n] of Object.entries(seenByProvider)) console.log(`  ${p}: ${n}`)
}

main().catch(e => { console.error(e); process.exit(1) })
