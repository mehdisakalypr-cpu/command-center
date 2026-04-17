import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Lance N tirages round-robin sur `api_keys_registry` (provider=gemini,
 * status=active) pour vérifier que la rotation fonctionne. On ne consomme
 * AUCUN crédit Gemini ici — on simule juste la sélection côté registre.
 *
 * Pour chaque tirage :
 *   1. Trie par last_used_at ASC (null prioritaire)
 *   2. Update last_used_at = now() sur la ligne choisie
 *   3. Retourne l'alias pour l'UI
 */
const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const n = Math.max(1, Math.min(20, Number(body.n ?? 5)))
  const sb = db()

  const picks: { step: number; alias: string; env_var_name: string; project: string }[] = []

  for (let i = 1; i <= n; i++) {
    const { data, error } = await sb
      .from('api_keys_registry')
      .select('id, project, env_var_name, last_used_at')
      .eq('provider', 'gemini')
      .eq('status', 'active')
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) {
      return NextResponse.json({
        error: 'Aucune clé Gemini active dans le registre. Crée des comptes puis relance le sync.',
        picks,
      }, { status: 409 })
    }
    const row = data[0]
    const nowIso = new Date().toISOString()
    await sb.from('api_keys_registry').update({ last_used_at: nowIso }).eq('id', row.id)
    picks.push({
      step: i,
      alias: `${row.project}:${row.env_var_name}`,
      env_var_name: row.env_var_name,
      project: row.project,
    })
  }

  // Distribution (combien de fois chaque alias a été tiré)
  const distribution: Record<string, number> = {}
  for (const p of picks) distribution[p.alias] = (distribution[p.alias] ?? 0) + 1

  return NextResponse.json({ ok: true, n, picks, distribution })
}

export async function GET() {
  const sb = db()
  const { data, error } = await sb
    .from('api_keys_registry')
    .select('id, project, env_var_name, status, last_used_at')
    .eq('provider', 'gemini')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = data ?? []
  const active = rows.filter(r => r.status === 'active').length
  const total = rows.length
  return NextResponse.json({ active, total, rows })
}
