import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AlertRow = {
  id: string
  code: string
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string | null
  details: Record<string, unknown> | null
  channels: string[] | null
  delivered: { channel: string; ok: boolean; error?: string }[] | null
  source: string | null
  created_at: string
}

const LEVEL_COLOR: Record<string, string> = {
  LOW: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30',
  HIGH: 'bg-orange-500/20 text-orange-200 border-orange-400/30',
  CRITICAL: 'bg-red-500/20 text-red-200 border-red-400/30',
}

export default async function AlertsLogPage() {
  const ok = await isAdmin()
  if (!ok) redirect('/login?next=/admin/alerts-log')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  let rows: AlertRow[] = []
  let error: string | null = null
  try {
    const { data, error: err } = await supabase
      .from('alerts_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (err) error = err.message
    rows = (data ?? []) as AlertRow[]
  } catch (e: any) {
    error = e?.message ?? 'unknown'
  }

  const summary = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.level] = (acc[r.level] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Alerts log</h1>
          <p className="text-sm text-slate-400 mt-1">Historique des alertes dispatched (OFA + CC) — debounced via `alerts_log`.</p>
        </div>
        <div className="flex gap-2">
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(l => (
            <span key={l} className={`px-2 py-1 rounded text-xs border ${LEVEL_COLOR[l]}`}>{l}: {summary[l] || 0}</span>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-400/30 text-sm text-red-200">
          Erreur chargement: {error}. Vérifie que la migration `alerts_log` est appliquée.
        </div>
      )}

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-3">Quand</th>
              <th className="p-3">Niveau</th>
              <th className="p-3">Code</th>
              <th className="p-3">Source</th>
              <th className="p-3">Channels</th>
              <th className="p-3">Delivered</th>
              <th className="p-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 align-top">
                <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString('fr-FR')}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded border text-xs ${LEVEL_COLOR[r.level] || ''}`}>{r.level}</span>
                </td>
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3 text-slate-400 text-xs">{r.source || '-'}</td>
                <td className="p-3 text-xs">{(r.channels || []).join(', ') || '-'}</td>
                <td className="p-3 text-xs">
                  {(r.delivered || []).map((d, i) => (
                    <span key={i} className={`mr-1 ${d.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {d.channel}:{d.ok ? 'OK' : 'FAIL'}
                    </span>
                  ))}
                </td>
                <td className="p-3 max-w-md text-slate-200">
                  <pre className="whitespace-pre-wrap text-xs">{r.message || '-'}</pre>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !error && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Aucune alerte enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Debounce: 1h par défaut (surchargeable via ALERTS_CONFIG). Event source = service (ofa, cc, cron).
      </div>
    </div>
  )
}
