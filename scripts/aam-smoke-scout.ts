import { scoutCandidates } from '../lib/hisoka/aam/scout';

(async () => {
  const candidates = await scoutCandidates({
    dim: 'support',
    current_autonomy: 0.75,
    description: 'Triage and reply to customer support tickets without human intervention',
    forgeable: true,
  });
  console.log('candidates:', candidates.length);
  candidates.forEach(c => console.log(`  [${c.source}] ${c.title.slice(0,80)} (${c.stars ?? c.score ?? '?'})`));
  if (candidates.length < 2) { console.error('FAIL: too few candidates'); process.exit(1); }
  console.log('OK');
})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
