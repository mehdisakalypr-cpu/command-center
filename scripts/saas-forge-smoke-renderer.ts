import { renderLanding } from '@/lib/hisoka/saas-forge/landing-renderer';

async function main() {
  const out = await renderLanding({
    name: 'PPP Pricing API',
    tagline: 'Auto-adjust SaaS prices by country using purchasing-power parity',
    category: 'middleware_api',
    rationale:
      'Global SaaS lose 20-40% revenue in emerging markets via flat pricing. Our API returns PPP-adjusted prices per country using World Bank + BigMac + Numbeo data.',
    monetization_model: 'usage_per_call',
    distribution_channels: ['HN', 'IndieHackers', 'Stripe partners'],
    assets_leveraged: ['country-pricing-matrix', 'ftg-geo-detection'],
  });
  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exit(1);
  // Quick sanity
  const c = out.content;
  console.error(
    `[smoke] ok provider=${out.provider} features=${c.features.length} faq=${c.faq.length} hero="${c.hero_title.slice(0, 60)}"`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
