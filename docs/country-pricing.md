# Country Pricing — PPP-Adjusted Multipliers

Shared infra powering geo-priced Stripe checkout for FTG, OFA and CC.

## What it is

A single source of truth mapping every ISO-3166 country to a **price
multiplier** relative to the US (US = `1.00`). Used to derive:

- local Stripe `price_id`s (generator, next phase — do NOT create yet)
- in-app "display price" in the correct currency
- "reality-check" indicator when a visitor lands from an unexpected region
- lead-list pricing tiers for the `commerce_leads` B2B product

198 rows are seeded, covering every UN member state plus a handful of
high-traffic territories (Puerto Rico, Greenland, New Caledonia, French
Polynesia, Hong Kong, Macao, Taiwan, Kosovo, Palestine, Vatican, Cook Is.).

## Algorithm

For each country, four independent consumer-price signals are normalized
against the US and combined with fixed weights:

| Source                                          | Weight | Why                                    |
|--|--|--|
| World Bank PPP conversion factor (`PA.NUS.PPP`) | 35 %   | broadest macro coverage, updated yearly |
| Big Mac Index (Economist, Jan-2026 snapshot)    | 25 %   | consumer-basket reality check          |
| Numbeo Cost-of-Living (urban basket)            | 20 %   | lifestyle / services price-level       |
| IMF WEO GDP per-capita PPP                      | 20 %   | purchasing power of the median buyer   |

```ts
const raw = Σ weight_s * (value_s[country] / value_s['US'])
const clamped = clamp(raw, 0.15, 1.25)      // avoid predatory or giveaway
const final = round(clamped / 0.05) * 0.05  // 5-cent granularity
```

Sanity pins observed on the current seed:

| Country | Expected | Got  |
|---------|----------|------|
| US      | 1.00     | 1.00 |
| FR      | ~0.85    | 0.80 |
| CH      | ~1.20    | 1.15 |
| LU      | ~1.20    | 1.20 |
| JP      | ~0.70    | 0.60 |
| IN      | ~0.30    | 0.25 |
| NG      | ~0.20    | 0.20 |
| CD      | ~0.15    | 0.20 |

Japan lands low (0.60) because the yen collapse of 2022–24 shows through the
Big Mac channel; this is expected and matches the Economist's own commentary.

## Files

- `scripts/build-country-pricing.ts` — builds the JSON + SQL seed from a baked
  2026-Q1 dataset. Run with `--live` to also pull World Bank PPP live.
- `data/country-pricing.json` — committed artifact (safe to import from Edge).
- `data/country-pricing.seed.sql` — idempotent upsert, regenerated alongside JSON.
- `supabase/migrations/20260415120000_country_pricing_multiplier.sql` — schema.
- `supabase/migrations/20260415120100_country_pricing_seed.sql` — initial seed.
- `lib/geo-pricing/per-country.ts` — runtime helper (static + Supabase override
  + zone fallback T1-T4 for unknown ISO codes).
- `app/api/cron/refresh-country-pricing/route.ts` — Vercel Cron target.
- `vercel.json` — cron schedule.

## Refresh cadence

- **Quarterly (automatic):** Vercel Cron hits `/api/cron/refresh-country-pricing`
  on Jan-1, Apr-1, Jul-1, Oct-1 at 04:00 UTC. It reads the JSON bundled in the
  latest deploy and upserts Supabase.
- **On-demand (manual):**
  ```bash
  npx tsx scripts/build-country-pricing.ts --live
  git commit -am "refresh country pricing Q?-YYYY"
  # next deploy → cron upserts automatically
  ```
- **Live World Bank pull:** `--live` hits `api.worldbank.org/v2` (public, no
  auth, 1 req). Big Mac / Numbeo / IMF values are refreshed manually once a
  year when the Economist publishes new data — grep `US_REF` and country rows
  in `scripts/build-country-pricing.ts`.

## Usage

```ts
import { getCountryMultiplier, applyPricing } from '@/lib/geo-pricing/per-country';

// Static (edge-safe)
const info = getCountryMultiplierSync('FR');
// → { iso2:'FR', multiplier:0.80, zone:'T2', source:'static', ... }

// With Supabase override (live)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, anon);
const info = await getCountryMultiplier('FR', { supabase });

// Apply to a base USD price in cents
const { amountCents } = applyPricing(49_00, 'FR');
// → { amountCents: 3999, multiplier: 0.80, zone: 'T2' } → 39,99 €
```

### Zone fallback

Unknown ISO codes (new states, disputed regions, bugs in upstream geo-IP) fall
back to a zone:

| Zone | Multiplier | Used for                                            |
|------|------------|-----------------------------------------------------|
| T1   | 1.00       | ≥ 1.00 countries (US, CH, MC, LU, LI, SG, IE, ...)  |
| T2   | 0.75       | 0.70–0.99 (FR, DE, JP, KR, TW, IL, ...)             |
| T3   | 0.50       | 0.40–0.69 (BR, AR, TH, MY, PL, RU, RS, ...)         |
| T4   | 0.25       | < 0.40 (IN, PK, NG, KE, BD, VN, ID, ...)            |

Default fallback when everything else fails is **T3** (`0.50`) — a safe middle
ground that preserves margin without being predatory.

## Next phases (NOT done here)

1. **Stripe `price_id` generator** — 3 tiers × 198 countries × 4 durations
   = 2 376 prices. Blocked on user validation of reference prices.
2. **UI picker** — show local price next to USD on checkout.
3. **Annual signal refresh** — automate Big Mac CSV pull from
   `github.com/TheEconomist/big-mac-data` and Numbeo scrape.
