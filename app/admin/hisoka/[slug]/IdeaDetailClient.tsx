'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/auth-v2/client-fetch';

const GOLD = '#C9A84C';
const BG = '#0A1A2E';
const FG = '#E6EEF7';
const DIM = '#9BA8B8';
const GOOD = '#6BCB77';
const WARN = '#FFB84C';
const BAD = '#FF6B6B';

type MrrCurve = { m1: number; m3: number; m6: number; m12: number; m24: number; m36: number };
type LeverageConfig = {
  label: 'bootstrap' | 'accelerated' | 'turbo' | 'overkill';
  launch_eur: number;
  workers: number;
  leverage: number;
  mrr_curve: MrrCurve;
  irr_y3_pct?: number;
  sp500_delta_pct?: number;
  risk_score?: number;
  notes?: string;
};

type Idea = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  visibility?: 'public' | 'private';
  autonomy_acquisition: number | null;
  autonomy_content_ops: number | null;
  autonomy_fulfillment: number | null;
  autonomy_support: number | null;
  autonomy_billing: number | null;
  autonomy_compliance: number | null;
  autonomy_score: number | null;
  setup_hours_user: number;
  ongoing_user_hours_per_month: number;
  distribution_channels: string[] | null;
  monetization_model: string;
  pricing_tiers: Array<{ name: string; price_eur: number; limits?: string; gm_pct?: number }> | null;
  assets_leveraged: string[] | null;
  self_funding_score: number | null;
  effort_weeks: number;
  monthly_ops_cost_eur: number | null;
  scalability_per_worker: string | null;
  mrr_conservative: MrrCurve | null;
  mrr_median: MrrCurve | null;
  mrr_optimistic: MrrCurve | null;
  leverage_configs: LeverageConfig[];
  optimal_config: LeverageConfig | null;
  leverage_elasticity: string | null;
  new_minato_agents_needed: Array<{ name: string; role: string; covers_dim: string; dev_weeks: number }> | null;
  rationale: string | null;
  compliance_notes: string | null;
  sources: Array<{ url: string; type: string }> | null;
  score: number;
  rank: number | null;
  llc_gate: string;
};

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `€${n.toFixed(0)}`;
}

// Linear interpolation between leverage configs based on capital.
// If capital < bootstrap launch_eur → scale down proportionally.
// If capital > overkill launch_eur → use overkill (capped).
// Else → interpolate between adjacent configs.
function simulateMrr(
  configs: LeverageConfig[],
  capital: number,
): MrrCurve | null {
  if (!configs || configs.length === 0) return null;
  const sorted = [...configs].sort((a, b) => a.launch_eur - b.launch_eur);
  if (capital <= sorted[0].launch_eur) {
    const ratio = capital / sorted[0].launch_eur;
    const c = sorted[0].mrr_curve;
    return {
      m1: c.m1 * ratio, m3: c.m3 * ratio, m6: c.m6 * ratio,
      m12: c.m12 * ratio, m24: c.m24 * ratio, m36: c.m36 * ratio,
    };
  }
  if (capital >= sorted[sorted.length - 1].launch_eur) {
    return sorted[sorted.length - 1].mrr_curve;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (capital >= lo.launch_eur && capital <= hi.launch_eur) {
      const t = (capital - lo.launch_eur) / (hi.launch_eur - lo.launch_eur);
      return {
        m1: lo.mrr_curve.m1 + t * (hi.mrr_curve.m1 - lo.mrr_curve.m1),
        m3: lo.mrr_curve.m3 + t * (hi.mrr_curve.m3 - lo.mrr_curve.m3),
        m6: lo.mrr_curve.m6 + t * (hi.mrr_curve.m6 - lo.mrr_curve.m6),
        m12: lo.mrr_curve.m12 + t * (hi.mrr_curve.m12 - lo.mrr_curve.m12),
        m24: lo.mrr_curve.m24 + t * (hi.mrr_curve.m24 - lo.mrr_curve.m24),
        m36: lo.mrr_curve.m36 + t * (hi.mrr_curve.m36 - lo.mrr_curve.m36),
      };
    }
  }
  return sorted[sorted.length - 1].mrr_curve;
}

