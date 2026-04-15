'use client'

import { useMemo, useState } from 'react'
import {
  SITES, SITE_LABELS, SEVERITY_LABELS, STATUS_LABELS, CATEGORY_LABELS,
  type SecurityItem, type SecuritySite, type SecuritySeverity, type SecurityStatus,
} from '@/lib/security/scores'

const SEVS: SecuritySeverity[] = ['critical', 'high', 'medium', 'low', 'info']
const STATUSES: SecurityStatus[] = ['open', 'in_progress', 'done', 'wontfix', 'verified']

const sevColor: Record<SecuritySeverity, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#eab308',
  low: '#60a5fa',
  info: '#9ca3af',
}

export default function TodoBoard({ initialItems }: { initialItems: SecurityItem[] }) {
  const [items, setItems] = useState<SecurityItem[]>(initialItems)
  const [statusFilter, setStatusFilter] = useState<SecurityStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<SecuritySeverity | 'all'>('all')
  const [siteFilter, setSiteFilter] = useState<SecuritySite | 'all'>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter !== 'all' && it.status !== statusFilter) return false
      if (severityFilter !== 'all' && it.severity !== severityFilter) return false
      if (siteFilter !== 'all' && it.site !== siteFilter) return false
      return true
    }).sort((a, b) => {
      const sw = SEVS.indexOf(a.severity) - SEVS.indexOf(b.severity)
      if (sw !== 0) return sw
      return b.detected_at.localeCompare(a.detected_at)
    })
  }, [items, statusFilter, severityFilter, siteFilter])

  async function updateStatus(id: string, status: SecurityStatus) {
    setBusyId(id); setErr(null)
    try {
      const res = await fetch(`/api/admin/security/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json() as SecurityItem
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Select label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as SecurityStatus | 'all')}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
        <Select label="Severity" value={severityFilter} onChange={(v) => setSeverityFilter(v as SecuritySeverity | 'all')}>
          <option value="all">All severities</option>
          {SEVS.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
        </Select>
        <Select label="Site" value={siteFilter} onChange={(v) => setSiteFilter(v as SecuritySite | 'all')}>
          <option value="all">All sites</option>
          {SITES.map((s) => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
        </Select>
        <div style={{ marginLeft: 'auto', alignSelf: 'center', color: '#9aa', fontSize: 13 }}>
          {filtered.length} / {items.length}
        </div>
      </div>

      {err && <div style={{ padding: 8, background: '#4a1f1f', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>Erreur: {err}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((it) => (
          <div key={it.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ ...badge, background: sevColor[it.severity], color: '#0b0f19' }}>
                    {SEVERITY_LABELS[it.severity]}
                  </span>
                  <span style={{ ...badge, background: '#1f2937' }}>{SITE_LABELS[it.site]}</span>
                  <span style={{ ...badge, background: '#1f2937' }}>{CATEGORY_LABELS[it.category]}</span>
                  <span style={{ ...badge, background: it.status === 'open' ? '#7f1d1d' : it.status === 'in_progress' ? '#7c4a03' : '#14532d' }}>
                    {STATUS_LABELS[it.status]}
                  </span>
                  {it.owner && <span style={{ ...badge, background: '#1e3a8a' }}>👤 {it.owner}</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{it.title}</div>
                {it.description && (
                  <div style={{ fontSize: 13, color: '#c9d1d9', marginTop: 4 }}>{it.description}</div>
                )}
                {it.remediation && (
                  <div style={{ fontSize: 12, color: '#9aa', marginTop: 4 }}>
                    <strong>Remediation:</strong> {it.remediation}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
                <button style={btn} disabled={busyId === it.id || it.status === 'in_progress'} onClick={() => updateStatus(it.id, 'in_progress')}>
                  🛠 In progress
                </button>
                <button style={btn} disabled={busyId === it.id || it.status === 'done'} onClick={() => updateStatus(it.id, 'done')}>
                  ✅ Done
                </button>
                <button style={btn} disabled={busyId === it.id || it.status === 'wontfix'} onClick={() => updateStatus(it.id, 'wontfix')}>
                  ⏸ Won&apos;t fix
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: 14, padding: 20, textAlign: 'center' }}>
            Aucun item ne correspond aux filtres.
          </div>
        )}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9aa' }}>
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: '#0f172a', color: '#e6e6e6', border: '1px solid #2a2f3a',
          borderRadius: 6, padding: '4px 8px', fontSize: 13,
        }}
      >
        {children}
      </select>
    </label>
  )
}

const card: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #2a2f3a',
  borderRadius: 10,
  padding: 12,
}

const badge: React.CSSProperties = {
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 10,
  color: '#e6e6e6',
  fontWeight: 500,
}

const btn: React.CSSProperties = {
  background: '#1f2937',
  color: '#e6e6e6',
  border: '1px solid #2a2f3a',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12,
  cursor: 'pointer',
}
