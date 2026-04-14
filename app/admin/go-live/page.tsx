'use client'

import { useEffect, useState } from 'react'

type Milestone = {
  id: string
  label: string
  description: string | null
  status: 'not_started' | 'in_progress' | 'blocked' | 'done'
  eta_days: number | null
  started_at: string | null
  done_at: string | null
  template_path: string | null
  external_link: string | null
  contact_info: string | null
  blocker_for: string[]
  notes: string | null
}

const STATUS_META = {
  not_started: { label: 'À démarrer',   color: '#94a3b8', bg: 'rgba(148,163,184,.15)' },
  in_progress: { label: 'En cours',     color: '#F59E0B', bg: 'rgba(245,158,11,.15)' },
  blocked:     { label: 'Bloqué',       color: '#EF4444', bg: 'rgba(239,68,68,.15)' },
  done:        { label: 'Fait ✓',        color: '#10B981', bg: 'rgba(16,185,129,.15)' },
} as const

export default function GoLivePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [degraded, setDegraded] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const load = async () => {
    const r = await fetch('/api/admin/go-live', { cache: 'no-store' })
    const d = await r.json()
    setMilestones(d.milestones ?? [])
    setDegraded(!!d.degraded)
  }

  useEffect(() => { load() }, [])

  const update = async (id: string, status: Milestone['status']) => {
    setSaving(id)
    await fetch('/api/admin/go-live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    await load()
    setSaving(null)
  }

  const done = milestones.filter(m => m.status === 'done').length
  const total = milestones.length
  const allDone = total > 0 && done === total

  return (
    <div className="min-h-screen bg-[#07090F] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="text-[11px] tracking-[.15em] text-gray-500 uppercase">🏁 Go-live</div>
          <h1 className="text-3xl font-bold mt-1">4 actions pour démarrer la course</h1>
          <p className="text-sm text-gray-400 mt-3 max-w-2xl">
            Tant que ces 4 jalons ne sont pas lancés, le système reste en pré-prod et aucun euro réel ne circule.
            Champion = a gagné la course, pas le meilleur temps à l&apos;entraînement.
          </p>
          {degraded && (
            <div className="mt-3 text-xs text-amber-400 p-2 border border-amber-500/30 rounded bg-amber-500/5">
              ⚠ Table <code>go_live_milestones</code> pas encore en prod · applique la migration <code>20260414190000_go_live_milestones.sql</code> pour persister les statuts.
            </div>
          )}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#C9A84C] to-[#10B981] transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            <div className="text-sm font-mono">
              <span className="text-[#C9A84C] font-bold">{done}</span>
              <span className="text-gray-500"> / {total}</span>
            </div>
          </div>
          {allDone && (
            <div className="mt-4 p-4 border border-emerald-500/40 bg-emerald-500/10 rounded-xl text-emerald-300 font-bold text-center">
              🏆 Les 4 actions sont lancées. La course démarre.
            </div>
          )}
        </header>

        <div className="space-y-4">
          {milestones.map((m, i) => {
            const meta = STATUS_META[m.status]
            return (
              <div key={m.id} className="border border-white/10 rounded-xl overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-gray-500 font-mono">#{i + 1}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ color: meta.color, background: meta.bg }}>
                          {meta.label}
                        </span>
                        {m.eta_days !== null && m.eta_days > 0 && (
                          <span className="text-[10px] text-gray-500">ETA {m.eta_days}j</span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold">{m.label}</h2>
                      {m.description && <p className="text-sm text-gray-400 mt-1">{m.description}</p>}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {m.external_link && (
                      <a href={m.external_link} target="_blank" rel="noopener noreferrer" className="p-3 border border-white/10 rounded-lg hover:border-[#C9A84C]/40">
                        <div className="text-[10px] tracking-wider text-gray-500 uppercase">Action</div>
                        <div className="text-[#C9A84C] truncate mt-1">↗ {new URL(m.external_link).hostname}</div>
                      </a>
                    )}
                    {m.template_path && (
                      <div className="p-3 border border-white/10 rounded-lg">
                        <div className="text-[10px] tracking-wider text-gray-500 uppercase">Template</div>
                        <div className="font-mono text-[10px] text-gray-300 truncate mt-1" title={m.template_path}>{m.template_path}</div>
                      </div>
                    )}
                    {m.contact_info && (
                      <div className="p-3 border border-white/10 rounded-lg">
                        <div className="text-[10px] tracking-wider text-gray-500 uppercase">Contact</div>
                        <div className="text-gray-300 mt-1">{m.contact_info}</div>
                      </div>
                    )}
                  </div>

                  {m.blocker_for && m.blocker_for.length > 0 && (
                    <div className="mt-3 text-[11px] text-gray-500">
                      Bloque : {m.blocker_for.map(b => <code key={b} className="bg-white/5 px-1 py-0.5 rounded mr-1">{b}</code>)}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['not_started','in_progress','blocked','done'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => update(m.id, s)}
                        disabled={saving === m.id || degraded}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${m.status === s ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]' : 'border-white/10 text-gray-400 hover:border-white/20'} ${degraded ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>

                  {m.started_at && (
                    <div className="mt-3 text-[10px] text-gray-500">
                      Démarré {new Date(m.started_at).toLocaleDateString('fr-FR')}
                      {m.done_at && ` · Terminé ${new Date(m.done_at).toLocaleDateString('fr-FR')}`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 p-4 border border-white/10 rounded-xl text-xs text-gray-400">
          <div className="font-semibold text-white mb-2">Pourquoi ces 4 et pas d&apos;autres</div>
          <ul className="space-y-1 list-disc ml-5">
            <li>Sans <strong>LLC</strong> : pas de compte bancaire, pas de Stripe live, pas de facturation</li>
            <li>Sans <strong>Operating Agreement</strong> : Mercury refuse l&apos;ouverture de compte</li>
            <li>Sans <strong>EIN</strong> (via SS-4) : Stripe retient 30% (backup withholding), Mercury impossible</li>
            <li>Sans <strong>CPA engagé</strong> : Form 5472 raté = $25 000 de pénalité IRS</li>
          </ul>
          <p className="mt-3 text-gray-500">
            Master checklist complet : <code>/root/llc-setup/production-launch/README.md</code> — cette page isole uniquement les actions humaines critiques.
          </p>
        </div>
      </div>
    </div>
  )
}
