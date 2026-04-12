import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Compare designs · Admin' }
export const dynamic = 'force-dynamic'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const OFA_BASE = process.env.OFA_PUBLIC_BASE_URL || 'https://one-for-all-app.vercel.app'

type DesignMeta = { code: string; name: string; sectors: string[]; tags: string[] }
const DESIGN_META: DesignMeta[] = [
  { code: '1', name: 'Luxe',        sectors: ['fashion','hospitality','beauty','crafts','retail'], tags: ['premium','contemporary','avant_garde','warm','minimalist'] },
  { code: '2', name: 'Avant-Garde', sectors: ['tech','fashion','services','beauty'],               tags: ['futuristic','avant_garde','innovative','minimalist','playful'] },
  { code: '3', name: 'Maison',      sectors: ['crafts','restaurant','agriculture','retail','hospitality','wellness'], tags: ['traditional','warm','family','community','premium'] },
  { code: '4', name: 'Cinematic',   sectors: ['fashion','hospitality','restaurant','retail','beauty','tech'], tags: ['premium','avant_garde','playful','contemporary','innovative'] },
  { code: '5', name: 'Editorial',   sectors: ['fashion','beauty','services','crafts','hospitality','wellness'], tags: ['contemporary','premium','minimalist','avant_garde','traditional'] },
]

function scoreDesign(d: DesignMeta, a: { sector?: string | null; intrinsic_tags?: string[] | null }): number {
  let s = 0
  if (a.sector && d.sectors.includes(a.sector)) s += 3
  s += (a.intrinsic_tags ?? []).filter(t => d.tags.includes(t)).length * 2
  return s
}

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = db()

  // id can be a UUID or a slug
  const isUuid = /^[0-9a-f-]{36}$/i.test(id)
  const q = sb.from('generated_sites').select('*')
  const { data: site } = isUuid ? await q.eq('id', id).single() : await q.eq('slug', id).single()
  if (!site) return notFound()

  let archetype: any = null
  if (site.archetype_id) {
    const { data: a } = await sb.from('archetypes').select('*').eq('id', site.archetype_id).single()
    archetype = a
  }

  const scores = DESIGN_META.map(d => ({ ...d, score: scoreDesign(d, archetype || {}) }))
    .sort((a, b) => b.score - a.score)
  const top3 = scores.slice(0, 3)

  const { count: realCount } = await sb
    .from('image_assets')
    .select('id', { head: true, count: 'exact' })
    .eq('archetype_id', site.archetype_id || '')
    .in('source', ['client_site', 'google_places', 'instagram', 'manual'])
  const hasReal = (realCount ?? 0) > 0

  const GOLD = '#C9A84C'

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: GOLD }}>{site.business_name}</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0', fontSize: 13 }}>
          <a href={`${OFA_BASE}/site/${site.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, textDecoration: 'underline' }}>
            /site/{site.slug} ↗
          </a>
          {' · '}Template <b>{site.template}</b>
          {archetype && <> · Archetype <b style={{ color: GOLD }}>{archetype.code}</b> ({archetype.cultural_region})</>}
          {archetype && <> · Tags {archetype.intrinsic_tags?.join(', ')}</>}
        </p>
      </header>

      {/* Coherence scoring table */}
      <section style={{ marginBottom: 24, background: '#071425', border: '1px solid rgba(201,168,76,.2)', borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Coherence scoring</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {scores.map(s => (
            <div key={s.code} style={{
              padding: 10, borderRadius: 8,
              background: s.score > 0 ? (top3.find(t => t.code === s.code) ? `${GOLD}22` : '#0B1624') : '#2B1B1B',
              border: s.score > 0 ? `1px solid ${GOLD}44` : '1px solid #F8717133',
              opacity: s.score === 0 ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.score === 0 ? '#F87171' : GOLD }}>
                {s.code} · {s.name}
              </div>
              <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
                Score {s.score} {s.score === 0 ? '(éliminé)' : top3.find(t => t.code === s.code) ? '✓ top 3' : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 tiles: 3 designs × 2 photo modes */}
      <section>
        <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
          6 variants (top-3 coherent × 2 photo sources)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
          {top3.flatMap(d => (['real','ai'] as const).map(mode => {
            const url = `${OFA_BASE}/site/${site.slug}?design=${d.code}&photos=${mode}`
            const disabled = mode === 'real' && !hasReal
            return (
              <div key={`${d.code}-${mode}`} style={{
                background: '#071425', border: `1px solid ${disabled ? '#F8717133' : 'rgba(201,168,76,.2)'}`,
                borderRadius: 12, overflow: 'hidden', position: 'relative',
                opacity: disabled ? 0.5 : 1,
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(201,168,76,.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: GOLD, fontWeight: 700 }}>{d.code}</span>
                    <span style={{ color: '#CBD5E1', marginLeft: 8 }}>{d.name}</span>
                    <span style={{ color: '#7D8BA0', fontSize: 10, marginLeft: 8 }}>· {mode === 'real' ? 'Vos photos' : 'Nouvelles photos'}</span>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: GOLD, textDecoration: 'underline' }}>Ouvrir ↗</a>
                </div>
                <div style={{ aspectRatio: '16/10', background: '#030712', position: 'relative' }}>
                  {disabled ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F87171', fontSize: 12, textAlign: 'center', padding: 20 }}>
                      Pas de photos scoutées disponibles pour ce site
                    </div>
                  ) : (
                    <iframe src={url} style={{ border: 'none', pointerEvents: 'none', transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }} loading="lazy" />
                  )}
                </div>
              </div>
            )
          }))}
        </div>
      </section>
    </div>
  )
}
