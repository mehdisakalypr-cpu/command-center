/**
 * lib/geo-pricing/per-country.ts
 * ------------------------------------------------------------------
 * Runtime helper: resolve a PPP-adjusted price multiplier for an ISO2
 * country code. Falls back to zone tiers (T1–T4) if the country is
 * unknown (e.g. disputed territories, obscure ISO aliases, or new
 * states added to the atlas after the last seed).
 *
 * Data source cascade:
 *   1. In-process static JSON (data/country-pricing.json) — always present,
 *      cold-start safe, zero network cost.
 *   2. Supabase `country_pricing_multiplier` — optional override when a
 *      `supabase` client is passed (allows trimestrial refresh without redeploy).
 *
 * Usage:
 *   import { getCountryMultiplier, applyPricing } from '@/lib/geo-pricing/per-country';
 *   const m = await getCountryMultiplier('FR');          // 0.80
 *   const price = applyPricing(49_00, 'FR');             // returns cents-adjusted
 *
 *   // With live Supabase override:
 *   const m = await getCountryMultiplier('FR', { supabase });
 * ------------------------------------------------------------------
 */

import staticData from '@/data/country-pricing.json';

type StaticRow = {
  iso2: string;
  iso3: string;
  name: string;
  currency: string;
  multiplier: number;
  components?: unknown;
  computed_at?: string;
};

type StaticFile = {
  version: string;
  computed_at: string;
  countries: StaticRow[];
};

// Lazy-build lookup map once per process
let STATIC_MAP: Map<string, StaticRow> | null = null;
function staticMap(): Map<string, StaticRow> {
  if (STATIC_MAP) return STATIC_MAP;
  const file = staticData as StaticFile;
  STATIC_MAP = new Map(file.countries.map((c) => [c.iso2.toUpperCase(), c]));
  return STATIC_MAP;
}

// Zone fallback (T1–T4) when ISO2 is unknown
export type PricingZone = 'T1' | 'T2' | 'T3' | 'T4';
export const ZONE_MULTIPLIER: Record<PricingZone, number> = {
  T1: 1.00,  // Western/Northern Europe, North America, Gulf high income
  T2: 0.75,  // Southern/Eastern EU, wealthy Asia, Israel, Saudi
  T3: 0.50,  // Latin America core, SEA, North Africa urban
  T4: 0.25,  // Sub-Saharan Africa, South Asia, least-developed
};

export function zoneForMultiplier(m: number): PricingZone {
  if (m >= 1.00) return 'T1';
  if (m >= 0.70) return 'T2';
  if (m >= 0.40) return 'T3';
  return 'T4';
}

export interface CountryPricingInfo {
  iso2: string;
  iso3: string | null;
  name: string | null;
  currency: string | null;
  multiplier: number;
  zone: PricingZone;
  source: 'supabase' | 'static' | 'fallback-zone';
}

// Minimal shape we accept without coupling to @supabase/supabase-js types
type MinimalSupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
  };
};

/**
 * Resolve the pricing multiplier for a country.
 *
 * @param iso2      ISO 3166-1 alpha-2 (case-insensitive). "FR", "fr", "FR-IDF"→"FR" accepted.
 * @param opts.supabase  Optional Supabase client for live override.
 * @param opts.fallbackZone  Zone to use when country is completely unknown. Default T3.
 */
export async function getCountryMultiplier(
  iso2: string | null | undefined,
  opts: { supabase?: MinimalSupabase; fallbackZone?: PricingZone } = {}
): Promise<CountryPricingInfo> {
  const code = normalizeIso2(iso2);
  const fallbackZone = opts.fallbackZone ?? 'T3';

  // 1. Try Supabase override (live data)
  if (code && opts.supabase) {
    try {
      const { data } = await opts.supabase
        .from('country_pricing_multiplier')
        .select('iso2, iso3, name, currency, multiplier')
        .eq('iso2', code)
        .maybeSingle();
      if (data && typeof data.multiplier === 'number') {
        const m = data.multiplier as number;
        return {
          iso2: code,
          iso3: (data.iso3 as string) ?? null,
          name: (data.name as string) ?? null,
          currency: (data.currency as string) ?? null,
          multiplier: m,
          zone: zoneForMultiplier(m),
          source: 'supabase',
        };
      }
    } catch {
      // fall through to static
    }
  }

  // 2. Static JSON lookup
  if (code) {
    const row = staticMap().get(code);
    if (row) {
      return {
        iso2: row.iso2,
        iso3: row.iso3,
        name: row.name,
        currency: row.currency,
        multiplier: row.multiplier,
        zone: zoneForMultiplier(row.multiplier),
        source: 'static',
      };
    }
  }

  // 3. Zone fallback
  return {
    iso2: code ?? 'XX',
    iso3: null,
    name: null,
    currency: null,
    multiplier: ZONE_MULTIPLIER[fallbackZone],
    zone: fallbackZone,
    source: 'fallback-zone',
  };
}

/** Synchronous variant when a Supabase client is not available (edge-safe). */
export function getCountryMultiplierSync(
  iso2: string | null | undefined,
  fallbackZone: PricingZone = 'T3'
): CountryPricingInfo {
  const code = normalizeIso2(iso2);
  if (code) {
    const row = staticMap().get(code);
    if (row) {
      return {
        iso2: row.iso2,
        iso3: row.iso3,
        name: row.name,
        currency: row.currency,
        multiplier: row.multiplier,
        zone: zoneForMultiplier(row.multiplier),
        source: 'static',
      };
    }
  }
  return {
    iso2: code ?? 'XX',
    iso3: null,
    name: null,
    currency: null,
    multiplier: ZONE_MULTIPLIER[fallbackZone],
    zone: fallbackZone,
    source: 'fallback-zone',
  };
}

/**
 * Apply a multiplier to a base price in minor units (cents).
 * Rounds to "psychological" endings (.99 / .90 / .50 depending on size).
 */
export function applyPricing(
  baseCents: number,
  iso2: string | null | undefined,
  opts: { round?: 'psycho' | 'nearest' | 'none' } = {}
): { amountCents: number; multiplier: number; zone: PricingZone; iso2: string } {
  const info = getCountryMultiplierSync(iso2);
  const raw = Math.round(baseCents * info.multiplier);
  let amount = raw;
  const mode = opts.round ?? 'psycho';
  if (mode === 'psycho') amount = toPsycho(raw);
  else if (mode === 'nearest') amount = Math.round(raw / 100) * 100;
  return { amountCents: amount, multiplier: info.multiplier, zone: info.zone, iso2: info.iso2 };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function normalizeIso2(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length < 2) return null;
  // Accept "FR-IDF" (region-specific) → keep country prefix only
  const code = trimmed.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

/** Round to psychological endings: .99 under 100€, .90 under 1000€, .50 above. */
function toPsycho(cents: number): number {
  if (cents <= 0) return 0;
  if (cents < 10_000) {
    // under 100.00 currency units → X.99
    return Math.max(99, Math.floor(cents / 100) * 100 + 99);
  }
  if (cents < 100_000) {
    // under 1000 → X9.90
    return Math.floor(cents / 1000) * 1000 + 990;
  }
  return Math.floor(cents / 5000) * 5000 + 4999;
}
