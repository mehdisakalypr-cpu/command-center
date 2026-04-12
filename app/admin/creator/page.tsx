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

const ANIM_CSS = `
@keyframes auraPulse { 0%,100% { opacity:.55; transform: scale(1) } 50% { opacity:.9; transform: scale(1.08) } }
@keyframes auraRing { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes float1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(14px,-18px) } }
@keyframes float2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-16px,12px) } }
@keyframes float3 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(10px,14px) } }
@keyframes heroBreath { 0%,100% { transform: scale(1.02) } 50% { transform: scale(1.07) } }
`

function AnimatedCharacter({ tier, size = 'large' }: { tier: Tier; size?: 'large' | 'small' | 'card' }) {
  const aura = tier.aura_color || GOLD
  const dims = size === 'large' ? { w: 420 } : size === 'card' ? { w: 220 } : { w: 140 }
  return (
    <div style={{
      position: 'relative', aspectRatio: '3/4', maxWidth: dims.w,
      borderRadius: 12, overflow: 'hidden', background: '#030712',
    }}>
      {/* Rotating aura ring */}
      <div style={{
        position: 'absolute', inset: -18,
        background: `conic-gradient(from 0deg, ${aura}66, transparent 25%, ${aura}cc, transparent 60%, ${aura}66)`,
        filter: 'blur(24px)', animation: 'auraRing 12s linear infinite', opacity: .85,
      }} />
      {/* Inner aura pulse */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        boxShadow: `inset 0 0 60px 10px ${aura}66, 0 0 50px 5px ${aura}55`,
        animation: 'auraPulse 2.6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Floating energy orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 10, height: 10, borderRadius: '50%', background: aura, boxShadow: `0 0 20px 4px ${aura}`, animation: 'float1 5s ease-in-out infinite', zIndex: 3 }} />
      <div style={{ position: 'absolute', top: '60%', right: '12%', width: 7, height: 7, borderRadius: '50%', background: aura, boxShadow: `0 0 16px 3px ${aura}`, animation: 'float2 4.2s ease-in-out infinite', zIndex: 3 }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '22%', width: 6, height: 6, borderRadius: '50%', background: aura, boxShadow: `0 0 14px 3px ${aura}`, animation: 'float3 6.5s ease-in-out infinite', zIndex: 3 }} />
      {tier.image_url ? (
        <img
          src={tier.image_url}
          alt={tier.label}
          loading="eager"
          style={{
            width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 2,
            animation: 'heroBreath 6s ease-in-out infinite',
          }}
        />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 11 }}>…</div>
      )}
    </div>
  )
}

