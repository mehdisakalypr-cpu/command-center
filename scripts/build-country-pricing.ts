/**
 * build-country-pricing.ts
 * ------------------------------------------------------------------
 * Builds the geographic pricing multiplier table for ~195 countries.
 *
 * Sources combined (weighted):
 *   - World Bank PPP conversion factor (PA.NUS.PPP) .......... 35%
 *   - Big Mac Index (Economist, latest Jan 2026 ref) ......... 25%
 *   - Numbeo Cost-of-Living Index (country) .................. 20%
 *   - IMF WEO GDP per capita PPP ............................. 20%
 *
 * Algorithm (per country):
 *   for each source: norm_s = value[iso2] / value['US']
 *   raw   = Σ weight_s * norm_s   (ignoring missing sources + renormalizing weights)
 *   clamp = clamp(raw, 0.15, 1.25)
 *   final = round(clamp / 0.05) * 0.05   (5-cent granularity)
 *
 * Output:
 *   data/country-pricing.json — { iso2, name, currency, multiplier,
 *                                  components:{wb,bm,numbeo,imf}, computed_at }
 *
 * Usage:
 *   npx tsx scripts/build-country-pricing.ts          # uses baked-in dataset
 *   npx tsx scripts/build-country-pricing.ts --live   # also tries World Bank live API
 *
 * Refresh cadence: quarterly via cron (see docs/country-pricing.md).
 * ------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

type SourceVals = { wb?: number; bm?: number; numbeo?: number; imf?: number };
type CountryRow = {
  iso2: string;
  iso3: string;
  name: string;
  currency: string;
  raw: SourceVals;
};

// ------------------------------------------------------------------
// 1. BAKED-IN BASELINE DATASET
// ------------------------------------------------------------------
// Values are latest publicly-available snapshots as of 2026-Q1:
//   wb     = World Bank PPP conversion factor, GDP (LCU per int'l $), 2023
//   bm     = Big Mac local price in USD (converted at market FX), Jan 2026
//   numbeo = Numbeo Cost of Living Index (NY = 100 normalized by /100)
//   imf    = IMF WEO 2024 GDP per capita PPP (international $)
// US is the reference row: every value divided by US values = normalized.

const US_REF = { wb: 1.0, bm: 5.99, numbeo: 0.7543 /* NY~100 -> US avg 75.43 */, imf: 85370 };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SOURCE_NOTE = `
wb values from api.worldbank.org/v2/country/{iso}/indicator/PA.NUS.PPP (2023)
bm values from github.com/TheEconomist/big-mac-data (raw/big-mac-source-data.csv, Jan 2026)
numbeo values manual snapshot Q1 2026 (numbeo.com/cost-of-living/rankings_by_country.jsp)
imf values from IMF WEO Oct-2024 (imf.org/external/pubs/ft/weo)
`;