export default function IdeaDetailClient({ initialIdea }: { initialIdea: Idea }) {
  const [idea, setIdea] = useState<Idea>(initialIdea);
  const [toggling, setToggling] = useState(false);
  const minLaunch = idea.leverage_configs?.[0]?.launch_eur ?? 1000;
  const maxLaunch = (idea.leverage_configs ?? []).reduce(
    (m, c) => Math.max(m, c.launch_eur),
    minLaunch,
  ) || 50_000;
  const [capital, setCapital] = useState<number>(
    idea.optimal_config?.launch_eur ?? minLaunch,
  );

  const simMrr = useMemo(
    () => simulateMrr(idea.leverage_configs ?? [], capital),
    [idea.leverage_configs, capital],
  );
  const arr_y3 = simMrr ? simMrr.m36 * 12 : 0;
  const roi_y3 = capital > 0 ? ((arr_y3 - capital) / capital) * 100 : 0;

  async function toggleVisibility() {
    const next = idea.visibility === 'private' ? 'public' : 'private';
    setToggling(true);
    try {
      const r = await authFetch(`/api/business-hunter/ideas/${idea.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      if (r.ok) setIdea({ ...idea, visibility: next });
    } finally {
      setToggling(false);
    }
  }

  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ padding: 18, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          {idea.rank != null && (
            <span style={{ background: GOLD, color: BG, padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 700 }}>
              #{idea.rank}
            </span>
          )}
          <h1 style={{ fontSize: 22, margin: 0, color: FG }}>{idea.name}</h1>
          <span style={{ color: DIM, fontSize: 12 }}>[{idea.category}]</span>
          {idea.visibility === 'private' && (
            <span style={{ background: '#2a0b0b', color: BAD, padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>🔒 PRIVÉ — INTERNAL ONLY</span>
          )}
        </div>
        <div style={{ color: DIM, fontSize: 13, marginBottom: 10 }}>{idea.tagline}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: DIM }}>
          <span>Score <strong style={{ color: GOLD }}>{Number(idea.score).toFixed(2)}</strong></span>
          <span>Autonomie <strong style={{ color: (idea.autonomy_score ?? 0) >= 0.9 ? GOOD : WARN }}>{idea.autonomy_score != null ? Number(idea.autonomy_score).toFixed(2) : '—'}</strong></span>
          <span>Effort <strong style={{ color: FG }}>{idea.effort_weeks}w</strong></span>
          <span>Ops <strong style={{ color: FG }}>€{idea.monthly_ops_cost_eur ?? '—'}/mo</strong></span>
          <span>LLC <strong style={{ color: idea.llc_gate === 'none' ? GOOD : idea.llc_gate === 'blocked' ? BAD : WARN }}>{idea.llc_gate}</strong></span>
          <span>Setup <strong style={{ color: FG }}>{idea.setup_hours_user}h</strong></span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: FG, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={idea.visibility !== 'private'}
              onChange={toggleVisibility}
              disabled={toggling}
            />
            <span>Public</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: FG, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={idea.visibility === 'private'}
              onChange={toggleVisibility}
              disabled={toggling}
            />
            <span>Privé (interne uniquement, pas de page publique)</span>
          </label>
          {toggling && <span style={{ color: DIM, fontSize: 11 }}>…</span>}
        </div>
        {idea.visibility === 'private' && (
          <div style={{ marginTop: 8, fontSize: 11, color: WARN }}>
            ⚠️ Cette idée n&apos;est pas visible publiquement. Pas de landing <code>/hunt/{idea.slug}</code>, pas de pricing externe, usage interne exclusif.
          </div>
        )}
        {idea.visibility === 'public' && (
          <div style={{ marginTop: 8, fontSize: 11, color: DIM }}>
            Version externe à générer : landing <code>/hunt/{idea.slug}</code> + business model public (pricing, waitlist, sales pitch).
            <Link href={`/hunt/${idea.slug}`} target="_blank" style={{ color: GOLD, marginLeft: 6 }}>→ voir landing</Link>
          </div>
        )}
      </div>

      {/* Capital Simulator */}
      {idea.leverage_configs && idea.leverage_configs.length > 0 && (
        <div style={{ padding: 18, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Simulator capital</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: DIM, marginBottom: 4 }}>Capital investi</div>
              <input
                type="number"
                value={capital}
                min={500}
                max={maxLaunch * 2}
                step={500}
                onChange={(e) => setCapital(Math.max(500, Number(e.target.value)))}
                style={{ background: '#112233', color: FG, border: `1px solid ${DIM}`, padding: '6px 10px', width: '100%', fontSize: 15, fontWeight: 700, borderRadius: 4 }}
              />
            </div>
            <div>
              <input
                type="range"
                value={capital}
                min={500}
                max={maxLaunch * 2}
                step={500}
                onChange={(e) => setCapital(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: DIM }}>
                <span>€500</span>
                {idea.leverage_configs.slice(0, 4).map((c, i) => (
                  <span key={i} style={{ color: Math.abs(capital - c.launch_eur) < 500 ? GOLD : DIM }}>
                    {c.label} {fmtEur(c.launch_eur)}
                  </span>
                ))}
                <span>{fmtEur(maxLaunch * 2)}</span>
              </div>
            </div>
          </div>

          {simMrr && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12 }}>
              <Stat label="MRR M12" value={fmtEur(simMrr.m12)} color={GOLD} />
              <Stat label="MRR M36" value={fmtEur(simMrr.m36)} color={GOOD} />
              <Stat label="ARR Y3 (M36 × 12)" value={fmtEur(arr_y3)} color={GOOD} />
              <Stat
                label="ROI Y3"
                value={`${roi_y3.toFixed(0)}%`}
                color={roi_y3 > 200 ? GOOD : roi_y3 > 50 ? GOLD : WARN}
              />
            </div>
          )}

          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: DIM, textAlign: 'right' }}>
                  <th style={{ textAlign: 'left', padding: 5 }}>Horizon</th>
                  <th style={{ padding: 5 }}>M1</th>
                  <th style={{ padding: 5 }}>M3</th>
                  <th style={{ padding: 5 }}>M6</th>
                  <th style={{ padding: 5 }}>M12</th>
                  <th style={{ padding: 5 }}>M24</th>
                  <th style={{ padding: 5 }}>M36</th>
                </tr>
              </thead>
              <tbody>
                {([['Conservateur', idea.mrr_conservative, DIM], ['Médian', idea.mrr_median, GOLD], ['Optimiste', idea.mrr_optimistic, GOOD], ['Simulé (capital)', simMrr, '#6AC3E0']] as const).map(([label, curve, color]) =>
                  curve ? (
                    <tr key={label} style={{ borderTop: '1px solid #1A2940' }}>
                      <td style={{ padding: 5, color }}>{label}</td>
                      <td style={{ padding: 5, textAlign: 'right' }}>{fmtEur(curve.m1)}</td>
                      <td style={{ padding: 5, textAlign: 'right' }}>{fmtEur(curve.m3)}</td>
                      <td style={{ padding: 5, textAlign: 'right' }}>{fmtEur(curve.m6)}</td>
                      <td style={{ padding: 5, textAlign: 'right' }}>{fmtEur(curve.m12)}</td>
                      <td style={{ padding: 5, textAlign: 'right' }}>{fmtEur(curve.m24)}</td>
                      <td style={{ padding: 5, textAlign: 'right', color }}>{fmtEur(curve.m36)}</td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leverage configs */}
      {idea.leverage_configs && idea.leverage_configs.length > 0 && (
        <div style={{ padding: 18, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Leverage configs</div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: DIM }}>
                <th style={{ textAlign: 'left', padding: 5 }}>Label</th>
                <th style={{ textAlign: 'right', padding: 5 }}>Launch €</th>
                <th style={{ textAlign: 'right', padding: 5 }}>Workers</th>
                <th style={{ textAlign: 'right', padding: 5 }}>Leverage</th>
                <th style={{ textAlign: 'right', padding: 5 }}>IRR Y3</th>
                <th style={{ textAlign: 'right', padding: 5 }}>Δ SP500</th>
                <th style={{ textAlign: 'right', padding: 5 }}>Risque</th>
              </tr>
            </thead>
            <tbody>
              {idea.leverage_configs.map((c, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: '1px solid #1A2940',
                    background: idea.optimal_config?.label === c.label ? 'rgba(201,168,76,.08)' : 'transparent',
                  }}
                >
                  <td style={{ padding: 5, color: FG }}>
                    {idea.optimal_config?.label === c.label && '⭐ '}
                    {c.label}
                  </td>
                  <td style={{ padding: 5, textAlign: 'right' }}>{fmtEur(c.launch_eur)}</td>
                  <td style={{ padding: 5, textAlign: 'right' }}>{c.workers}</td>
                  <td style={{ padding: 5, textAlign: 'right', color: GOLD }}>×{c.leverage.toFixed(1)}</td>
                  <td style={{ padding: 5, textAlign: 'right' }}>{c.irr_y3_pct != null ? `${c.irr_y3_pct.toFixed(0)}%` : '—'}</td>
                  <td style={{ padding: 5, textAlign: 'right' }}>{c.sp500_delta_pct != null ? `${c.sp500_delta_pct > 0 ? '+' : ''}${c.sp500_delta_pct.toFixed(0)}%` : '—'}</td>
                  <td style={{ padding: 5, textAlign: 'right', color: (c.risk_score ?? 0) > 0.6 ? BAD : (c.risk_score ?? 0) > 0.3 ? WARN : GOOD }}>
                    {c.risk_score != null ? c.risk_score.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Autonomy breakdown */}
      <div style={{ padding: 18, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
        <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Autonomie par dimension</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            ['acquisition', idea.autonomy_acquisition],
            ['content_ops', idea.autonomy_content_ops],
            ['fulfillment', idea.autonomy_fulfillment],
            ['support', idea.autonomy_support],
            ['billing', idea.autonomy_billing],
            ['compliance', idea.autonomy_compliance],
          ].map(([dim, val]) => (
            <div key={dim as string} style={{ fontSize: 12, color: FG, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: DIM }}>{dim as string}</span>
              <span style={{ color: (val as number | null) != null && (val as number) >= 0.8 ? GOOD : (val as number | null) != null && (val as number) >= 0.5 ? GOLD : BAD }}>
                {(val as number | null) != null ? (val as number).toFixed(2) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rationale */}
      {idea.rationale && (
        <div style={{ padding: 18, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Rationale Hisoka</div>
          <div style={{ color: FG, fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{idea.rationale}</div>
        </div>
      )}

      {/* Compliance notes */}
      {idea.compliance_notes && (
        <div style={{ padding: 14, background: '#2a1a0b', borderRadius: 8, border: `1px solid ${WARN}` }}>
          <div style={{ color: WARN, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>⚠️ Compliance / Notes</div>
          <div style={{ color: FG, fontSize: 12, lineHeight: 1.6 }}>{idea.compliance_notes}</div>
        </div>
      )}

      {/* Pricing tiers */}
      {idea.pricing_tiers && idea.pricing_tiers.length > 0 && (
        <div style={{ padding: 18, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Pricing tiers ({idea.monetization_model})</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {idea.pricing_tiers.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: FG }}>
                <span>
                  {t.name} {t.limits && <span style={{ color: DIM }}>· {t.limits}</span>}
                </span>
                <span>
                  <strong style={{ color: GOLD }}>€{t.price_eur}</strong>
                  {t.gm_pct != null && <span style={{ color: DIM }}> · GM {t.gm_pct}%</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets leveraged */}
      {idea.assets_leveraged && idea.assets_leveraged.length > 0 && (
        <div style={{ padding: 14, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Briques réutilisées</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {idea.assets_leveraged.map((b, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#1A2940', color: GOOD, borderRadius: 3 }}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* New agents needed */}
      {idea.new_minato_agents_needed && idea.new_minato_agents_needed.length > 0 && (
        <div style={{ padding: 14, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Nouveaux agents Minato à builder</div>
          {idea.new_minato_agents_needed.map((a, i) => (
            <div key={i} style={{ fontSize: 11, color: FG, padding: 4, borderTop: i > 0 ? '1px solid #1A2940' : undefined }}>
              <strong>{a.name}</strong> <span style={{ color: DIM }}>· {a.covers_dim} · {a.dev_weeks}w</span>
              <div style={{ color: DIM, fontSize: 10 }}>{a.role}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sources */}
      {idea.sources && idea.sources.length > 0 && (
        <div style={{ padding: 14, background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)` }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Sources</div>
          {idea.sources.slice(0, 20).map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 10, color: '#6AC3E0', padding: '2px 0', wordBreak: 'break-all' }}>
              [{s.type}] {s.url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 10, background: '#112233', borderRadius: 4 }}>
      <div style={{ fontSize: 10, color: DIM, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, color, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
