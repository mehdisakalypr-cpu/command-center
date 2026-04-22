import { withFallback, extractJSON, stripPreamble, STRICT_JSON_DIRECTIVE } from '@/lib/ai-pool/cascade';
import type { AutomationGap, Candidate } from './types';

const SYSTEM = `You are Mei Hatsume, a mad inventor scout. Given an automation gap, you compose narrow search queries to find existing tools that could close it.${STRICT_JSON_DIRECTIVE}`;

const GH_SEARCH = 'https://api.github.com/search/repositories';
const HN_SEARCH = 'https://hn.algolia.com/api/v1/search';

export async function scoutCandidates(gap: AutomationGap, maxPerSource = 3): Promise<Candidate[]> {
  const prompt = `Gap on dimension "${gap.dim}": ${gap.description}. Propose 2 narrow search queries (GitHub repo topics/keywords that maximize finding mature tools that close this gap). Output: { "queries": ["<q1>", "<q2>"] }`;
  const gen = await withFallback(
    // 2400 tokens — covers Gemini's occasional preamble prose despite "JSON only".
    // If prose eats 1000 tokens, 1400 remain for the payload which is plenty.
    { system: SYSTEM, prompt, model: 'llama-4-scout-17b-16e-instruct', temperature: 0.4, maxTokens: 2400 },
    { project: 'cc', order: ['gemini','mistral','groq','openrouter','anthropic'] },
  );
  const parsed = extractJSON<{ queries: string[] }>(stripPreamble(gen.text));
  const queries = (parsed.queries ?? []).slice(0, 2);
  if (queries.length === 0) return [];

  const candidates: Candidate[] = [];

  for (const q of queries) {
    try {
      // Filter widened: stars:>=100 (was 500) + pushed:>2024-01-01 (was 2025-01-01).
      // The previous filter was so strict that most LLM-generated queries returned
      // zero matches, causing "no candidates found" on valid gaps.
      const url = `${GH_SEARCH}?q=${encodeURIComponent(q)}+stars:>=100+pushed:>2024-01-01&sort=stars&order=desc&per_page=${maxPerSource}`;
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
