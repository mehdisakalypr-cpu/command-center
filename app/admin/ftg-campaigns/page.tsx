import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import NewCampaignForm from './NewCampaignForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'FTG Campaigns · Command Center' }

const C = {
  bg: '#040D1C', card: '#0A1A2E', gold: '#C9A84C', text: '#E8E0D0',
  muted: '#9BA8B8', dim: '#5A6A7A', green: '#10B981', red: '#EF4444',
  blue: '#3B82F6',
}

type Campaign = {
  id: string; name: string; channel: string; segment: string | null
  status: string; provider: string; budget_eur: number; spent_eur: number
  metrics: { sent?: number; opened?: number; replied?: number; demos?: number; paid?: number }
  created_at: string
}

type LeadStats = { total: number; scored: number; priority: number; by_segment: Record<string, number> }

async function load() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [campaignsRes, total, scored, priority, segRows] = await Promise.all([
    db.from('ftg_campaigns').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('ftg_leads').select('*', { count: 'exact', head: true }),
    db.from('ftg_leads').select('*', { count: 'exact', head: true }).gt('gap_match_score', 0),
    db.from('ftg_leads').select('*', { count: 'exact', head: true }).eq('is_priority', true),
    db.from('ftg_leads').select('segment').not('segment', 'is', null),
  ])

  const by_segment: Record<string, number> = {}
  for (const r of (segRows.data ?? []) as { segment: string }[]) {
    by_segment[r.segment] = (by_segment[r.segment] ?? 0) + 1
  }

  return {
    campaigns: (campaignsRes.data ?? []) as Campaign[],
    leads: {
      total: total.count ?? 0,
      scored: scored.count ?? 0,
      priority: priority.count ?? 0,
      by_segment,
    } as LeadStats,
  }
}

const STATUS_COLOR: Record<string, string> = {
  draft: C.muted, warming: '#F59E0B', active: C.green, paused: C.dim, done: C.blue, archived: C.dim,
}
const PROVIDER_EMOJI: Record<string, string> = {
  instantly: '📧', apollo: '🚀', phantombuster: '👻', custom: '🛠️',
}

export default async function FtgCampaignsPage() {
  const { campaigns, leads } = await load()

  return (
    <main style={{ background: C.bg, color: C.text, minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, color: C.gold, marginBottom: '0.5rem' }}>🚀 FTG Campaigns</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: '2rem' }}>
          Orchestrator outbound FTG — segments × templates × providers. Pousse vers Instantly/Apollo/PhantomBuster
          selon configuration. Les leads viennent de <code>ftg_leads</code> (scorés par Kushina/gap-match).
        </p>

        {/* Lead pool snapshot */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 18, color: C.gold, marginBottom: '1rem' }}>Lead pool</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatCard label="Leads total" value={leads.total.toLocaleString()} accent={C.gold} />
            <StatCard label="Scorés" value={leads.scored.toLocaleString()} accent={C.blue} />
            <StatCard label="Priority (score ≥ 70)" value={leads.priority.toLocaleString()} accent={C.green} />
            {Object.entries(leads.by_segment).map(([seg, n]) => (
              <StatCard key={seg} label={seg.replace('_', ' ')} value={n.toLocaleString()} accent={C.muted} />
            ))}
          </div>
        </section>

        {/* New campaign form */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 18, color: C.gold, marginBottom: '1rem' }}>+ Nouvelle campagne</h2>
          <NewCampaignForm />
        </section>

        {/* Campaign list */}
        <section>
          <h2 style={{ fontSize: 18, color: C.gold, marginBottom: '1rem' }}>Campagnes ({campaigns.length})</h2>
          {campaigns.length === 0 ? (
            <div style={{ background: C.card, border: `1px dashed ${C.dim}`, borderRadius: 8, padding: '2rem', textAlign: 'center', color: C.muted }}>
              Aucune campagne encore. Crée la première ci-dessus.
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid rgba(201,168,76,.1)`, borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(201,168,76,.05)', color: C.muted, textAlign: 'left' }}>
                    <th style={th}>Name</th>
                    <th style={th}>Channel</th>
                    <th style={th}>Segment</th>
                    <th style={th}>Provider</th>
                    <th style={th}>Status</th>
                    <th style={th}>Sent</th>
                    <th style={th}>Replies</th>
                    <th style={th}>Demos</th>
                    <th style={th}>Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} style={{ borderTop: `1px solid rgba(201,168,76,.08)` }}>
                      <td style={td}>{c.name}</td>
                      <td style={td}>{c.channel}</td>
                      <td style={td}>{c.segment ?? '—'}</td>
                      <td style={td}>{PROVIDER_EMOJI[c.provider] ?? ''} {c.provider}</td>
                      <td style={{ ...td, color: STATUS_COLOR[c.status] ?? C.muted, fontWeight: 600 }}>{c.status}</td>
                      <td style={td}>{c.metrics?.sent ?? 0}</td>
                      <td style={td}>{c.metrics?.replied ?? 0}</td>
                      <td style={td}>{c.metrics?.demos ?? 0}</td>
                      <td style={td}>€{c.budget_eur?.toFixed(0) ?? 0} / {c.spent_eur?.toFixed(0) ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div style={{ marginTop: '2.5rem', fontSize: 12, color: C.dim }}>
          Adapters : Apollo (ingest leads) · Hunter (email verify) · Instantly (cold email send) · PhantomBuster (LinkedIn).
          Chaque adapter activé quand son <code>*_API_KEY</code> est set dans FTG env.
        </div>
      </div>
    </main>
  )
}

const th: React.CSSProperties = { padding: '0.75rem 1rem', fontWeight: 500 }
const td: React.CSSProperties = { padding: '0.6rem 1rem', color: C.text }

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid rgba(201,168,76,.15)`, borderRadius: 8, padding: '1rem' }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  )
}
