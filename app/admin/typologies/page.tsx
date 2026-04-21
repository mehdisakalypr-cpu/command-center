import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Typologies · OFA' }

const GOLD = '#C9A84C'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export default async function TypologiesPage() {
  const sb = db()
  const { data: typos } = await sb.from('typology_tree')
    .select('id, path, sector, label, lead_count, site_count, updated_at')
    .order('lead_count', { ascending: false })
    .limit(200)

  const { data: srcCounts } = await sb.from('typology_sources').select('typology_id')
  const srcByTypo = new Map<string, number>()
  for (const r of srcCounts ?? []) {
    srcByTypo.set((r as any).typology_id, (srcByTypo.get((r as any).typology_id) ?? 0) + 1)
  }

  const { data: patternCounts } = await sb.from('typology_patterns').select('typology_id')
  const patternsByTypo = new Map<string, number>()
  for (const r of patternCounts ?? []) {
    patternsByTypo.set((r as any).typology_id, (patternsByTypo.get((r as any).typology_id) ?? 0) + 1)
  }

  const { data: imgCounts } = await sb.from('typology_images').select('typology_id, source')
  const imgsByTypo = new Map<string, { total: number; done: number }>()
  for (const r of imgCounts ?? []) {
    const k = (r as any).typology_id
    const s = imgsByTypo.get(k) ?? { total: 0, done: 0 }
    s.total++
    if ((r as any).source !== 'pending') s.done++
    imgsByTypo.set(k, s)
  }

  const bySector = new Map<string, typeof typos>()
  for (const t of typos ?? []) {
    const s = (t as any).sector as string
    if (!bySector.has(s)) bySector.set(s, [] as any)
    ;(bySector.get(s) as any[]).push(t)
  }

  const totalTypos = typos?.length ?? 0
  const totalLeads = (typos ?? []).reduce((a: number, t: any) => a + (t.lead_count ?? 0), 0)
  const totalSources = [...srcByTypo.values()].reduce((a, b) => a + b, 0)
  const totalPatterns = [...patternsByTypo.values()].reduce((a, b) => a + b, 0)

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Typologies OFA</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Arbre fin des commerces + sources concurrents analysés + patterns mutualisables.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Stat label="Typologies" value={totalTypos.toLocaleString()} />
        <Stat label="Leads rattachés" value={totalLeads.toLocaleString()} />
        <Stat label="Sources scrapées" value={totalSources.toLocaleString()} />
        <Stat label="Patterns mutualisés" value={totalPatterns.toLocaleString()} />
      </section>

      {[...bySector.entries()].map(([sector, list]) => (
        <section key={sector} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.2em', color: '#7D8BA0', marginBottom: 10 }}>
            {sector} · {list?.length ?? 0} typologies
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {(list ?? []).map(t => {
              const typoId = (t as any).id
              const img = imgsByTypo.get(typoId) ?? { total: 0, done: 0 }
              return (
                <div key={typoId} style={{
                  background: '#071425', border: '1px solid rgba(201,168,76,.15)',
                  borderRadius: 10, padding: 12,
                }}>
                  <div style={{ fontSize: 11, color: '#7D8BA0', fontFamily: 'ui-monospace, Menlo, monospace', marginBottom: 6 }}>{(t as any).path}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E8EEF7', marginBottom: 8 }}>{(t as any).label ?? (t as any).path}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10 }}>
                    <Badge color={GOLD} label={`${(t as any).lead_count ?? 0} leads`} />
                    <Badge color="#60A5FA" label={`${srcByTypo.get(typoId) ?? 0} src`} />
                    <Badge color="#4ADE80" label={`${patternsByTypo.get(typoId) ?? 0} patterns`} />
                    <Badge color="#F59E0B" label={`${img.done}/${img.total} imgs`} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#071425', border: `1px solid ${GOLD}30`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: GOLD, marginTop: 4 }}>{value}</div>
    </div>
  )
}
function Badge({ color, label }: { color: string; label: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 999, background: `${color}22`, color, fontWeight: 600 }}>{label}</span>
}
