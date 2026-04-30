/**
 * Hisoka Signal Harvester — Phase 2
 * Fetches real-time trend signals from HN, Reddit, and YC RFS in parallel.
 * Never throws: each source fails gracefully with console.warn + empty array.
 */

export interface Signal {
  source: 'hn' | 'reddit' | 'yc_rfs';
  title: string;
  url?: string;
  tag?: string;
  score?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** Wraps fetch with an AbortController timeout. */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Source: Hacker News (Algolia API — no auth required)
// ---------------------------------------------------------------------------
async function fetchHN(timeoutMs: number): Promise<Signal[]> {
  try {
    const res = await fetchWithTimeout(
      'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30',
      {},
      timeoutMs,
    );
    if (!res.ok) throw new Error(`HN API ${res.status}`);
    const json = await res.json() as {
      hits: Array<{ title?: string; url?: string; points?: number }>;
    };
    return (json.hits ?? [])
      .filter(h => h.title)
      .map(h => ({
        source: 'hn' as const,
        title: h.title!,
        url: h.url,
        score: h.points,
      }));
  } catch (err) {
    console.warn('[hisoka/harvester] HN fetch failed:', String(err));
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: Reddit multi-subreddit (public JSON API)
// ---------------------------------------------------------------------------
const DEFAULT_SUBS = 'startups+SaaS+Entrepreneur';
async function fetchReddit(timeoutMs: number, subs: string = DEFAULT_SUBS): Promise<Signal[]> {
  try {
    const res = await fetchWithTimeout(
      `https://www.reddit.com/r/${subs}/top.json?t=week&limit=30`,
      { headers: { 'User-Agent': 'Hisoka-Hunter/1.0' } },
      timeoutMs,
    );
    if (!res.ok) throw new Error(`Reddit API ${res.status}`);
    const json = await res.json() as {
      data: {
        children: Array<{
          data: { title?: string; url?: string; score?: number; over_18?: boolean };
        }>;
      };
    };
    return (json.data?.children ?? [])
      .map(c => c.data)
      .filter(d => d.title && !d.over_18)
      .map(d => ({
        source: 'reddit' as const,
        title: d.title!,
        url: d.url,
        score: d.score,
      }));
  } catch (err) {
    console.warn('[hisoka/harvester] Reddit fetch failed:', String(err));
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source: YC Request for Startups (public HTML, regex-only, no jsdom)
// ---------------------------------------------------------------------------
async function fetchYCRFS(timeoutMs: number): Promise<Signal[]> {
  try {
    const res = await fetchWithTimeout(
      'https://www.ycombinator.com/rfs',
      { headers: { 'User-Agent': 'Hisoka-Hunter/1.0' } },
      timeoutMs,
    );
    if (!res.ok) throw new Error(`YC RFS ${res.status}`);
    const html = await res.text();
    // Extract text inside <h3> tags (strip any inner tags, decode basic entities)
    const matches = [...html.matchAll(/<h3[^>]*>([\s\S]+?)<\/h3>/gi)];
    return matches
      .map(m => {
        // Strip inner HTML tags and decode basic HTML entities
        const raw = m[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim();
        return raw;
      })
      .filter(t => t.length > 3)
      .slice(0, 20)
      .map(title => ({
        source: 'yc_rfs' as const,
        title,
      }));
  } catch (err) {
    console.warn('[hisoka/harvester] YC RFS fetch failed:', String(err));
    return [];
  }
}

// ---------------------------------------------------------------------------
// Vertical seed packs — feed a domain-specific subreddit cluster to bias
// LLM ideation toward agriculture, healthcare, fintech, real-estate, ESG.
// Used when discovery is invoked with ?vertical=<slug>.
// ---------------------------------------------------------------------------
const VERTICAL_SUBS: Record<string, string> = {
  agriculture: 'agriculture+farming+homestead+precisionagriculture',
  healthcare: 'medicine+healthIT+nursing+publichealth+digitalhealth',
  fintech: 'fintech+CryptoCurrency+investing+personalfinance+banking',
  realestate: 'realestate+commercialrealestate+RealEstateTechnology+landlord',
  esg: 'sustainability+climatechange+RenewableEnergy+ESG+climate',
  trade: 'logistics+supplychain+freight+shipping+ecommerce',
  legal: 'law+Lawyertalk+LegalAdvice+compliance',
  ecommerce: 'ecommerce+shopify+amazon+FulfillmentByAmazon+ecom',
  hr: 'humanresources+recruiting+managers+AskHR',
  education: 'edtech+education+OnlineLearning+teaching',
};

// ---------------------------------------------------------------------------
// Main: harvestSignals
// ---------------------------------------------------------------------------
export async function harvestSignals(
  { timeoutMs = DEFAULT_TIMEOUT_MS, vertical }: { timeoutMs?: number; vertical?: string } = {},
): Promise<Signal[]> {
  const subs = vertical && VERTICAL_SUBS[vertical] ? VERTICAL_SUBS[vertical] : DEFAULT_SUBS;
  const [hnResult, redditResult, ycResult] = await Promise.allSettled([
    fetchHN(timeoutMs),
    fetchReddit(timeoutMs, subs),
    fetchYCRFS(timeoutMs),
  ]);

  const hnSignals = hnResult.status === 'fulfilled' ? hnResult.value : [];
  const redditSignals = redditResult.status === 'fulfilled' ? redditResult.value : [];
  const ycSignals = ycResult.status === 'fulfilled' ? ycResult.value : [];

  // Log rejected promise branches (shouldn't happen — each inner fn catches — but defensive)
  if (hnResult.status === 'rejected') console.warn('[hisoka/harvester] HN promise rejected:', hnResult.reason);
  if (redditResult.status === 'rejected') console.warn('[hisoka/harvester] Reddit promise rejected:', redditResult.reason);
  if (ycResult.status === 'rejected') console.warn('[hisoka/harvester] YC promise rejected:', ycResult.reason);

  const all = [...hnSignals, ...redditSignals, ...ycSignals];

  // Deduplicate by lowercase title
  const seen = new Set<string>();
  const deduped: Signal[] = [];
  for (const s of all) {
    const key = s.title.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
  }

  // Sort: signals with score DESC first, then unscored
  deduped.sort((a, b) => {
    if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
    if (a.score !== undefined) return -1;
    if (b.score !== undefined) return 1;
    return 0;
  });

  // Cap at 60
  return deduped.slice(0, 60);
}
