import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { parseSpec } from '@/lib/api-doc/parsers'
import { computeChangelog } from '@/lib/api-doc/changelog'
import type { ApiType, ParsedAST } from '@/lib/api-doc/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const SPEC_FILE_PATTERNS = [
  /openapi\.(json|ya?ml)$/i,
  /swagger\.(json|ya?ml)$/i,
  /\.openapi\.(json|ya?ml)$/i,
  /api\.graphql$/i,
  /schema\.graphql$/i,
  /\.proto$/i,
]

function verifySignature(body: string, sig: string | null, secret: string): boolean {
  if (!sig || !sig.startsWith('sha256=')) return false
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function detectApiType(filename: string): ApiType | null {
  if (/openapi|swagger/i.test(filename)) return 'openapi'
  if (/\.graphql$/i.test(filename)) return 'graphql'
  if (/\.proto$/i.test(filename)) return 'grpc'
  return null
}

async function fetchRawFile(repo: string, ref: string, path: string, token: string | null): Promise<string | null> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`
  const headers: Record<string, string> = {
    accept: 'application/vnd.github.v3.raw',
    'user-agent': 'cc-api-doc-webhook',
  }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) return null
  return res.text()
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'GITHUB_WEBHOOK_SECRET non configuré' }, { status: 500 })
  }

  const rawBody = await req.text()
  const sig = req.headers.get('x-hub-signature-256')
  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 })
  }

  const event = req.headers.get('x-github-event')
  if (event !== 'push') {
    return NextResponse.json({ ok: true, skipped: `event=${event}` })
  }

  let payload: {
    ref?: string
    repository?: { full_name?: string }
    commits?: Array<{ added?: string[]; modified?: string[] }>
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const repo = payload.repository?.full_name
  const ref = (payload.ref ?? '').replace(/^refs\/heads\//, '')
  if (!repo || !ref) {
    return NextResponse.json({ error: 'repo ou ref manquant' }, { status: 400 })
  }

  const changedFiles = new Set<string>()
  for (const c of payload.commits ?? []) {
    for (const f of [...(c.added ?? []), ...(c.modified ?? [])]) changedFiles.add(f)
  }

  const specFiles = [...changedFiles].filter((f) =>
    SPEC_FILE_PATTERNS.some((re) => re.test(f)),
  )
  if (specFiles.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'aucun fichier spec touché' })
  }

  const admin = createSupabaseAdmin()
  const { data: projects } = await admin
    .from('api_doc_projects')
    .select('id, api_type, repo_url')
    .ilike('repo_url', `%${repo}%`)
    .limit(5)

  if (!projects || projects.length === 0) {
    return NextResponse.json({ ok: true, skipped: `projet inconnu pour ${repo}` })
  }

  const token = process.env.GITHUB_APP_TOKEN ?? process.env.GITHUB_TOKEN ?? null
  const results: Array<{ project_id: string; file: string; ok: boolean; breaking_count?: number; error?: string }> = []

  for (const project of projects) {
    const proj = project as { id: string; api_type: ApiType; repo_url: string | null }
    for (const file of specFiles) {
      const detectedType = detectApiType(file)
      if (detectedType && detectedType !== proj.api_type) continue

      try {
        const raw = await fetchRawFile(repo, ref, file, token)
        if (!raw) {
          results.push({ project_id: proj.id, file, ok: false, error: 'fetch raw failed' })
          continue
        }

        const parsed = await parseSpec(raw, proj.api_type)
        const version = parsed.info.version || `auto-${Date.now()}`

        const { data: prevSpecRow } = await admin
          .from('api_doc_specs')
          .select('parsed_ast, version')
          .eq('project_id', proj.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const prev = (prevSpecRow?.parsed_ast ?? null) as ParsedAST | null
        const diff = computeChangelog(prev, parsed, prevSpecRow?.version ?? null, version)

        let specContentJson: unknown = raw
        try {
          specContentJson = JSON.parse(raw)
        } catch {
          specContentJson = { raw }
        }

        await admin.from('api_doc_specs').upsert(
          {
            project_id: proj.id,
            version,
            spec_content: specContentJson,
            parsed_ast: parsed,
            changelog_diff: diff,
          },
          { onConflict: 'project_id,version' },
        )

        await admin
          .from('api_doc_projects')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', proj.id)

        results.push({
          project_id: proj.id,
          file,
          ok: true,
          breaking_count: diff.breaking_count,
        })
      } catch (e) {
        results.push({
          project_id: proj.id,
          file,
          ok: false,
          error: (e as Error).message.slice(0, 200),
        })
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
