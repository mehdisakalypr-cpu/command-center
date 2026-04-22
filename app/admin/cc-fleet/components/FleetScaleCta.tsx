'use client'

/**
 * Compact CTA banner pointing to /admin/cc-fleet.
 * To drop into any admin page that shows capacity/compute scaling, to offer
 * the alternative/complementary lever of adding human-or-autonomous workers.
 */
export default function FleetScaleCta({
  reason,
  prefillCount = 1,
  prefillCaps = ['scout', 'content'],
}: {
  reason?: string
  prefillCount?: number
  prefillCaps?: string[]
}) {
  const params = new URLSearchParams({
    count: String(prefillCount),
    caps: prefillCaps.join(','),
    reason: reason ?? 'generic-scale-cta',
  })
  const href = `/admin/cc-fleet?${params.toString()}`
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
      background: '#1a1f2e', border: '1px solid #C9A84C44', borderRadius: 8,
      marginBottom: 16, textDecoration: 'none',
    }}>
      <div style={{ fontSize: 24 }}>🔀</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#C9A84C', fontSize: 14 }}>
          Saturé en compute ? Scale avec CC Fleet
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
          Ajoute des workers Claude Code (humain+IA 24/7). 1 compte Max 20× = ~200 leads scoutés/jour ou 60 sections/jour.
        </div>
      </div>
      <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600 }}>→</div>
    </a>
  )
}
