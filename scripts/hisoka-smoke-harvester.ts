// Smoke: harvester fetches real data from HN/Reddit/YC RFS.
import { harvestSignals } from '../lib/hisoka/harvester';

async function main() {
  const t0 = Date.now();
  const signals = await harvestSignals({ timeoutMs: 20000 });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`harvested ${signals.length} signals in ${dt}s`);
  console.log('by source:', signals.reduce((a, s) => { a[s.source] = (a[s.source] ?? 0) + 1; return a; }, {} as Record<string, number>));
  console.log('top 5:');
  signals.slice(0, 5).forEach(s => console.log(`  [${s.source}] ${s.title}${s.score ? ` (score: ${s.score})` : ''}`));
  if (signals.length < 10) { console.error('FAIL: too few signals (network issue?)'); process.exit(1); }
  console.log('OK');
}

main().catch(e => { console.error(e); process.exit(1); });
