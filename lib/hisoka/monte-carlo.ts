// Pure TypeScript Monte Carlo. No deps. 500 runs default. In-process, fast (~2-3ms).
// Triangular distribution sampling per horizon between (conservative, median, optimistic).

export type McAnchor = {
  m1: number;
  m3: number;
  m6: number;
  m12: number;
  m24: number;
  m36: number;
};

export type McPercentiles = {
  p10: McAnchor;
  p50: McAnchor;
  p90: McAnchor;
};

function sampleTriangular(min: number, mode: number, max: number): number {
  // Inverse CDF sampling for triangular distribution
  const range = max - min;
  if (range < 1e-9) return min;
  const u = Math.random();
  const f = (mode - min) / range;
  if (u < f) {
    return min + Math.sqrt(u * range * (mode - min));
  }
  return max - Math.sqrt((1 - u) * range * (max - mode));
}

function percentile(sorted: number[], p: number): number {
  const i = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

export function runMonteCarlo(
  conservative: McAnchor,
  median: McAnchor,
  optimistic: McAnchor,
  runs = 500,
): McPercentiles {
  const horizons: Array<keyof McAnchor> = ['m1', 'm3', 'm6', 'm12', 'm24', 'm36'];
  const samples: Record<keyof McAnchor, number[]> = {
    m1: [], m3: [], m6: [], m12: [], m24: [], m36: [],
  };

  for (let i = 0; i < runs; i++) {
    for (const h of horizons) {
      // Guard against degenerate distributions (min >= mode etc.)
      const lo = Math.min(conservative[h], median[h], optimistic[h]);
      const hi = Math.max(conservative[h], median[h], optimistic[h]);
      const mo = Math.max(lo, Math.min(hi, median[h]));
      samples[h].push(sampleTriangular(lo, mo, hi));
    }
  }

  const out: McPercentiles = {
    p10: {} as McAnchor,
    p50: {} as McAnchor,
    p90: {} as McAnchor,
  };

  for (const h of horizons) {
    const s = samples[h].slice().sort((a, b) => a - b);
    out.p10[h] = Math.round(percentile(s, 0.10));
    out.p50[h] = Math.round(percentile(s, 0.50));
    out.p90[h] = Math.round(percentile(s, 0.90));
  }

  return out;
}
