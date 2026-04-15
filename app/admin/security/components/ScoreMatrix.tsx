import {
  SITES, CATEGORIES, SITE_LABELS, CATEGORY_LABELS,
  scoreForSite, countBySeverity, scoreFromCounts, scoreColor, scoreEmoji,
  type SecurityItem, type SecuritySite, type SecurityCategory,
} from '@/lib/security/scores'

function cellColor(c: 'green' | 'orange' | 'red'): string {
  return c === 'green' ? '#14532d' : c === 'orange' ? '#7c4a03' : '#7f1d1d'
}

export default function ScoreMatrix({ items }: { items: SecurityItem[] }) {
  const bySite: Record<SecuritySite, SecurityItem[]> = Object.fromEntries(
    SITES.map((s) => [s, items.filter((i) => i.site === s)])
  ) as Record<SecuritySite, SecurityItem[]>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 2, fontSize: 13 }}>
        <thead>
          <tr>
            <th style={th}>Site</th>
            <th style={th}>Score</th>
            {CATEGORIES.map((c) => (
              <th key={c} style={th} title={CATEGORY_LABELS[c]}>{CATEGORY_LABELS[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SITES.map((site) => {
            const siteItems = bySite[site]
            const score = scoreForSite(items, site)
            return (
              <tr key={site}>
                <td style={{ ...td, fontWeight: 600 }}>{SITE_LABELS[site]}</td>
                <td style={{ ...td, background: cellColor(scoreColor(score)), fontWeight: 700 }}>
                  {scoreEmoji(score)} {score}
                </td>
                {CATEGORIES.map((cat) => {
                  const catItems = siteItems.filter((i) => i.category === cat)
                  const counts = countBySeverity(catItems)
                  const catScore = scoreFromCounts(counts)
                  const openCount = counts.critical + counts.high + counts.medium + counts.low
                  return (
                    <td
                      key={cat}
                      style={{
                        ...td,
                        background: catItems.length === 0 ? '#1f2937' : cellColor(scoreColor(catScore)),
                        textAlign: 'center',
                      }}
                      title={`${CATEGORY_LABELS[cat]}: ${catItems.length} items · ${openCount} actifs`}
                    >
                      {catItems.length === 0 ? '—' : `${scoreEmoji(catScore)} ${openCount}/${catItems.length}`}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 12, color: '#9aa' }}>
        Score = 100 − (critical×20 + high×10 + medium×3 + low×1) · cellule = {'{'}actifs{'}'}/{'{'}total{'}'}
      </div>
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
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '8px 10px',
  background: '#0f172a',
  color: '#e6e6e6',
  whiteSpace: 'nowrap',
}
