/**
 * Fetch CMS content from the shared cms_content table (site='estate').
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type CmsMap = Record<string, string>;

export async function getEstateCmsContent(
  collection: string
): Promise<CmsMap> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cms_content?site=eq.estate&collection=eq.${collection}&published=eq.true&order=order`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const map: CmsMap = {};
    for (const row of data) {
      map[row.slug] = row.value_fr || row.value_en;
    }
    return map;
  } catch {
    return {};
  }
}

export function cmsVal(cms: CmsMap, slug: string, fallback: string): string {
  return cms[slug] || fallback;
}
