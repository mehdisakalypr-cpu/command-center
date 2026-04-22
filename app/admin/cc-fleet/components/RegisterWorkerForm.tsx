'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const ALL_CAPS = ['ui', 'feature', 'architecture', 'review', 'debug', 'fix', 'refactor', 'scout', 'content', 'cron'] as const
const DEFAULT_CAPS = ['scout', 'content', 'refactor', 'cron', 'fix']

type Result = {
  ok: boolean
  inserted?: number
  ids?: string[]
  next_step?: string
  error?: string
}

export default function RegisterWorkerForm({ nextIndex }: { nextIndex: number }) {
  const sp = useSearchParams()
  const [count, setCount] = useState(1)
  const [caps, setCaps] = useState<string[]>(DEFAULT_CAPS)
  const [night, setNight] = useState(true)
  const [maxConc, setMaxConc] = useState(2)
  const [quotaPlan, setQuotaPlan] = useState('max_20x')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  // Pre-fill from URL params (lien depuis simulator / infra gap card)
  useEffect(() => {
    const qCount = Number(sp?.get('count') ?? 0)
    if (qCount > 0) setCount(Math.max(1, Math.min(10, qCount)))
    const qCaps = sp?.get('caps')
    if (qCaps) {
      const parsed = qCaps.split(',').filter(c => (ALL_CAPS as readonly string[]).includes(c))
      if (parsed.length > 0) setCaps(parsed)
    }
    const qReason = sp?.get('reason')
    if (qReason) setNotes(`Déclenché depuis : ${qReason}`)
  }, [sp])

  function toggleCap(c: string) {
    setCaps(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function submit() {
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/cc-fleet/provisioning-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count, capabilities: caps, kind: 'autonomous',
          night_eligible: night, max_concurrent_tickets: maxConc,
          quota_plan: quotaPlan, notes,
        }),
      })
      const json = await res.json() as Result
      setResult(json)
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.ok) {
    return (
      <div style={{ padding: 16, background: '#0a2c1a', border: '1px solid #4ade8044', borderRadius: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', marginBottom: 6 }}>
          ✓ {result.inserted} worker{(result.inserted ?? 0) > 1 ? 's' : ''} en attente de provisioning
        </div>
        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 10 }}>
          Étape suivante : ouvre Claude Code en terminal et lance la commande ci-dessous.
          Claude lira les demandes en attente et te demandera les clés d&apos;auth une à une.
        </div>
        <div style={{
          padding: 10, background: '#040d1c', borderRadius: 6, fontFamily: 'monospace',
          fontSize: 13, color: '#C9A84C', border: '1px solid #1e2a3d',
        }}>
          /provision-cc-fleet
        </div>
        <div style={{ fontSize: 11, color: '#9aa', marginTop: 8 }}>
          IDs créés : {result.ids?.slice(0, 3).join(', ')}{(result.ids?.length ?? 0) > 3 ? '…' : ''}
        </div>
        <button onClick={() => setResult(null)} style={{ ...btn, marginTop: 10, background: '#1e2a3d' }}>
          Ajouter d&apos;autres
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: '#071425', border: '1px solid #1e2a3d', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <Field label="Nombre de comptes à provisionner">
          <input type="number" min={1} max={10} value={count}
            onChange={e => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            style={input} />
          <div style={hint}>Prochain ID auto-assigné : worker-{nextIndex}…{nextIndex + count - 1}</div>
        </Field>
        <Field label="Plan quota">
          <select value={quotaPlan} onChange={e => setQuotaPlan(e.target.value)} style={input}>
            <option value="max_5x">Max 5×</option>
            <option value="max_20x">Max 20× (recommandé)</option>
            <option value="team">Team Plan</option>
            <option value="api_direct">API direct (pas de plan)</option>
          </select>
        </Field>
      </div>

      <Field label="Capabilities (tags de routing)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_CAPS.map(c => (
            <label key={c} style={{ ...chipLabel, background: caps.includes(c) ? '#C9A84C22' : '#1e2a3d', borderColor: caps.includes(c) ? '#C9A84C' : '#2a3a4f' }}>
              <input type="checkbox" checked={caps.includes(c)} onChange={() => toggleCap(c)} style={{ marginRight: 6 }} />
              {c}
            </label>
          ))}
        </div>
        <div style={hint}>Un ticket ne peut être claim que si le worker a toutes les required_caps du ticket.</div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <Field label="Max concurrent tickets">
          <input type="number" min={1} max={5} value={maxConc}
            onChange={e => setMaxConc(Math.max(1, Math.min(5, Number(e.target.value) || 2)))}
            style={input} />
        </Field>
        <Field label="Night shift (00h-08h France)">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, color: '#cbd5e1', fontSize: 13 }}>
            <input type="checkbox" checked={night} onChange={e => setNight(e.target.checked)} />
            Éligible au cycle nuit (scout/content/refactor batch)
          </label>
        </Field>
      </div>

      <Field label="Notes (optionnel)">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="ex: compte acheté 2026-04-22 sous email mehdi+worker2@…"
          style={{ ...input, resize: 'vertical', minHeight: 40 }} />
      </Field>

      {result?.error && (
        <div style={{ padding: 10, background: '#4a1f1f', borderRadius: 6, color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>
          Erreur : {result.error}
        </div>
      )}

      <button onClick={submit} disabled={submitting || caps.length === 0} style={{
        ...btn,
        background: submitting ? '#6b7280' : '#C9A84C',
        color: submitting ? '#9aa' : '#040d1c',
        cursor: submitting || caps.length === 0 ? 'not-allowed' : 'pointer',
        opacity: caps.length === 0 ? 0.5 : 1,
      }}>
        {submitting ? 'Création…' : `Enregistrer ${count} demande${count > 1 ? 's' : ''} de provisioning`}
      </button>
      <div style={{ fontSize: 11, color: '#9aa', marginTop: 8 }}>
        Après soumission, ouvre Claude Code en terminal et tape <code style={{ background: '#040d1c', padding: '1px 6px', borderRadius: 4 }}>/provision-cc-fleet</code> — il collectera les clés d&apos;auth et provisionnera les workers.
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: '#9aa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      {children}
    </div>
  )
}

const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#040d1c', border: '1px solid #1e2a3d',
  borderRadius: 6, color: '#e6e6e6', fontSize: 13, fontFamily: 'inherit',
}
const btn: React.CSSProperties = {
  padding: '10px 18px', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700,
  cursor: 'pointer',
}
const chipLabel: React.CSSProperties = {
  fontSize: 12, padding: '4px 10px', borderRadius: 12, border: '1px solid',
  color: '#cbd5e1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
}
const hint: React.CSSProperties = { fontSize: 11, color: '#6b7280', marginTop: 4 }
