'use client'

import { useEffect, useState, useMemo } from 'react'

type GapResponse = {
  ok: boolean
  fleet?: { total_workers: number; active_workers: number; current_capacity_per_day: number }
  gap?: {
    days_remaining: number; required_per_day: number; deficit_per_day: number;
    gap_accounts: number; monthly_cost_usd: number; hit_possible_without_scale: boolean
  }
  revenue?: null | {
    additional_leads: number; additional_clients: number;
    additional_mrr_eur: number; roi_ratio: number
  }
  error?: string
}

type Props = {
  target_output: number
  target_date: string           // YYYY-MM-DD
  capability: string            // 'scout' | 'content' | …
  project?: string              // 'ftg' | 'ofa' | …
  label?: string                // ex: "Scout 500k leads before Sept 30"
  compact?: boolean
}

/**
 * Fleet gap estimator card.
 * Takes a target volume + date + capability, fetches current fleet capacity, computes effort gap
 * in "additional accounts needed", and shows revenue equivalence if `project` is supplied.
 * CTA : "Provisionner N comptes" → lien pré-rempli vers /admin/cc-fleet.
 */
export default function FleetGapCard({ target_output, target_date, capability, project, label, compact }: Props) {
  const [data, setData] = useState<GapResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/cc-fleet/gap-estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_output, target_date, capability, project }),
    })
      .then(r => r.json())
      .then(j => { if (!cancelled) setData(j) })
      .catch(e => { if (!cancelled) setData({ ok: false, error: (e as Error).message }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [target_output, target_date, capability, project])

  const ctaHref = useMemo(() => {
    const n = data?.gap?.gap_accounts ?? 0
    const params = new URLSearchParams({
      count: String(n),
      caps: capability,
      reason: `simulator:${label ?? capability}:target=${target_output}:by=${target_date}`,
    })
    return `/admin/cc-fleet?${params.toString()}`
  }, [data, capability, label, target_output, target_date])

  if (loading) {
    return <div style={{ ...box, color: '#9aa', fontSize: 13 }}>Calcul fleet gap…</div>
  }
  if (!data?.ok) {
    return <div style={{ ...box, background: '#4a1f1f', color: '#fca5a5', fontSize: 13 }}>
      Gap estimation failed: {data?.error ?? 'unknown'}
    </div>
  }
  const { fleet, gap, revenue } = data

  const statusColor =
    gap!.hit_possible_without_scale ? '#4ade80'
    : gap!.gap_accounts <= 2 ? '#f59e0b'
    : '#ef4444'
  const statusEmoji =
    gap!.hit_possible_without_scale ? '✓'
    : gap!.gap_accounts <= 2 ? '⚠'
    : '🚨'
  const statusText =
    gap!.hit_possible_without_scale
      ? 'Objectif atteignable avec la fleet actuelle'
      : `Objectif manquera sans +${gap!.gap_accounts} compte${gap!.gap_accounts > 1 ? 's' : ''}`

  return (
    <div style={{ ...box, borderLeft: `4px solid ${statusColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: compact ? 6 : 10 }}>
        <div style={{ fontSize: compact ? 20 : 24 }}>{statusEmoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: statusColor }}>
            {statusText}
          </div>
          {label && (
            <div style={{ fontSize: 11, color: '#9aa', marginTop: 2 }}>{label}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: compact ? 8 : 12 }}>
        <Kpi label="Jours restants"          value={`${gap!.days_remaining}j`} />
        <Kpi label="Besoin / jour"           value={gap!.required_per_day.toLocaleString()} />
        <Kpi label="Fleet actuelle / jour"   value={fleet!.current_capacity_per_day.toLocaleString()} />
        <Kpi label="Déficit / jour" value={gap!.deficit_per_day > 0 ? `+${gap!.deficit_per_day.toLocaleString()}` : 'OK'} tone={gap!.deficit_per_day > 0 ? 'warn' : 'ok'} />
      </div>

      {!gap!.hit_possible_without_scale && (
        <>
          <div style={{
            padding: 10, background: '#040d1c', borderRadius: 6, marginBottom: 10,
            display: 'grid', gridTemplateColumns: revenue ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10,
          }}>
            <Kpi label="Comptes à ajouter" value={`+${gap!.gap_accounts}`} tone="warn" big />
            <Kpi label="Coût mensuel"      value={`$${gap!.monthly_cost_usd}/mo`} />
            {revenue && (
              <Kpi label="Revenue unlock (si hit)" value={`+€${revenue.additional_mrr_eur.toLocaleString()} MRR`} tone="ok" big />
            )}
          </div>

          {revenue && (
            <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 10 }}>
              {gap!.gap_accounts} compte{gap!.gap_accounts > 1 ? 's' : ''} × {gap!.days_remaining}j =
              ~{revenue.additional_leads.toLocaleString()} leads contactés →
              ~{revenue.additional_clients.toLocaleString()} clients →
              <strong style={{ color: '#4ade80' }}> +€{revenue.additional_mrr_eur.toLocaleString()} MRR/mo</strong>
              {' · '}ROI : <strong>{revenue.roi_ratio}×</strong> (MRR ÷ coût fleet)
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                Taux de conversion = benchmark marché, à calibrer avec funnel réel projet
              </div>
            </div>
          )}

          <a href={ctaHref} style={cta}>
            🔀 Provisionner {gap!.gap_accounts} compte{gap!.gap_accounts > 1 ? 's' : ''} via CC Fleet →
          </a>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, tone = 'default', big = false }: { label: string; value: string; tone?: 'default' | 'ok' | 'warn'; big?: boolean }) {
  const color = tone === 'ok' ? '#4ade80' : tone === 'warn' ? '#f59e0b' : '#C9A84C'
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9aa', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: big ? 20 : 15, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

const box: React.CSSProperties = {
  padding: 14, background: '#071425', border: '1px solid #1e2a3d', borderRadius: 8,
}

const cta: React.CSSProperties = {
  display: 'inline-block', padding: '10px 18px', background: '#C9A84C', color: '#040d1c',
  borderRadius: 6, fontWeight: 700, textDecoration: 'none', fontSize: 14,
}
