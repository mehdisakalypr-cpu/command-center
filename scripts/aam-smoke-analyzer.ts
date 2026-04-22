import { analyzeGaps } from '../lib/hisoka/aam/analyzer';

(async () => {
  const gaps = await analyzeGaps({
    idea: {
      name: 'Niche Blog Autopilot',
      tagline: 'Evergreen niche blogs with weekly AI content.',
      rationale: 'Saturated niches have low ongoing effort if content is decent.',
      autonomy_acquisition: 0.88,
      autonomy_content_ops: 0.72,
      autonomy_fulfillment: 0.95,
      autonomy_support: 0.85,
      autonomy_billing: 0.97,
      autonomy_compliance: 0.9,
    },
  });
  console.log('gaps:', JSON.stringify(gaps, null, 2));
  const forgeableCount = gaps.filter(g => g.forgeable).length;
  const complianceGap = gaps.find(g => g.dim === 'compliance');
  if (complianceGap && complianceGap.forgeable) { console.error('FAIL: compliance must not be forgeable'); process.exit(1); }
  if (forgeableCount === 0) { console.error('FAIL: at least 1 forgeable gap expected'); process.exit(1); }
  console.log('OK');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
