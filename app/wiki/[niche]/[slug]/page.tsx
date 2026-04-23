import { createSupabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const revalidate = 86400

type ArticleStructure = {
  sections?: Array<{ heading: string; body: string }>
  faq?: Array<{ q: string; a: string }>
}

type ArticleSource = { title?: string; url: string }

type ArticleRow = {
  id: string
  niche_id: string
  slug: string
  lang: string
  title: string
  content: string
  structure: ArticleStructure
  sources: ArticleSource[]
  word_count: number | null
  published_at: string
}

type NicheRow = {
  slug: string
  title: Record<string, string>
}

async function loadArticle(
  nicheSlug: string,
  articleSlug: string,
  lang: string,
): Promise<{ article: ArticleRow; niche: NicheRow } | null> {
  const sb = createSupabaseAdmin()
  const { data: niche } = await sb
    .from('wiki_niches')
    .select('id, slug, title')
    .eq('slug', nicheSlug)
    .eq('status', 'live')
    .maybeSingle()
  if (!niche) return null
  const { data: article } = await sb
    .from('wiki_articles')
    .select('id, niche_id, slug, lang, title, content, structure, sources, word_count, published_at')
    .eq('niche_id', niche.id)
    .eq('slug', articleSlug)
    .eq('lang', lang)
    .not('published_at', 'is', null)
    .maybeSingle()
  if (!article) return null
  return { article: article as ArticleRow, niche: niche as NicheRow }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ niche: string; slug: string }>
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { niche: nicheSlug, slug: articleSlug } = await params
  const { lang = 'fr' } = await searchParams
  const loaded = await loadArticle(nicheSlug, articleSlug, lang)
  if (!loaded) return { title: 'Article introuvable' }
  const { article } = loaded
  return {
    title: article.title,
    description: article.content.slice(0, 160),
    openGraph: { title: article.title, type: 'article', publishedTime: article.published_at },
  }
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ niche: string; slug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { niche: nicheSlug, slug: articleSlug } = await params
  const { lang = 'fr' } = await searchParams
  const loaded = await loadArticle(nicheSlug, articleSlug, lang)
  if (!loaded) notFound()
  const { article, niche } = loaded
  const nicheTitle = niche.title?.fr || niche.title?.en || niche.slug

  return (
    <main className="min-h-screen bg-[#07090F] text-white">
      <article className="max-w-3xl mx-auto px-6 py-16">
        <nav className="mb-6 text-xs text-white/50">
          <Link href="/wiki" className="hover:text-white/80">Wiki</Link>
          <span className="mx-2">/</span>
          <Link href={`/wiki/${niche.slug}`} className="hover:text-white/80">{nicheTitle}</Link>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight mb-3">{article.title}</h1>
          <div className="text-xs text-white/50 tabular-nums">
            {article.word_count?.toLocaleString() ?? '?'} mots · {lang.toUpperCase()} · publié{' '}
            {new Date(article.published_at).toLocaleDateString('fr-FR')}
          </div>
        </header>

        <div className="prose prose-invert prose-lg max-w-none whitespace-pre-wrap leading-relaxed text-white/85">
          {article.content}
        </div>

        {article.structure?.faq && article.structure.faq.length > 0 && (
          <section className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-2xl font-semibold mb-6">FAQ</h2>
            <div className="space-y-4">
              {article.structure.faq.map((it, i) => (
                <details key={i} className="bg-white/3 border border-white/10 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium">{it.q}</summary>
                  <p className="mt-3 text-white/75">{it.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {article.sources && article.sources.length > 0 && (
          <section className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">Sources</h2>
            <ol className="space-y-2 text-sm">
              {article.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C9A84C] hover:underline break-all"
                  >
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </main>
  )
}
