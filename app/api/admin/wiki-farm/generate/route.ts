import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { runGenPipeline } from '@/lib/wiki-farm/pipeline'
import type { WikiLang } from '@/lib/wiki-farm/types'

const ALLOWED_LANGS: WikiLang[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'tr', 'ar']

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const ip = getClientIp(req)
  const rl = await rateLimit({ key: `wiki-farm:generate:${ip}`, limit: 10, windowSec: 3600 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayer plus tard.', retry_after: rl.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  let body: { niche_slug?: string; lang?: string; article_topic?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'body JSON invalide' }, { status: 400 })
  }

  const niche_slug = (body.niche_slug ?? '').trim()
  const lang = (body.lang ?? 'fr') as WikiLang
  if (!niche_slug) return NextResponse.json({ error: 'niche_slug requis' }, { status: 400 })
  if (!ALLOWED_LANGS.includes(lang)) {
    return NextResponse.json({ error: `lang invalide (attendu: ${ALLOWED_LANGS.join(',')})` }, { status: 400 })
  }

  const result = await runGenPipeline({ niche_slug, lang, article_topic: body.article_topic })
  const status = result.ok ? 201 : 422
  return NextResponse.json(result, { status })
}
