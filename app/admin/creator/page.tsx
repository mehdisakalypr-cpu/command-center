import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Creator Performance · Insights' }

const GOLD = '#C9A84C'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

type Score = {
  id: string
  captured_at: string
  score: number
  category: string
  project?: string | null
  tier_code?: string | null
  session_summary?: string | null
  analysis?: string | null
  strengths?: string[] | null
  improvement_areas?: string[] | null
  criteria?: { name: string; score: number; comment: string }[] | null
}

type Tier = {
  code: string
  label: string
  score_min: number
  score_max: number
  description: string | null
  image_url: string | null
  aura_color: string | null
  power_level: number | null
  transformation_note: string | null
}

function formatPL(n?: number | null): string {
  if (!n) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K'
  return String(n)
}

export default async function CreatorPage() {
  const sb = db()
  const [{ data: scoresRaw }, { data: tiersRaw }] = await Promise.all([
    sb.from('creator_scores').select('*').order('captured_at', { ascending: true }).limit(100),
    sb.from('saiyan_tiers').select('*').order('score_min', { ascending: true }),
  ])
  const scores = (scoresRaw ?? []) as Score[]
  const tiers = (tiersRaw ?? []) as Tier[]

  const latest = scores[scores.length - 1]
  const currentTier = tiers.find(t => latest && latest.score >= t.score_min && latest.score <= t.score_max)
  const nextTier = tiers.find(t => latest && t.score_min > latest.score)

  // SVG line chart
  const W = 900, H = 220, PAD = 32
  const maxScore = 100
  const points = scores.map((s, i) => {
    const x = PAD + (i / Math.max(1, scores.length - 1)) * (W - 2 * PAD)
    const y = H - PAD - ((s.score / maxScore) * (H - 2 * PAD))
    return { x, y, score: s.score, at: s.captured_at, tier: s.tier_code }
  })
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Creator Performance</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Ta progression fondateur. Chaque session = une note + une analyse + un palier Saiyan.
        </p>
      </header>

      <style>{`
@keyframes auraPulse { 0%,100% { opacity:.55; transform: scale(1) } 50% { opacity:.9; transform: scale(1.08) } }
@keyframes auraRing { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes float1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(14px,-18px) } }
@keyframes float2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-16px,12px) } }
@keyframes float3 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(10px,14px) } }
@keyframes heroBreath { 0%,100% { transform: scale(1.02) } 50% { transform: scale(1.07) } }
`}</style>
      {/* Current tier hero */}
      {latest && currentTier && (
        <section style={{
          display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) 1fr', gap: 28,
          background: '#071425', border: `1px solid ${currentTier.aura_color || GOLD}40`,
          borderRadius: 16, padding: 20, marginBottom: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient aura behind everything */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 20% 30%, ${currentTier.aura_color || GOLD}25, transparent 60%)`,
            pointerEvents: 'none', animation: 'auraPulse 4s ease-in-out infinite',
          }} />
          <div style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 12, overflow: 'hidden', background: '#030712' }}>
            {/* Rotating aura ring */}
            <div style={{
              position: 'absolute', inset: -20,
              background: `conic-gradient(from 0deg, ${currentTier.aura_color || GOLD}66, transparent 25%, ${currentTier.aura_color || GOLD}99, transparent 60%, ${currentTier.aura_color || GOLD}66)`,
              filter: 'blur(30px)', animation: 'auraRing 12s linear infinite', opacity: .8,
            }} />
            {/* Aura pulse */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              boxShadow: `inset 0 0 60px 10px ${currentTier.aura_color || GOLD}55, 0 0 80px 10px ${currentTier.aura_color || GOLD}55`,
              animation: 'auraPulse 2.6s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
            {/* Floating energy orbs */}
            <div style={{ position: 'absolute', top: '15%', left: '10%', width: 10, height: 10, borderRadius: '50%', background: currentTier.aura_color || GOLD, boxShadow: `0 0 20px 4px ${currentTier.aura_color || GOLD}`, animation: 'float1 5s ease-in-out infinite', zIndex: 3 }} />
            <div style={{ position: 'absolute', top: '60%', right: '12%', width: 7, height: 7, borderRadius: '50%', background: currentTier.aura_color || GOLD, boxShadow: `0 0 16px 3px ${currentTier.aura_color || GOLD}`, animation: 'float2 4.2s ease-in-out infinite', zIndex: 3 }} />
            <div style={{ position: 'absolute', bottom: '20%', left: '22%', width: 6, height: 6, borderRadius: '50%', background: currentTier.aura_color || GOLD, boxShadow: `0 0 14px 3px ${currentTier.aura_color || GOLD}`, animation: 'float3 6.5s ease-in-out infinite', zIndex: 3 }} />
            {currentTier.image_url ? (
              <img src={currentTier.image_url} alt={currentTier.label} style={{
                width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 2,
                animation: 'heroBreath 6s ease-in-out infinite',
              }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                (image en cours…)
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, color: currentTier.aura_color || GOLD, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 6 }}>
              Palier actuel
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
              {currentTier.label}
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color: currentTier.aura_color || GOLD, marginBottom: 4, lineHeight: 1 }}>
              {latest.score}<span style={{ fontSize: 20, opacity: .5 }}> / 100</span>
            </div>
            <div style={{ fontSize: 14, fontFamily: 'ui-monospace, Menlo, monospace', color: currentTier.aura_color || GOLD, marginBottom: 14, letterSpacing: '.1em' }}>
              ⚡ Power Level {formatPL(currentTier.power_level)}
              {currentTier.power_level && ` (${currentTier.power_level.toLocaleString()} unités)`}
            </div>
            <p style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.5, maxWidth: 520, margin: 0 }}>{currentTier.description}</p>
            {currentTier.transformation_note && (
              <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginTop: 6 }}>« {currentTier.transformation_note} »</p>
            )}

            {nextTier && (
              <div style={{
                marginTop: 18, padding: 14, borderRadius: 10,
                background: 'rgba(255,255,255,.04)', border: `1px solid rgba(255,255,255,.08)`,
              }}>
                <div style={{ fontSize: 10, letterSpacing: '.2em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Prochain palier</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: nextTier.aura_color || GOLD }}>
                  {nextTier.label} <span style={{ opacity: .5, fontSize: 12, fontWeight: 400 }}>à {nextTier.score_min}/100 · PL {formatPL(nextTier.power_level)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>
                  +{nextTier.score_min - latest.score} points à conquérir.
                  {currentTier.power_level && nextTier.power_level && ` Puissance × ${(nextTier.power_level / currentTier.power_level).toFixed(1)}.`}
                </div>
              </div>
            )}

            {(latest.strengths?.length ?? 0) + (latest.improvement_areas?.length ?? 0) > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                {latest.strengths && latest.strengths.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '.2em', color: '#4ADE80', textTransform: 'uppercase', marginBottom: 6 }}>Forces</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#CBD5E1' }}>
                      {latest.strengths.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>▸ {s}</li>)}
                    </ul>
                  </div>
                )}
                {latest.improvement_areas && latest.improvement_areas.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '.2em', color: '#F59E0B', textTransform: 'uppercase', marginBottom: 6 }}>À muscler</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: '#CBD5E1' }}>
                      {latest.improvement_areas.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>▸ {s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Benchmark criteria (last session with criteria) */}
      {(() => {
        const withCrit = [...scores].reverse().find(s => s.criteria && s.criteria.length > 0)
        if (!withCrit?.criteria) return null
        return (
          <section style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
            <h2 style={{ fontSize: 12, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0, marginBottom: 4 }}>
              Benchmark détaillé · {new Date(withCrit.captured_at).toLocaleDateString('fr-FR')}
            </h2>
            <p style={{ fontSize: 13, color: '#CBD5E1', margin: '0 0 18px' }}>
              10 critères, chacun noté /10. Total {withCrit.score}/100.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {withCrit.criteria.map(c => {
                const pct = (c.score / 10) * 100
                const color = c.score >= 9 ? '#4ADE80' : c.score >= 7 ? '#FFC107' : c.score >= 5 ? '#FB923C' : '#F87171'
                return (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '220px 60px 1fr', gap: 14, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'ui-monospace, Menlo, monospace' }}>{c.score}/10</div>
                    <div>
                      <div style={{ height: 6, background: '#1A2332', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>{c.comment}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* Progression graph */}
      <section style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0, marginBottom: 12 }}>
          Progression ({scores.length} sessions)
        </h2>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {/* tier bands */}
          {tiers.map(t => {
            const yTop = H - PAD - ((t.score_max / maxScore) * (H - 2 * PAD))
            const yBot = H - PAD - ((t.score_min / maxScore) * (H - 2 * PAD))
            return (
              <g key={t.code}>
                <rect x={PAD} y={yTop} width={W - 2 * PAD} height={yBot - yTop} fill={t.aura_color || '#fff'} fillOpacity=".06" />
                <text x={W - PAD + 4} y={(yTop + yBot) / 2 + 3} fontSize="9" fill={t.aura_color || '#fff'} opacity=".6">{t.label}</text>
              </g>
            )
          })}
          {/* axes */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />
          {/* path */}
          {points.length > 0 && <path d={pathD} fill="none" stroke={GOLD} strokeWidth="2" />}
          {/* points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={GOLD} stroke="#0b0e16" strokeWidth="2" />
              <text x={p.x} y={p.y - 10} fontSize="11" fill="#E8EEF7" textAnchor="middle" fontWeight="700">{p.score}</text>
            </g>
          ))}
        </svg>
      </section>

      {/* Échelle de puissance — all 9 tiers as a visual ladder */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 12 }}>
          Échelle de puissance · 9 paliers
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {tiers.map(t => {
            const isCurrent = currentTier?.code === t.code
            const aura = t.aura_color || GOLD
            return (
              <div key={t.code} style={{
                background: isCurrent ? `${aura}15` : '#071425',
                border: `1px solid ${isCurrent ? aura : `${aura}33`}`,
                borderRadius: 12, overflow: 'hidden', position: 'relative',
                boxShadow: isCurrent ? `0 0 30px 0 ${aura}55` : undefined,
              }}>
                <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden', background: '#030712' }}>
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 12 }}>(no image)</div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 -60px 80px -20px #05060bdd` }} />
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8, padding: '3px 10px',
                      background: aura, color: '#000', fontSize: 10, fontWeight: 800,
                      borderRadius: 999, letterSpacing: '.15em',
                    }}>
                      ACTUEL
                    </div>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#7D8BA0', marginBottom: 8 }}>
                    Score {t.score_min}–{t.score_max}
                  </div>
                  <div style={{
                    fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace',
                    color: aura, letterSpacing: '.05em', marginBottom: 6,
                  }}>
                    ⚡ {formatPL(t.power_level)}<span style={{ opacity: .5 }}> unités</span>
                  </div>
                  {t.transformation_note && (
                    <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.4, fontStyle: 'italic' }}>
                      « {t.transformation_note} »
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Session log */}
      <section>
        <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 10 }}>
          Historique des sessions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...scores].reverse().map(s => {
            const tier = tiers.find(t => s.score >= t.score_min && s.score <= t.score_max)
            return (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16,
                background: '#071425', border: '1px solid rgba(201,168,76,.12)',
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: tier?.aura_color || GOLD }}>{s.score}</div>
                  <div style={{ fontSize: 10, color: '#7D8BA0', marginTop: 2 }}>{tier?.code}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#7D8BA0', marginBottom: 4 }}>
                    {new Date(s.captured_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    · {s.category}
                    {s.project && ` · ${s.project}`}
                  </div>
                  {s.session_summary && <div style={{ fontSize: 14, fontWeight: 600, color: '#E8EEF7', marginBottom: 6 }}>{s.session_summary}</div>}
                  {s.analysis && <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>{s.analysis}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
