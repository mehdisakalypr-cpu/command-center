import { SITE_LABELS, SEVERITY_LABELS, STATUS_LABELS, type SecurityItem } from '@/lib/security/scores'

function fmtDate(s: string | null): string {
  if (!s) return '—'
  try { return new Date(s).toISOString().slice(0, 16).replace('T', ' ') } catch { return s }
}

const sevColor: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#eab308',
  low: '#60a5fa',
  info: '#9ca3af',
}

export default function IncidentTable({ items }: { items: SecurityItem[] }) {
  const incidents = items
    .filter((i) => i.category === 'incident' || i.category === 'backdoor')
    .sort((a, b) => (b.detected_at > a.detected_at ? 1 : -1))

  if (incidents.length === 0) {
    return <div style={{ color: '#6b7280', fontSize: 14 }}>Aucun incident enregistré.</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={th}>Detected</th>
            <th style={th}>Site</th>
            <th style={th}>Severity</th>
            <th style={th}>Title</th>
            <th style={th}>Status</th>
            <th style={th}>Commit</th>
            <th style={th}>Resolved</th>
            <th style={th}>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((it) => (
            <tr key={it.id} style={{ borderTop: '1px solid #1f2937' }}>
              <td style={td}>{fmtDate(it.detected_at)}</td>
              <td style={td}>{SITE_LABELS[it.site] ?? it.site}</td>
              <td style={{ ...td, color: sevColor[it.severity] ?? '#e6e6e6', fontWeight: 600 }}>
                {SEVERITY_LABELS[it.severity]}
              </td>
              <td style={td}>{it.title}</td>
              <td style={td}>{STATUS_LABELS[it.status]}</td>
              <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>
                {it.commit_hash ? it.commit_hash.slice(0, 8) : '—'}
              </td>
              <td style={td}>{fmtDate(it.resolved_at)}</td>
              <td style={td}>
                {it.evidence_url ? (
                  <a href={it.evidence_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                    link
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const th: React.CSSProperties = {
  padding: '8px 10px',
  background: '#111827',
  color: '#f3f3f3',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  borderBottom: '1px solid #2a2f3a',
}

const td: React.CSSProperties = {
  padding: '8px 10px',
  color: '#e6e6e6',
  verticalAlign: 'top',
}
