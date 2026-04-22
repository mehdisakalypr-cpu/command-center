'use client';
import type { McPercentiles } from '@/lib/hisoka/monte-carlo';

const HORIZONS: Array<keyof McPercentiles['p50']> = ['m1', 'm3', 'm6', 'm12', 'm24', 'm36'];
const LABEL: Record<string, string> = { m1: '1m', m3: '3m', m6: '6m', m12: '1y', m24: '2y', m36: '3y' };

export default function MonteCarloChart({ mc }: { mc: McPercentiles }) {
  const W = 440, H = 160, PAD = 28;
  const all = HORIZONS.flatMap(h => [mc.p10[h], mc.p50[h], mc.p90[h]]);
  const maxY = Math.max(...all, 1);

  const xFor = (i: number) => PAD + i * ((W - 2 * PAD) / (HORIZONS.length - 1));
  const yFor = (v: number) => H - PAD - (v / maxY) * (H - 2 * PAD);

  const pathFor = (key: 'p10' | 'p50' | 'p90') =>
    HORIZONS.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(mc[key][h]).toFixed(1)}`).join(' ');

  // Build band path: top (p90 forward) then bottom (p10 backward)
  const bandPath = [
    ...HORIZONS.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(mc.p90[h]).toFixed(1)}`),
    ...HORIZONS.slice().reverse().map((h, ri) => {
      const origIdx = HORIZONS.length - 1 - ri;
      return `L ${xFor(origIdx).toFixed(1)} ${yFor(mc.p10[h]).toFixed(1)}`;
    }),
    'Z',
  ].join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, background: '#081524', borderRadius: 4 }}>
        {/* p10-p90 confidence band */}
        <path d={bandPath} fill="rgba(201,168,76,.15)" stroke="none" />
        {/* P90 optimistic line */}
        <path d={pathFor('p90')} stroke="#6BCB77" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
        {/* P50 median line */}
        <path d={pathFor('p50')} stroke="#C9A84C" strokeWidth={2} fill="none" />
        {/* P10 pessimistic line */}
        <path d={pathFor('p10')} stroke="#FF6B6B" strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
        {/* Axis labels */}
        {HORIZONS.map((h, i) => (
          <text key={h} x={xFor(i)} y={H - 8} fill="#9BA8B8" fontSize={9} textAnchor="middle">{LABEL[h]}</text>
        ))}
        <text x={4} y={PAD} fill="#9BA8B8" fontSize={9}>€{maxY.toLocaleString('fr-FR')}/mo</text>
        <text x={4} y={H - PAD} fill="#9BA8B8" fontSize={9}>€0</text>
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 10, marginTop: 6, color: '#9BA8B8' }}>
        <span><span style={{ color: '#FF6B6B' }}>━━</span> P10 pessimiste</span>
        <span><span style={{ color: '#C9A84C' }}>━━</span> P50 médian</span>
        <span><span style={{ color: '#6BCB77' }}>━━</span> P90 optimiste</span>
      </div>
    </div>
  );
}
