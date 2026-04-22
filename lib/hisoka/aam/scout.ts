import { withFallback, extractJSON } from '@/lib/ai-pool/cascade';
import type { AutomationGap, Candidate } from './types';

const SYSTEM = `You are Mei Hatsume, a mad inventor scout. Given an automation gap, you compose narrow search queries to find existing tools that could close it. You return ranked candidates with one-line justifications. Strict JSON only.`;

const GH_SEARCH = 'https://api.github.com/search/repositories';
const HN_SEARCH = 'https://hn.algolia.com/api/v1/search';

export async function scoutCandidates(gap: AutomationGap, maxPerSource = 3): Promise<Candidate[]> {
  const prompt = `Gap on dimension "${gap.dim}": ${gap.description}. Propose 3 narrow search queries (GitHub repo topics/keywords that maximize finding mature tools that close this gap). Return JSON: { "queries": ["<q1>", "<q2>", "<q3>"] }`;
  const gen = await withFallback(
    // 1200 tokens — Gemini often wraps strict JSON in ```json fences + whitespace
    // that can push a 3-query payload past 400 tokens, causing mid-string
    // truncation that even repairTruncatedJSON can't recover (no closing `}`).
    { system: SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0.4, maxTokens: 1200 },
    { project: 'cc', order: ['gemini','mistral','groq','openrouter','anthropic'] },
  );
  // Strip markdown code fences defensively before parsing — Gemini sometimes
  // ignores "Strict JSON only" and wraps in ```json ... ```.
  const cleaned = gen.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = extractJSON<{ queries: string[] }>(cleaned);
  const queries = (parsed.queries ?? []).slice(0, 3);
  if (queries.length === 0) return [];

  const candidates: Candidate[] = [];

  for (const q of queries) {
    try {
      const url = `${GH_SEARCH}?q=${encodeURIComponent(q)}+stars:>=500+pushed:>2025-01-01&sort=stars&order=desc&per_page=${maxPerSource}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Hisoka-AAM/1.0',
          ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
      });
      if (!res.ok) continue;
      const data = await res.json() as { items?: Array<{ full_name: string; html_url: string; description: string; stargazers_count: number; pushed_at: string; language: string }> };
      for (const it of (data.items ?? []).slice(0, maxPerSource)) {
        candidates.push({
          source: 'github',
          url: it.html_url,
          title: `${it.full_name} — ${it.description ?? ''}`.slice(0, 200),
          stars: it.stargazers_count,
          last_commit_at: it.pushed_at,
          language: it.language,
          reason: `matches query "${q}"`,
        });
      }
    } catch { /* graceful */ }
  }

  for (const q of queries) {
    try {
      const url = `${HN_SEARCH}?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=${maxPerSource}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json() as { hits?: Array<{ title: string; url: string; points: number }> };
      for (const h of (data.hits ?? []).slice(0, maxPerSource)) {
        if (!h.url) continue;
        candidates.push({
          source: 'hn',
          url: h.url,
          title: h.title,
          score: h.points,
          reason: `HN discussion on "${q}"`,
        });
      }
    } catch { /* graceful */ }
  }

  const byUrl = new Map<string, Candidate>();
  for (const c of candidates) {
    const prev = byUrl.get(c.url);
    if (!prev || (c.stars ?? c.score ?? 0) > (prev.stars ?? prev.score ?? 0)) {
      byUrl.set(c.url, c);
    }
  }
  return Array.from(byUrl.values())
    .sort((a, b) => (b.stars ?? b.score ?? 0) - (a.stars ?? a.score ?? 0))
    .slice(0, 5);
}