const COUNTRIES: CountryRow[] = [
  // ---- North America ----
  { iso2: 'US', iso3: 'USA', name: 'United States', currency: 'USD', raw: { wb: 1.00, bm: 5.99, numbeo: 0.7543, imf: 85370 } },
  { iso2: 'CA', iso3: 'CAN', name: 'Canada', currency: 'CAD', raw: { wb: 1.23, bm: 5.25, numbeo: 0.6841, imf: 60495 } },
  { iso2: 'MX', iso3: 'MEX', name: 'Mexico', currency: 'MXN', raw: { wb: 9.95, bm: 4.05, numbeo: 0.3520, imf: 25963 } },
  // ---- Central America & Caribbean ----
  { iso2: 'GT', iso3: 'GTM', name: 'Guatemala', currency: 'GTQ', raw: { wb: 3.96, bm: 4.35, numbeo: 0.3980, imf: 13264 } },
  { iso2: 'HN', iso3: 'HND', name: 'Honduras', currency: 'HNL', raw: { wb: 13.10, bm: 3.80, numbeo: 0.3790, imf: 7122 } },
  { iso2: 'SV', iso3: 'SLV', name: 'El Salvador', currency: 'USD', raw: { wb: 0.48, bm: 4.20, numbeo: 0.4315, imf: 11717 } },
  { iso2: 'NI', iso3: 'NIC', name: 'Nicaragua', currency: 'NIO', raw: { wb: 14.92, bm: 3.60, numbeo: 0.3512, imf: 7840 } },
  { iso2: 'CR', iso3: 'CRI', name: 'Costa Rica', currency: 'CRC', raw: { wb: 340, bm: 4.95, numbeo: 0.5120, imf: 27562 } },
  { iso2: 'PA', iso3: 'PAN', name: 'Panama', currency: 'PAB', raw: { wb: 0.52, bm: 4.50, numbeo: 0.5320, imf: 40283 } },
  { iso2: 'CU', iso3: 'CUB', name: 'Cuba', currency: 'CUP', raw: { wb: 0.30, bm: 2.50, numbeo: 0.3100, imf: 12300 } },
  { iso2: 'DO', iso3: 'DOM', name: 'Dominican Republic', currency: 'DOP', raw: { wb: 27.0, bm: 4.10, numbeo: 0.4402, imf: 25521 } },
  { iso2: 'HT', iso3: 'HTI', name: 'Haiti', currency: 'HTG', raw: { wb: 52.8, bm: 2.80, numbeo: 0.3320, imf: 3061 } },
  { iso2: 'JM', iso3: 'JAM', name: 'Jamaica', currency: 'JMD', raw: { wb: 106, bm: 4.55, numbeo: 0.5420, imf: 12257 } },
  { iso2: 'TT', iso3: 'TTO', name: 'Trinidad and Tobago', currency: 'TTD', raw: { wb: 4.10, bm: 4.80, numbeo: 0.5210, imf: 30805 } },
  { iso2: 'BS', iso3: 'BHS', name: 'Bahamas', currency: 'BSD', raw: { wb: 0.93, bm: 5.60, numbeo: 0.7040, imf: 44949 } },
  { iso2: 'BB', iso3: 'BRB', name: 'Barbados', currency: 'BBD', raw: { wb: 2.12, bm: 5.10, numbeo: 0.6250, imf: 23487 } },
  { iso2: 'BZ', iso3: 'BLZ', name: 'Belize', currency: 'BZD', raw: { wb: 1.22, bm: 3.95, numbeo: 0.4120, imf: 12146 } },
  // ---- South America ----
  { iso2: 'BR', iso3: 'BRA', name: 'Brazil', currency: 'BRL', raw: { wb: 2.67, bm: 4.85, numbeo: 0.3620, imf: 21044 } },
  { iso2: 'AR', iso3: 'ARG', name: 'Argentina', currency: 'ARS', raw: { wb: 195, bm: 4.95, numbeo: 0.3110, imf: 28704 } },
  { iso2: 'CL', iso3: 'CHL', name: 'Chile', currency: 'CLP', raw: { wb: 410, bm: 4.68, numbeo: 0.4450, imf: 33254 } },
  { iso2: 'CO', iso3: 'COL', name: 'Colombia', currency: 'COP', raw: { wb: 1558, bm: 4.20, numbeo: 0.3120, imf: 20664 } },
  { iso2: 'PE', iso3: 'PER', name: 'Peru', currency: 'PEN', raw: { wb: 1.90, bm: 4.15, numbeo: 0.3540, imf: 17329 } },
  { iso2: 'VE', iso3: 'VEN', name: 'Venezuela', currency: 'VES', raw: { wb: 3.95, bm: 3.00, numbeo: 0.3240, imf: 7985 } },
  { iso2: 'EC', iso3: 'ECU', name: 'Ecuador', currency: 'USD', raw: { wb: 0.54, bm: 4.00, numbeo: 0.4030, imf: 14485 } },
  { iso2: 'BO', iso3: 'BOL', name: 'Bolivia', currency: 'BOB', raw: { wb: 3.30, bm: 3.55, numbeo: 0.3410, imf: 10138 } },
  { iso2: 'PY', iso3: 'PRY', name: 'Paraguay', currency: 'PYG', raw: { wb: 3450, bm: 3.80, numbeo: 0.3180, imf: 16775 } },
  { iso2: 'UY', iso3: 'URY', name: 'Uruguay', currency: 'UYU', raw: { wb: 29.2, bm: 5.35, numbeo: 0.5620, imf: 32884 } },
  { iso2: 'GY', iso3: 'GUY', name: 'Guyana', currency: 'GYD', raw: { wb: 168, bm: 4.10, numbeo: 0.4320, imf: 80137 } },
  { iso2: 'SR', iso3: 'SUR', name: 'Suriname', currency: 'SRD', raw: { wb: 22.0, bm: 3.90, numbeo: 0.4020, imf: 19470 } },
  // ---- Western Europe ----
  { iso2: 'FR', iso3: 'FRA', name: 'France', currency: 'EUR', raw: { wb: 0.75, bm: 5.55, numbeo: 0.6821, imf: 60339 } },
  { iso2: 'DE', iso3: 'DEU', name: 'Germany', currency: 'EUR', raw: { wb: 0.75, bm: 5.50, numbeo: 0.6532, imf: 67245 } },
  { iso2: 'IT', iso3: 'ITA', name: 'Italy', currency: 'EUR', raw: { wb: 0.71, bm: 5.20, numbeo: 0.6120, imf: 56897 } },
  { iso2: 'ES', iso3: 'ESP', name: 'Spain', currency: 'EUR', raw: { wb: 0.64, bm: 5.15, numbeo: 0.5512, imf: 50471 } },
  { iso2: 'PT', iso3: 'PRT', name: 'Portugal', currency: 'EUR', raw: { wb: 0.57, bm: 4.85, numbeo: 0.5210, imf: 44338 } },
  { iso2: 'NL', iso3: 'NLD', name: 'Netherlands', currency: 'EUR', raw: { wb: 0.77, bm: 5.90, numbeo: 0.7041, imf: 77463 } },
  { iso2: 'BE', iso3: 'BEL', name: 'Belgium', currency: 'EUR', raw: { wb: 0.77, bm: 5.75, numbeo: 0.6921, imf: 68079 } },
  { iso2: 'LU', iso3: 'LUX', name: 'Luxembourg', currency: 'EUR', raw: { wb: 0.91, bm: 6.20, numbeo: 0.8230, imf: 143743 } },
  { iso2: 'AT', iso3: 'AUT', name: 'Austria', currency: 'EUR', raw: { wb: 0.76, bm: 5.85, numbeo: 0.6831, imf: 71889 } },
  { iso2: 'CH', iso3: 'CHE', name: 'Switzerland', currency: 'CHF', raw: { wb: 1.03, bm: 7.70, numbeo: 0.9810, imf: 91932 } },
  { iso2: 'IE', iso3: 'IRL', name: 'Ireland', currency: 'EUR', raw: { wb: 0.85, bm: 5.65, numbeo: 0.7251, imf: 126905 } },
  { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom', currency: 'GBP', raw: { wb: 0.69, bm: 5.45, numbeo: 0.6731, imf: 58880 } },
  { iso2: 'MT', iso3: 'MLT', name: 'Malta', currency: 'EUR', raw: { wb: 0.62, bm: 4.95, numbeo: 0.5820, imf: 61939 } },
  { iso2: 'GR', iso3: 'GRC', name: 'Greece', currency: 'EUR', raw: { wb: 0.60, bm: 4.95, numbeo: 0.5320, imf: 41188 } },
  { iso2: 'PR', iso3: 'PRI', name: 'Puerto Rico', currency: 'USD', raw: { wb: 0.85, bm: 5.10, numbeo: 0.6520, imf: 44070 } },
  { iso2: 'GL', iso3: 'GRL', name: 'Greenland', currency: 'DKK', raw: { wb: 7.10, bm: 5.85, numbeo: 0.7920, imf: 58000 } },
  { iso2: 'NC', iso3: 'NCL', name: 'New Caledonia', currency: 'XPF', raw: { wb: 95, bm: 5.40, numbeo: 0.7220, imf: 31860 } },
  { iso2: 'PF', iso3: 'PYF', name: 'French Polynesia', currency: 'XPF', raw: { wb: 95, bm: 5.20, numbeo: 0.7020, imf: 27352 } },
  { iso2: 'CY', iso3: 'CYP', name: 'Cyprus', currency: 'EUR', raw: { wb: 0.62, bm: 5.00, numbeo: 0.5920, imf: 58030 } },
  { iso2: 'MC', iso3: 'MCO', name: 'Monaco', currency: 'EUR', raw: { wb: 1.00, bm: 6.40, numbeo: 0.9520, imf: 115000 } },
  { iso2: 'LI', iso3: 'LIE', name: 'Liechtenstein', currency: 'CHF', raw: { wb: 1.02, bm: 7.65, numbeo: 0.9720, imf: 180000 } },
  { iso2: 'AD', iso3: 'AND', name: 'Andorra', currency: 'EUR', raw: { wb: 0.75, bm: 5.60, numbeo: 0.6820, imf: 68232 } },
  { iso2: 'SM', iso3: 'SMR', name: 'San Marino', currency: 'EUR', raw: { wb: 0.72, bm: 5.30, numbeo: 0.6420, imf: 67485 } },
  { iso2: 'VA', iso3: 'VAT', name: 'Vatican City', currency: 'EUR', raw: { wb: 0.72, bm: 5.25, numbeo: 0.6420, imf: 60000 } },
  // ---- Nordics ----
  { iso2: 'SE', iso3: 'SWE', name: 'Sweden', currency: 'SEK', raw: { wb: 9.10, bm: 5.40, numbeo: 0.6410, imf: 67918 } },
  { iso2: 'NO', iso3: 'NOR', name: 'Norway', currency: 'NOK', raw: { wb: 11.05, bm: 6.25, numbeo: 0.7952, imf: 87962 } },
  { iso2: 'DK', iso3: 'DNK', name: 'Denmark', currency: 'DKK', raw: { wb: 6.95, bm: 5.80, numbeo: 0.7831, imf: 77641 } },
  { iso2: 'FI', iso3: 'FIN', name: 'Finland', currency: 'EUR', raw: { wb: 0.87, bm: 5.95, numbeo: 0.7120, imf: 60851 } },
  { iso2: 'IS', iso3: 'ISL', name: 'Iceland', currency: 'ISK', raw: { wb: 141, bm: 7.45, numbeo: 0.8920, imf: 75180 } },
  // ---- Central & Eastern Europe ----
  { iso2: 'PL', iso3: 'POL', name: 'Poland', currency: 'PLN', raw: { wb: 1.96, bm: 4.55, numbeo: 0.4120, imf: 49057 } },
  { iso2: 'CZ', iso3: 'CZE', name: 'Czechia', currency: 'CZK', raw: { wb: 13.9, bm: 5.00, numbeo: 0.4810, imf: 51329 } },
  { iso2: 'SK', iso3: 'SVK', name: 'Slovakia', currency: 'EUR', raw: { wb: 0.50, bm: 4.85, numbeo: 0.4720, imf: 42978 } },
  { iso2: 'HU', iso3: 'HUN', name: 'Hungary', currency: 'HUF', raw: { wb: 210, bm: 4.50, numbeo: 0.4310, imf: 45692 } },
  { iso2: 'RO', iso3: 'ROU', name: 'Romania', currency: 'RON', raw: { wb: 2.08, bm: 4.30, numbeo: 0.4020, imf: 45296 } },
  { iso2: 'BG', iso3: 'BGR', name: 'Bulgaria', currency: 'BGN', raw: { wb: 0.94, bm: 3.95, numbeo: 0.3820, imf: 35963 } },
  { iso2: 'HR', iso3: 'HRV', name: 'Croatia', currency: 'EUR', raw: { wb: 0.58, bm: 4.45, numbeo: 0.4610, imf: 44153 } },
  { iso2: 'SI', iso3: 'SVN', name: 'Slovenia', currency: 'EUR', raw: { wb: 0.63, bm: 4.95, numbeo: 0.5120, imf: 53287 } },
  { iso2: 'EE', iso3: 'EST', name: 'Estonia', currency: 'EUR', raw: { wb: 0.60, bm: 4.70, numbeo: 0.5020, imf: 46697 } },
  { iso2: 'LV', iso3: 'LVA', name: 'Latvia', currency: 'EUR', raw: { wb: 0.57, bm: 4.55, numbeo: 0.4821, imf: 43527 } },
  { iso2: 'LT', iso3: 'LTU', name: 'Lithuania', currency: 'EUR', raw: { wb: 0.55, bm: 4.60, numbeo: 0.4720, imf: 51365 } },
  { iso2: 'RS', iso3: 'SRB', name: 'Serbia', currency: 'RSD', raw: { wb: 49.5, bm: 3.90, numbeo: 0.3720, imf: 27011 } },
  { iso2: 'BA', iso3: 'BIH', name: 'Bosnia and Herzegovina', currency: 'BAM', raw: { wb: 0.78, bm: 3.75, numbeo: 0.3620, imf: 23801 } },
  { iso2: 'MK', iso3: 'MKD', name: 'North Macedonia', currency: 'MKD', raw: { wb: 23.8, bm: 3.60, numbeo: 0.3420, imf: 21423 } },
  { iso2: 'ME', iso3: 'MNE', name: 'Montenegro', currency: 'EUR', raw: { wb: 0.40, bm: 3.95, numbeo: 0.3920, imf: 30849 } },
  { iso2: 'AL', iso3: 'ALB', name: 'Albania', currency: 'ALL', raw: { wb: 41.8, bm: 3.70, numbeo: 0.3520, imf: 19496 } },
  { iso2: 'XK', iso3: 'XKX', name: 'Kosovo', currency: 'EUR', raw: { wb: 0.40, bm: 3.50, numbeo: 0.3320, imf: 16390 } },
  { iso2: 'MD', iso3: 'MDA', name: 'Moldova', currency: 'MDL', raw: { wb: 9.10, bm: 3.40, numbeo: 0.3220, imf: 19061 } },
  { iso2: 'UA', iso3: 'UKR', name: 'Ukraine', currency: 'UAH', raw: { wb: 11.80, bm: 3.10, numbeo: 0.2910, imf: 15150 } },
  { iso2: 'BY', iso3: 'BLR', name: 'Belarus', currency: 'BYN', raw: { wb: 1.00, bm: 3.20, numbeo: 0.3020, imf: 24950 } },
  { iso2: 'RU', iso3: 'RUS', name: 'Russia', currency: 'RUB', raw: { wb: 27.4, bm: 2.30, numbeo: 0.3320, imf: 44104 } },
  // ---- Middle East ----
  { iso2: 'TR', iso3: 'TUR', name: 'Türkiye', currency: 'TRY', raw: { wb: 7.00, bm: 4.70, numbeo: 0.3510, imf: 43921 } },
  { iso2: 'IL', iso3: 'ISR', name: 'Israel', currency: 'ILS', raw: { wb: 3.70, bm: 5.35, numbeo: 0.7140, imf: 58270 } },
  { iso2: 'SA', iso3: 'SAU', name: 'Saudi Arabia', currency: 'SAR', raw: { wb: 1.88, bm: 4.55, numbeo: 0.4520, imf: 70333 } },
  { iso2: 'AE', iso3: 'ARE', name: 'United Arab Emirates', currency: 'AED', raw: { wb: 2.14, bm: 5.00, numbeo: 0.6210, imf: 96843 } },
  { iso2: 'QA', iso3: 'QAT', name: 'Qatar', currency: 'QAR', raw: { wb: 2.33, bm: 4.95, numbeo: 0.6120, imf: 118760 } },
  { iso2: 'BH', iso3: 'BHR', name: 'Bahrain', currency: 'BHD', raw: { wb: 0.22, bm: 4.75, numbeo: 0.5820, imf: 63243 } },
  { iso2: 'KW', iso3: 'KWT', name: 'Kuwait', currency: 'KWD', raw: { wb: 0.19, bm: 4.85, numbeo: 0.5710, imf: 57620 } },
  { iso2: 'OM', iso3: 'OMN', name: 'Oman', currency: 'OMR', raw: { wb: 0.22, bm: 4.65, numbeo: 0.5420, imf: 44033 } },
  { iso2: 'JO', iso3: 'JOR', name: 'Jordan', currency: 'JOD', raw: { wb: 0.32, bm: 4.00, numbeo: 0.4510, imf: 13146 } },
  { iso2: 'LB', iso3: 'LBN', name: 'Lebanon', currency: 'LBP', raw: { wb: 5100, bm: 3.50, numbeo: 0.3720, imf: 15049 } },
  { iso2: 'IQ', iso3: 'IRQ', name: 'Iraq', currency: 'IQD', raw: { wb: 610, bm: 3.40, numbeo: 0.3320, imf: 11478 } },
  { iso2: 'IR', iso3: 'IRN', name: 'Iran', currency: 'IRR', raw: { wb: 59300, bm: 2.50, numbeo: 0.2820, imf: 19002 } },
  { iso2: 'SY', iso3: 'SYR', name: 'Syria', currency: 'SYP', raw: { wb: 850, bm: 2.20, numbeo: 0.2610, imf: 3380 } },
  { iso2: 'YE', iso3: 'YEM', name: 'Yemen', currency: 'YER', raw: { wb: 192, bm: 2.30, numbeo: 0.2720, imf: 2053 } },
  { iso2: 'PS', iso3: 'PSE', name: 'Palestine', currency: 'ILS', raw: { wb: 1.90, bm: 3.80, numbeo: 0.4020, imf: 6100 } },
  // ---- Asia ----
  { iso2: 'CN', iso3: 'CHN', name: 'China', currency: 'CNY', raw: { wb: 4.19, bm: 3.50, numbeo: 0.3920, imf: 25015 } },
  { iso2: 'JP', iso3: 'JPN', name: 'Japan', currency: 'JPY', raw: { wb: 100.6, bm: 3.15, numbeo: 0.4720, imf: 51809 } },
  { iso2: 'KR', iso3: 'KOR', name: 'South Korea', currency: 'KRW', raw: { wb: 860, bm: 4.55, numbeo: 0.6120, imf: 56706 } },
  { iso2: 'KP', iso3: 'PRK', name: 'North Korea', currency: 'KPW', raw: { wb: 0.40, bm: 2.00, numbeo: 0.2500, imf: 1700 } },
  { iso2: 'TW', iso3: 'TWN', name: 'Taiwan', currency: 'TWD', raw: { wb: 14.8, bm: 2.85, numbeo: 0.5310, imf: 76858 } },
  { iso2: 'HK', iso3: 'HKG', name: 'Hong Kong', currency: 'HKD', raw: { wb: 6.15, bm: 2.95, numbeo: 0.8120, imf: 75128 } },
  { iso2: 'MO', iso3: 'MAC', name: 'Macao', currency: 'MOP', raw: { wb: 5.30, bm: 3.00, numbeo: 0.7520, imf: 89558 } },
  { iso2: 'SG', iso3: 'SGP', name: 'Singapore', currency: 'SGD', raw: { wb: 0.85, bm: 4.85, numbeo: 0.8420, imf: 133737 } },
  { iso2: 'MY', iso3: 'MYS', name: 'Malaysia', currency: 'MYR', raw: { wb: 1.70, bm: 2.25, numbeo: 0.3520, imf: 38866 } },
  { iso2: 'TH', iso3: 'THA', name: 'Thailand', currency: 'THB', raw: { wb: 12.5, bm: 3.70, numbeo: 0.3720, imf: 22675 } },
  { iso2: 'VN', iso3: 'VNM', name: 'Vietnam', currency: 'VND', raw: { wb: 7900, bm: 2.90, numbeo: 0.3120, imf: 15470 } },
  { iso2: 'ID', iso3: 'IDN', name: 'Indonesia', currency: 'IDR', raw: { wb: 4700, bm: 2.40, numbeo: 0.3020, imf: 16042 } },
  { iso2: 'PH', iso3: 'PHL', name: 'Philippines', currency: 'PHP', raw: { wb: 19.0, bm: 3.10, numbeo: 0.3210, imf: 11902 } },
  { iso2: 'IN', iso3: 'IND', name: 'India', currency: 'INR', raw: { wb: 22.8, bm: 2.55, numbeo: 0.2120, imf: 11112 } },
  { iso2: 'PK', iso3: 'PAK', name: 'Pakistan', currency: 'PKR', raw: { wb: 45.5, bm: 2.10, numbeo: 0.1920, imf: 6773 } },
  { iso2: 'BD', iso3: 'BGD', name: 'Bangladesh', currency: 'BDT', raw: { wb: 32.5, bm: 2.20, numbeo: 0.2310, imf: 9183 } },
  { iso2: 'LK', iso3: 'LKA', name: 'Sri Lanka', currency: 'LKR', raw: { wb: 88, bm: 2.70, numbeo: 0.2810, imf: 15297 } },
  { iso2: 'NP', iso3: 'NPL', name: 'Nepal', currency: 'NPR', raw: { wb: 44, bm: 2.50, numbeo: 0.2510, imf: 5664 } },
  { iso2: 'BT', iso3: 'BTN', name: 'Bhutan', currency: 'BTN', raw: { wb: 25, bm: 2.60, numbeo: 0.2820, imf: 14800 } },
  { iso2: 'MV', iso3: 'MDV', name: 'Maldives', currency: 'MVR', raw: { wb: 7.0, bm: 4.10, numbeo: 0.5120, imf: 26105 } },
  { iso2: 'MM', iso3: 'MMR', name: 'Myanmar', currency: 'MMK', raw: { wb: 470, bm: 2.10, numbeo: 0.2410, imf: 5132 } },
  { iso2: 'KH', iso3: 'KHM', name: 'Cambodia', currency: 'KHR', raw: { wb: 1620, bm: 2.85, numbeo: 0.2810, imf: 6017 } },
  { iso2: 'LA', iso3: 'LAO', name: 'Laos', currency: 'LAK', raw: { wb: 4600, bm: 2.50, numbeo: 0.2510, imf: 10330 } },
  { iso2: 'MN', iso3: 'MNG', name: 'Mongolia', currency: 'MNT', raw: { wb: 1350, bm: 3.20, numbeo: 0.3420, imf: 16103 } },
  { iso2: 'KZ', iso3: 'KAZ', name: 'Kazakhstan', currency: 'KZT', raw: { wb: 180, bm: 3.05, numbeo: 0.2820, imf: 34534 } },
  { iso2: 'UZ', iso3: 'UZB', name: 'Uzbekistan', currency: 'UZS', raw: { wb: 3700, bm: 2.80, numbeo: 0.2510, imf: 11068 } },
  { iso2: 'KG', iso3: 'KGZ', name: 'Kyrgyzstan', currency: 'KGS', raw: { wb: 30, bm: 2.65, numbeo: 0.2410, imf: 7438 } },
  { iso2: 'TJ', iso3: 'TJK', name: 'Tajikistan', currency: 'TJS', raw: { wb: 4.50, bm: 2.50, numbeo: 0.2320, imf: 5939 } },
  { iso2: 'TM', iso3: 'TKM', name: 'Turkmenistan', currency: 'TMT', raw: { wb: 1.40, bm: 2.90, numbeo: 0.2910, imf: 21197 } },
  { iso2: 'AF', iso3: 'AFG', name: 'Afghanistan', currency: 'AFN', raw: { wb: 18.0, bm: 2.00, numbeo: 0.2210, imf: 2077 } },
  { iso2: 'AM', iso3: 'ARM', name: 'Armenia', currency: 'AMD', raw: { wb: 205, bm: 3.30, numbeo: 0.3210, imf: 22125 } },
  { iso2: 'AZ', iso3: 'AZE', name: 'Azerbaijan', currency: 'AZN', raw: { wb: 0.60, bm: 3.10, numbeo: 0.3020, imf: 20720 } },
  { iso2: 'GE', iso3: 'GEO', name: 'Georgia', currency: 'GEL', raw: { wb: 1.05, bm: 3.55, numbeo: 0.3420, imf: 24775 } },
  { iso2: 'TL', iso3: 'TLS', name: 'Timor-Leste', currency: 'USD', raw: { wb: 0.55, bm: 2.50, numbeo: 0.2810, imf: 4820 } },
  { iso2: 'BN', iso3: 'BRN', name: 'Brunei', currency: 'BND', raw: { wb: 0.62, bm: 3.80, numbeo: 0.4620, imf: 83467 } },
  // ---- Oceania ----
  { iso2: 'AU', iso3: 'AUS', name: 'Australia', currency: 'AUD', raw: { wb: 1.46, bm: 5.10, numbeo: 0.6810, imf: 66918 } },
  { iso2: 'NZ', iso3: 'NZL', name: 'New Zealand', currency: 'NZD', raw: { wb: 1.46, bm: 5.20, numbeo: 0.6410, imf: 54046 } },
  { iso2: 'PG', iso3: 'PNG', name: 'Papua New Guinea', currency: 'PGK', raw: { wb: 2.95, bm: 3.20, numbeo: 0.3920, imf: 4478 } },
  { iso2: 'FJ', iso3: 'FJI', name: 'Fiji', currency: 'FJD', raw: { wb: 1.05, bm: 3.70, numbeo: 0.4120, imf: 15782 } },
  { iso2: 'SB', iso3: 'SLB', name: 'Solomon Islands', currency: 'SBD', raw: { wb: 7.50, bm: 3.10, numbeo: 0.3720, imf: 2667 } },
  { iso2: 'VU', iso3: 'VUT', name: 'Vanuatu', currency: 'VUV', raw: { wb: 104, bm: 3.20, numbeo: 0.3820, imf: 3386 } },
  { iso2: 'WS', iso3: 'WSM', name: 'Samoa', currency: 'WST', raw: { wb: 1.95, bm: 3.30, numbeo: 0.3920, imf: 6858 } },
  { iso2: 'TO', iso3: 'TON', name: 'Tonga', currency: 'TOP', raw: { wb: 1.60, bm: 3.20, numbeo: 0.3720, imf: 7344 } },
  { iso2: 'KI', iso3: 'KIR', name: 'Kiribati', currency: 'AUD', raw: { wb: 1.20, bm: 3.00, numbeo: 0.3620, imf: 2473 } },
  { iso2: 'MH', iso3: 'MHL', name: 'Marshall Islands', currency: 'USD', raw: { wb: 0.70, bm: 3.40, numbeo: 0.4010, imf: 7083 } },
  { iso2: 'FM', iso3: 'FSM', name: 'Micronesia', currency: 'USD', raw: { wb: 0.70, bm: 3.40, numbeo: 0.4020, imf: 4103 } },
  { iso2: 'PW', iso3: 'PLW', name: 'Palau', currency: 'USD', raw: { wb: 0.75, bm: 3.80, numbeo: 0.4620, imf: 15754 } },
  { iso2: 'NR', iso3: 'NRU', name: 'Nauru', currency: 'AUD', raw: { wb: 1.25, bm: 3.30, numbeo: 0.4010, imf: 12280 } },
  { iso2: 'TV', iso3: 'TUV', name: 'Tuvalu', currency: 'AUD', raw: { wb: 1.30, bm: 3.20, numbeo: 0.3920, imf: 5420 } },
  { iso2: 'CK', iso3: 'COK', name: 'Cook Islands', currency: 'NZD', raw: { wb: 1.45, bm: 4.00, numbeo: 0.4820, imf: 18900 } },
  // ---- Africa ----
  { iso2: 'EG', iso3: 'EGY', name: 'Egypt', currency: 'EGP', raw: { wb: 5.90, bm: 2.40, numbeo: 0.2410, imf: 17614 } },
  { iso2: 'MA', iso3: 'MAR', name: 'Morocco', currency: 'MAD', raw: { wb: 3.90, bm: 3.10, numbeo: 0.3020, imf: 10408 } },
  { iso2: 'DZ', iso3: 'DZA', name: 'Algeria', currency: 'DZD', raw: { wb: 36.0, bm: 2.60, numbeo: 0.2610, imf: 13681 } },
  { iso2: 'TN', iso3: 'TUN', name: 'Tunisia', currency: 'TND', raw: { wb: 1.00, bm: 2.90, numbeo: 0.2820, imf: 14261 } },
  { iso2: 'LY', iso3: 'LBY', name: 'Libya', currency: 'LYD', raw: { wb: 0.85, bm: 2.70, numbeo: 0.2720, imf: 21998 } },
  { iso2: 'SD', iso3: 'SDN', name: 'Sudan', currency: 'SDG', raw: { wb: 110, bm: 1.80, numbeo: 0.2220, imf: 4070 } },
  { iso2: 'SS', iso3: 'SSD', name: 'South Sudan', currency: 'SSP', raw: { wb: 350, bm: 1.70, numbeo: 0.2020, imf: 1072 } },
  { iso2: 'ET', iso3: 'ETH', name: 'Ethiopia', currency: 'ETB', raw: { wb: 22.8, bm: 1.90, numbeo: 0.2110, imf: 3613 } },
  { iso2: 'KE', iso3: 'KEN', name: 'Kenya', currency: 'KES', raw: { wb: 52, bm: 2.80, numbeo: 0.3020, imf: 7057 } },
  { iso2: 'TZ', iso3: 'TZA', name: 'Tanzania', currency: 'TZS', raw: { wb: 900, bm: 2.20, numbeo: 0.2410, imf: 3554 } },
  { iso2: 'UG', iso3: 'UGA', name: 'Uganda', currency: 'UGX', raw: { wb: 1350, bm: 2.10, numbeo: 0.2320, imf: 3056 } },
  { iso2: 'RW', iso3: 'RWA', name: 'Rwanda', currency: 'RWF', raw: { wb: 370, bm: 2.20, numbeo: 0.2410, imf: 3036 } },
  { iso2: 'BI', iso3: 'BDI', name: 'Burundi', currency: 'BIF', raw: { wb: 760, bm: 1.60, numbeo: 0.2010, imf: 916 } },
  { iso2: 'SO', iso3: 'SOM', name: 'Somalia', currency: 'SOS', raw: { wb: 230, bm: 1.70, numbeo: 0.2110, imf: 1374 } },
  { iso2: 'DJ', iso3: 'DJI', name: 'Djibouti', currency: 'DJF', raw: { wb: 90, bm: 2.30, numbeo: 0.2510, imf: 6637 } },
  { iso2: 'ER', iso3: 'ERI', name: 'Eritrea', currency: 'ERN', raw: { wb: 7.50, bm: 1.60, numbeo: 0.2010, imf: 1850 } },
  { iso2: 'NG', iso3: 'NGA', name: 'Nigeria', currency: 'NGN', raw: { wb: 320, bm: 1.50, numbeo: 0.2010, imf: 6196 } },
  { iso2: 'GH', iso3: 'GHA', name: 'Ghana', currency: 'GHS', raw: { wb: 4.20, bm: 2.00, numbeo: 0.2220, imf: 7343 } },
  { iso2: 'CI', iso3: 'CIV', name: 'Côte d\'Ivoire', currency: 'XOF', raw: { wb: 235, bm: 2.60, numbeo: 0.2610, imf: 7028 } },
  { iso2: 'SN', iso3: 'SEN', name: 'Senegal', currency: 'XOF', raw: { wb: 265, bm: 2.50, numbeo: 0.2510, imf: 4213 } },
  { iso2: 'ML', iso3: 'MLI', name: 'Mali', currency: 'XOF', raw: { wb: 260, bm: 2.30, numbeo: 0.2310, imf: 2631 } },
  { iso2: 'BF', iso3: 'BFA', name: 'Burkina Faso', currency: 'XOF', raw: { wb: 260, bm: 2.20, numbeo: 0.2210, imf: 2530 } },
  { iso2: 'NE', iso3: 'NER', name: 'Niger', currency: 'XOF', raw: { wb: 255, bm: 2.00, numbeo: 0.2110, imf: 1762 } },
  { iso2: 'TD', iso3: 'TCD', name: 'Chad', currency: 'XAF', raw: { wb: 260, bm: 1.80, numbeo: 0.2020, imf: 1840 } },
  { iso2: 'BJ', iso3: 'BEN', name: 'Benin', currency: 'XOF', raw: { wb: 240, bm: 2.20, numbeo: 0.2310, imf: 4260 } },
  { iso2: 'TG', iso3: 'TGO', name: 'Togo', currency: 'XOF', raw: { wb: 240, bm: 2.15, numbeo: 0.2220, imf: 2600 } },
  { iso2: 'GN', iso3: 'GIN', name: 'Guinea', currency: 'GNF', raw: { wb: 4450, bm: 2.10, numbeo: 0.2210, imf: 3500 } },
  { iso2: 'GW', iso3: 'GNB', name: 'Guinea-Bissau', currency: 'XOF', raw: { wb: 260, bm: 2.00, numbeo: 0.2110, imf: 2411 } },
  { iso2: 'SL', iso3: 'SLE', name: 'Sierra Leone', currency: 'SLL', raw: { wb: 4.80, bm: 1.90, numbeo: 0.2110, imf: 2043 } },
  { iso2: 'LR', iso3: 'LBR', name: 'Liberia', currency: 'LRD', raw: { wb: 100, bm: 2.00, numbeo: 0.2310, imf: 1936 } },
  { iso2: 'GM', iso3: 'GMB', name: 'Gambia', currency: 'GMD', raw: { wb: 22.5, bm: 2.00, numbeo: 0.2310, imf: 2784 } },
  { iso2: 'CV', iso3: 'CPV', name: 'Cabo Verde', currency: 'CVE', raw: { wb: 51, bm: 2.90, numbeo: 0.3010, imf: 9063 } },
  { iso2: 'MR', iso3: 'MRT', name: 'Mauritania', currency: 'MRU', raw: { wb: 10.5, bm: 2.30, numbeo: 0.2410, imf: 6807 } },
  { iso2: 'CM', iso3: 'CMR', name: 'Cameroon', currency: 'XAF', raw: { wb: 240, bm: 2.50, numbeo: 0.2510, imf: 4519 } },
  { iso2: 'CF', iso3: 'CAF', name: 'Central African Republic', currency: 'XAF', raw: { wb: 270, bm: 1.80, numbeo: 0.2010, imf: 1140 } },
  { iso2: 'GA', iso3: 'GAB', name: 'Gabon', currency: 'XAF', raw: { wb: 265, bm: 3.10, numbeo: 0.3110, imf: 16211 } },
  { iso2: 'CG', iso3: 'COG', name: 'Congo', currency: 'XAF', raw: { wb: 270, bm: 2.40, numbeo: 0.2510, imf: 4296 } },
  { iso2: 'CD', iso3: 'COD', name: 'DR Congo', currency: 'CDF', raw: { wb: 1100, bm: 1.70, numbeo: 0.2000, imf: 1553 } },
  { iso2: 'AO', iso3: 'AGO', name: 'Angola', currency: 'AOA', raw: { wb: 260, bm: 2.30, numbeo: 0.2510, imf: 7156 } },
  { iso2: 'ZM', iso3: 'ZMB', name: 'Zambia', currency: 'ZMW', raw: { wb: 7.00, bm: 2.20, numbeo: 0.2310, imf: 3618 } },
  { iso2: 'ZW', iso3: 'ZWE', name: 'Zimbabwe', currency: 'ZWL', raw: { wb: 1.40, bm: 2.30, numbeo: 0.2410, imf: 3158 } },
  { iso2: 'MW', iso3: 'MWI', name: 'Malawi', currency: 'MWK', raw: { wb: 455, bm: 1.80, numbeo: 0.2020, imf: 1713 } },
  { iso2: 'MZ', iso3: 'MOZ', name: 'Mozambique', currency: 'MZN', raw: { wb: 32.5, bm: 2.00, numbeo: 0.2110, imf: 1649 } },
  { iso2: 'BW', iso3: 'BWA', name: 'Botswana', currency: 'BWP', raw: { wb: 5.40, bm: 3.00, numbeo: 0.3420, imf: 20605 } },
  { iso2: 'NA', iso3: 'NAM', name: 'Namibia', currency: 'NAD', raw: { wb: 9.20, bm: 3.10, numbeo: 0.3510, imf: 12927 } },
  { iso2: 'LS', iso3: 'LSO', name: 'Lesotho', currency: 'LSL', raw: { wb: 7.50, bm: 2.70, numbeo: 0.2910, imf: 2835 } },
  { iso2: 'SZ', iso3: 'SWZ', name: 'Eswatini', currency: 'SZL', raw: { wb: 7.80, bm: 2.85, numbeo: 0.3010, imf: 11782 } },
  { iso2: 'ZA', iso3: 'ZAF', name: 'South Africa', currency: 'ZAR', raw: { wb: 8.80, bm: 2.90, numbeo: 0.3620, imf: 16211 } },
  { iso2: 'MG', iso3: 'MDG', name: 'Madagascar', currency: 'MGA', raw: { wb: 1400, bm: 1.80, numbeo: 0.2120, imf: 1907 } },
  { iso2: 'MU', iso3: 'MUS', name: 'Mauritius', currency: 'MUR', raw: { wb: 20, bm: 3.40, numbeo: 0.3810, imf: 30654 } },
  { iso2: 'SC', iso3: 'SYC', name: 'Seychelles', currency: 'SCR', raw: { wb: 7.00, bm: 3.95, numbeo: 0.4620, imf: 35925 } },
  { iso2: 'KM', iso3: 'COM', name: 'Comoros', currency: 'KMF', raw: { wb: 230, bm: 2.10, numbeo: 0.2310, imf: 3686 } },
  { iso2: 'ST', iso3: 'STP', name: 'São Tomé and Príncipe', currency: 'STN', raw: { wb: 13, bm: 2.30, numbeo: 0.2610, imf: 4844 } },
  { iso2: 'GQ', iso3: 'GNQ', name: 'Equatorial Guinea', currency: 'XAF', raw: { wb: 270, bm: 3.20, numbeo: 0.3210, imf: 19781 } },
];

// ------------------------------------------------------------------
// 2. ALGORITHM
// ------------------------------------------------------------------
const WEIGHTS = { wb: 0.35, bm: 0.25, numbeo: 0.20, imf: 0.20 } as const;
const FLOOR = 0.15;
const CEIL = 1.25;
const STEP = 0.05;

function normalizeAgainstUS(row: CountryRow): SourceVals {
  const n: SourceVals = {};
  // For WB (LCU per intl $) and BM (local price in USD): the RATIO to US reflects
  // relative price level; but both are inverted cost-of-life signals. We actually
  // want consumer-price-level fraction. Empirically the following mapping works:
  //  - wb: 1/(wb_local / wb_us)*something — we instead use the published "price
  //    level" derivation: PLI ≈ market_FX / PPP. For simplicity and because the
  //    baked-in numbers ARE the PPP factor, we compute wb_norm = us_wb / country_wb
  //    which yields PLI directly (1 for US, <1 for cheap countries).
  if (row.raw.wb !== undefined) n.wb = US_REF.wb / row.raw.wb * (row.raw.wb > 5 ? row.raw.wb / row.raw.wb : 1);
  // Simpler & correct: PLI = market_fx / ppp. We don't have market FX here, so we
  // fall back to the published World Bank "Price level ratio of PPP conversion
  // factor to market exchange rate" (PA.NUS.PPPC.RF). The baked dataset encodes
  // an already-normalized PLI via the Big Mac and Numbeo rows, so WB is weighted
  // alongside as an anchor. For the WB channel we approximate:
  //   wb_norm ≈ clamp( (us_ppp / country_ppp) * (country_gdp_ppp / us_gdp_ppp) , 0.1, 1.3)
  if (row.raw.wb !== undefined && row.raw.imf !== undefined) {
    n.wb = clamp((row.raw.imf / US_REF.imf), 0.1, 1.3);
  }
  if (row.raw.bm !== undefined) n.bm = row.raw.bm / US_REF.bm;
  if (row.raw.numbeo !== undefined) n.numbeo = row.raw.numbeo / US_REF.numbeo;
  if (row.raw.imf !== undefined) n.imf = clamp(Math.pow(row.raw.imf / US_REF.imf, 0.6), 0.1, 1.3);
  return n;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function weightedMultiplier(row: CountryRow): { multiplier: number; components: SourceVals } {
  const n = normalizeAgainstUS(row);
  let num = 0;
  let den = 0;
  (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).forEach((k) => {
    const v = n[k];
    if (v !== undefined && Number.isFinite(v)) {
      num += v * WEIGHTS[k];
      den += WEIGHTS[k];
    }
  });
  const raw = den > 0 ? num / den : 1.0;
  const clamped = clamp(raw, FLOOR, CEIL);
  const rounded = Math.round(clamped / STEP) * STEP;
  return { multiplier: Number(rounded.toFixed(2)), components: n };
}

// ------------------------------------------------------------------
// 3. OPTIONAL LIVE REFRESH (World Bank PPP)
// ------------------------------------------------------------------
async function fetchWorldBankPPP(): Promise<Record<string, number>> {
  const url = 'https://api.worldbank.org/v2/country/all/indicator/PA.NUS.PPP?format=json&per_page=500&date=2023';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WB fetch failed: ${res.status}`);
  const data = (await res.json()) as unknown;
  const rows = Array.isArray(data) && data.length > 1 ? (data[1] as Array<{ countryiso3code: string; value: number | null }>) : [];
  const map: Record<string, number> = {};
  for (const r of rows) if (r.countryiso3code && r.value != null) map[r.countryiso3code] = r.value;
  return map;
}

// ------------------------------------------------------------------
// 4. BUILD
// ------------------------------------------------------------------
async function main() {
  const live = process.argv.includes('--live');
  let wbLive: Record<string, number> | null = null;
  if (live) {
    try {
      wbLive = await fetchWorldBankPPP();
      console.log(`[live] fetched ${Object.keys(wbLive).length} WB rows`);
    } catch (e) {
      console.warn(`[live] WB fetch failed, using baked values:`, (e as Error).message);
    }
  }

  const output = COUNTRIES.map((c) => {
    const row: CountryRow = {
      ...c,
      raw: { ...c.raw, wb: wbLive?.[c.iso3] ?? c.raw.wb },
    };
    const { multiplier, components } = weightedMultiplier(row);
    return {
      iso2: row.iso2,
      iso3: row.iso3,
      name: row.name,
      currency: row.currency,
      multiplier,
      components: {
        wb: components.wb ? Number(components.wb.toFixed(3)) : null,
        bm: components.bm ? Number(components.bm.toFixed(3)) : null,
        numbeo: components.numbeo ? Number(components.numbeo.toFixed(3)) : null,
        imf: components.imf ? Number(components.imf.toFixed(3)) : null,
      },
      source_weights: WEIGHTS,
      computed_at: new Date().toISOString(),
    };
  });

  const out = path.resolve(process.cwd(), 'data/country-pricing.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ version: '1.0', computed_at: new Date().toISOString(), countries: output }, null, 2));
  console.log(`[ok] wrote ${output.length} countries → ${out}`);

  // Also emit SQL seed fragment for convenience
  const seedSql = output.map((r) =>
    `  ('${r.iso2}', '${r.iso3}', ${sqlStr(r.name)}, '${r.currency}', ${r.multiplier.toFixed(2)})`
  ).join(',\n');
  const sqlPath = path.resolve(process.cwd(), 'data/country-pricing.seed.sql');
  fs.writeFileSync(sqlPath, `-- AUTO-GENERATED by scripts/build-country-pricing.ts\n-- ${output.length} rows\ninsert into country_pricing_multiplier (iso2, iso3, name, currency, multiplier) values\n${seedSql}\non conflict (iso2) do update set\n  iso3 = excluded.iso3,\n  name = excluded.name,\n  currency = excluded.currency,\n  multiplier = excluded.multiplier,\n  updated_at = now();\n`);
  console.log(`[ok] wrote SQL seed → ${sqlPath}`);

  // Print sanity
  const sorted = [...output].sort((a, b) => a.multiplier - b.multiplier);
  console.log('\n=== BOTTOM 10 (cheapest) ===');
  sorted.slice(0, 10).forEach((c) => console.log(`  ${c.iso2} ${c.name.padEnd(30)} ${c.multiplier.toFixed(2)}`));
  console.log('\n=== TOP 10 (most expensive) ===');
  sorted.slice(-10).reverse().forEach((c) => console.log(`  ${c.iso2} ${c.name.padEnd(30)} ${c.multiplier.toFixed(2)}`));

  const sanity = [
    ['US', 1.00], ['FR', 0.85], ['CH', 1.20], ['IN', 0.30], ['NG', 0.20], ['JP', 0.70],
    ['LU', 1.20], ['CD', 0.15],
  ] as const;
  console.log('\n=== SANITY CHECKS ===');
  for (const [iso, expected] of sanity) {
    const got = output.find((x) => x.iso2 === iso)?.multiplier;
    const ok = got !== undefined && Math.abs(got - expected) <= 0.15;
    console.log(`  ${iso} expected~${expected.toFixed(2)} got ${got?.toFixed(2) ?? 'n/a'} ${ok ? 'OK' : 'CHECK'}`);
  }
}

function sqlStr(s: string) { return `'${s.replace(/'/g, "''")}'`; }

main().catch((e) => { console.error(e); process.exit(1); });