export default async function CreatorPage() {
  const sb = db()
  const [{ data: scoresRaw }, { data: tiersRaw }] = await Promise.all([
    sb.from('creator_scores').select('*').order('captured_at', { ascending: true }).limit(100),
    sb.from('saiyan_tiers').select('*').order('score_min', { ascending: true }),
  ])
  const allScores = (scoresRaw ?? []) as Score[]
  const tiers = (tiersRaw ?? []) as Tier[]

  const now = Date.now()
  const pastScores = allScores.filter(s => new Date(s.captured_at).getTime() <= now)
  const futureScores = allScores.filter(s => new Date(s.captured_at).getTime() > now)
  const latest = pastScores[pastScores.length - 1]
  const currentTier = tiers.find(t => latest && latest.score >= t.score_min && latest.score <= t.score_max)
  const nextTier = tiers.find(t => latest && t.score_min > latest.score)
  const targetScore = futureScores[0]
  const targetTier = targetScore ? tiers.find(t => targetScore.score >= t.score_min && targetScore.score <= t.score_max) : null

  // SVG curve
  const W = 900, H = 220, PAD = 36
  const curvePoints = allScores.map((s, i) => {
    const x = PAD + (i / Math.max(1, allScores.length - 1)) * (W - 2 * PAD)
    const y = H - PAD - ((s.score / 100) * (H - 2 * PAD))
    return { x, y, score: s.score, at: s.captured_at, tier: s.tier_code, isFuture: new Date(s.captured_at).getTime() > now }
  })
  const pathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{ANIM_CSS}</style>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Creator Performance</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>Ta progression fondateur · 9 paliers Saiyan · unités de puissance.</p>
      </header>

      {/* ════════ 1) ÉCHELLE DE PUISSANCE — all 9 tiers with animated characters ════════ */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 12 }}>
          🐉 Échelle de puissance
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {tiers.map(t => {
            const isCurrent = currentTier?.code === t.code
            const aura = t.aura_color || GOLD
            return (
              <div key={t.code} style={{
                background: isCurrent ? `${aura}15` : '#071425',
                border: `1px solid ${isCurrent ? aura : `${aura}33`}`,
                borderRadius: 12, overflow: 'hidden', position: 'relative',
                boxShadow: isCurrent ? `0 0 30px 0 ${aura}66` : undefined,
              }}>
                <div style={{ padding: 10, position: 'relative' }}>
                  <AnimatedCharacter tier={t} size="card" />
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: 18, right: 18, padding: '3px 10px',
                      background: aura, color: '#000', fontSize: 10, fontWeight: 800,
                      borderRadius: 999, letterSpacing: '.15em', zIndex: 10,
                    }}>ACTUEL</div>
                  )}
                </div>
                <div style={{ padding: '0 14px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#7D8BA0', marginBottom: 6 }}>Score {t.score_min}–{t.score_max}</div>
                  <div style={{ fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', color: aura, letterSpacing: '.04em', marginBottom: 4 }}>
                    ⚡ {formatPL(t.power_level)}<span style={{ opacity: .5 }}> unités</span>
                  </div>
                  {t.transformation_note && (
                    <div style={{ fontSize: 11, color: '#CBD5E1', lineHeight: 1.4, fontStyle: 'italic' }}>« {t.transformation_note} »</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ════════ 2) AUJOURD'HUI — text left + animated image right ════════ */}
      {latest && currentTier && (
        <section style={{
          background: '#071425', border: `1px solid ${currentTier.aura_color || GOLD}55`,
          borderRadius: 16, padding: 24, marginBottom: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 80% 20%, ${currentTier.aura_color || GOLD}18, transparent 60%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr minmax(280px, 420px)', gap: 28, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: currentTier.aura_color || GOLD, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 6 }}>
                Aujourd'hui · {new Date(latest.captured_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
              <h2 style={{ fontSize: 36, fontWeight: 900, margin: 0, marginBottom: 4, lineHeight: 1.1 }}>
                {currentTier.label}
              </h2>
              <div style={{ fontSize: 44, fontWeight: 900, color: currentTier.aura_color || GOLD, marginBottom: 4, lineHeight: 1 }}>
                {latest.score}<span style={{ fontSize: 18, opacity: .5 }}> / 100</span>
              </div>
              <div style={{ fontSize: 13, fontFamily: 'ui-monospace, Menlo, monospace', color: currentTier.aura_color || GOLD, marginBottom: 18, letterSpacing: '.1em' }}>
                ⚡ Power Level {formatPL(currentTier.power_level)} ({currentTier.power_level?.toLocaleString()} unités)
              </div>
              {latest.session_summary && (
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
                  {latest.session_summary}
                </div>
              )}
              {latest.analysis && (
                <div style={{ fontSize: 13.5, color: '#CBD5E1', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 16 }}>
                  {latest.analysis}
                </div>
              )}
              {((latest.strengths?.length ?? 0) + (latest.improvement_areas?.length ?? 0)) > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                  {latest.strengths && latest.strengths.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '.2em', color: '#4ADE80', textTransform: 'uppercase', marginBottom: 6 }}>Forces</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5, color: '#CBD5E1' }}>
                        {latest.strengths.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>▸ {s}</li>)}
                      </ul>
                    </div>
                  )}
                  {latest.improvement_areas && latest.improvement_areas.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '.2em', color: '#F59E0B', textTransform: 'uppercase', marginBottom: 6 }}>À muscler</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5, color: '#CBD5E1' }}>
                        {latest.improvement_areas.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>▸ {s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {nextTier && (
                <div style={{ marginTop: 18, padding: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, fontSize: 12, color: '#CBD5E1' }}>
                  <span style={{ color: '#94A3B8' }}>Prochain palier → </span>
                  <b style={{ color: nextTier.aura_color || GOLD }}>{nextTier.label}</b> à {nextTier.score_min}/100
                  {' · '}PL {formatPL(nextTier.power_level)}
                  {currentTier.power_level && nextTier.power_level && ` (×${(nextTier.power_level / currentTier.power_level).toFixed(1)})`}
                </div>
              )}
            </div>
            <div>
              <AnimatedCharacter tier={currentTier} size="large" />
            </div>
          </div>
        </section>
      )}

      {/* ════════ 3) PROGRESSION CURVE ════════ */}
      <section style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 16, marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0, marginBottom: 12 }}>
          Progression · {pastScores.length} sessions passées {targetScore && `· 1 objectif futur`}
        </h2>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {tiers.map(t => {
            const yTop = H - PAD - ((t.score_max / 100) * (H - 2 * PAD))
            const yBot = H - PAD - ((t.score_min / 100) * (H - 2 * PAD))
            return (
              <g key={t.code}>
                <rect x={PAD} y={yTop} width={W - 2 * PAD} height={yBot - yTop} fill={t.aura_color || '#fff'} fillOpacity=".05" />
                <text x={W - PAD + 4} y={(yTop + yBot) / 2 + 3} fontSize="9" fill={t.aura_color || '#fff'} opacity=".6">{t.label}</text>
              </g>
            )
          })}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />
          {curvePoints.length > 1 && <path d={pathD} fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray={curvePoints.find(p => p.isFuture) ? '4 4' : undefined} />}
          {curvePoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill={p.isFuture ? '#030712' : GOLD} stroke={GOLD} strokeWidth="2" />
              <text x={p.x} y={p.y - 10} fontSize="11" fill="#E8EEF7" textAnchor="middle" fontWeight="700">{p.score}</text>
            </g>
          ))}
        </svg>
      </section>

      {/* ════════ 4) BENCHMARK DETAILLÉ du dernier scoring avec critères ════════ */}
      {(() => {
        const withCrit = [...pastScores].reverse().find(s => s.criteria && s.criteria.length > 0)
        if (!withCrit?.criteria) return null
        return (
          <section style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 18, marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0, marginBottom: 6 }}>
              Benchmark détaillé · {new Date(withCrit.captured_at).toLocaleDateString('fr-FR')} · {withCrit.score}/100
            </h2>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 14px' }}>10 critères, notés sur 10.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {withCrit.criteria.map(c => {
                const pct = (c.score / 10) * 100
                const color = c.score >= 9 ? '#4ADE80' : c.score >= 7 ? '#FFC107' : c.score >= 5 ? '#FB923C' : '#F87171'
                return (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '200px 54px 1fr', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'ui-monospace, Menlo, monospace' }}>{c.score}/10</div>
                    <div>
                      <div style={{ height: 6, background: '#1A2332', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5 }}>{c.comment}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* ════════ 5) HISTORIQUE chronologique avec images animées à droite ════════ */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 12 }}>
          Historique des sessions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...pastScores].reverse().slice(1).map(s => {
            const tier = tiers.find(t => s.score >= t.score_min && s.score <= t.score_max)
            if (!tier) return null
            const aura = tier.aura_color || GOLD
            return (
              <div key={s.id} style={{
                background: '#071425', border: `1px solid ${aura}30`, borderRadius: 12, padding: 18,
                display: 'grid', gridTemplateColumns: '1fr minmax(180px, 260px)', gap: 20, alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: aura, letterSpacing: '.3em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {new Date(s.captured_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · {s.category}{s.project ? ` · ${s.project}` : ''}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{tier.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: aura, marginBottom: 4, lineHeight: 1 }}>
                    {s.score}<span style={{ fontSize: 14, opacity: .5 }}> / 100</span>
                  </div>
                  <div style={{ fontSize: 11, color: aura, marginBottom: 12, fontFamily: 'ui-monospace, Menlo, monospace' }}>⚡ {formatPL(tier.power_level)} unités</div>
                  {s.session_summary && <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.session_summary}</div>}
                  {s.analysis && <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{s.analysis}</p>}
                </div>
                <AnimatedCharacter tier={tier} size="card" />
              </div>
            )
          })}
        </div>
      </section>

      {/* ════════ 6) TARGET futur ════════ */}
      {targetScore && targetTier && (
        <section style={{
          background: `linear-gradient(135deg, ${targetTier.aura_color || GOLD}22, transparent 60%)`,
          border: `2px dashed ${targetTier.aura_color || GOLD}88`, borderRadius: 16, padding: 20, marginBottom: 28,
          display: 'grid', gridTemplateColumns: '1fr minmax(220px, 320px)', gap: 20, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.3em', color: targetTier.aura_color || GOLD, textTransform: 'uppercase', marginBottom: 6 }}>
              🎯 Objectif · {new Date(targetScore.captured_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, marginBottom: 4 }}>{targetTier.label}</h2>
            <div style={{ fontSize: 36, fontWeight: 900, color: targetTier.aura_color || GOLD, marginBottom: 4 }}>
              {targetScore.score}<span style={{ fontSize: 14, opacity: .5 }}> / 100</span>
            </div>
            <div style={{ fontSize: 12, color: targetTier.aura_color || GOLD, marginBottom: 12, fontFamily: 'ui-monospace, Menlo, monospace' }}>
              ⚡ PL {formatPL(targetTier.power_level)} · ×{latest && currentTier?.power_level && targetTier.power_level ? (targetTier.power_level / currentTier.power_level).toFixed(0) : '?'} vs actuel
            </div>
            {targetScore.analysis && <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, lineHeight: 1.6 }}>{targetScore.analysis}</p>}
          </div>
          <AnimatedCharacter tier={targetTier} size="card" />
        </section>
      )}
    </div>
  )
}
