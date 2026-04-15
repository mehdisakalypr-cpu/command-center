import {
  SITES, CATEGORIES, SITE_LABELS, CATEGORY_LABELS,
  type SecurityItem, type SecurityStatus,
} from '@/lib/security/scores'

function statusIcon(status: SecurityStatus, severity: string): string {
  if (status === 'done' || status === 'verified') return '✅'
  if (status === 'in_progress') return '🛠'
  if (status === 'wontfix') return '⏸'
  // open
  if (severity === 'critical' || severity === 'high') return '❌'
  return '⚠️'
}

export default function StackCard({ items }: { items: SecurityItem[] }) {
  // Keep only 'stack' category items (controls in place) — plus done/verified from any category
  const stackItems = items.filter(
    (i) => i.category === 'stack' || i.status === 'done' || i.status === 'verified',
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
      {SITES.map((site) => {
        const siteStack = stackItems.filter((i) => i.site === site)
        return (
          <div key={site} style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              {SITE_LABELS[site]} <span style={{ color: '#9aa', fontWeight: 400, fontSize: 12 }}>({siteStack.length})</span>
            </div>
            {CATEGORIES.map((cat) => {
              const catItems = siteStack.filter((i) => i.category === cat)
              if (catItems.length === 0) return null
              return (
                <div key={cat} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: '#9aa', textTransform: 'uppercase', marginBottom: 2 }}>
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {catItems.map((it) => (
                      <li key={it.id} style={{ fontSize: 13, padding: '2px 0' }}>
                        {statusIcon(it.status, it.severity)} {it.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {siteStack.length === 0 && (
              <div style={{ color: '#6b7280', fontSize: 13 }}>Aucun contrôle documenté.</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #2a2f3a',
  borderRadius: 10,
  padding: 14,
}
