import { createSupabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const revalidate = 86400

type NicheRow = {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  meta_keywords: string[]
  article_count: number
}

type ArticleRow = {
  slug: string
  lang: string
  title: string
  word_count: number | null
  published_at: string
}

async function loadNiche(slug: string): Promise<{ niche: NicheRow; articles: ArticleRow[] } | null> {
  const sb = createSupabaseAdmin()
  const { data: niche } = await sb
    .from('wiki_niches')
    .select('id, slug, title, description, meta_keywords, article_count')
    .eq('slug', slug)
    .eq('status', 'live')
    .maybeSingle()
  if (!niche) return null
  const { data: articles } = await sb
    .from('wiki_articles')
    .select('slug, lang, title, word_count, published_at')
    .eq('niche_id', niche.id)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(200)
  return { niche: niche as NicheRow, articles: (articles ?? []) as ArticleRow[] }
}

export async function generateMetadata({ params }: { params: Promise<{ niche: string }> }): Promise<Metadata> {
  const { niche: slug } = await params
  const loaded = await loadNiche(slug)
  if (!loaded) return { title: 'Wiki introuvable' }
  const { niche } = loaded
  const title = niche.title?.fr || niche.title?.en || niche.slug
  const description = niche.description?.fr || niche.description?.en || ''
  return {
    title,
    description,
    keywords: niche.meta_keywords,
    openGraph: { title, description, type: 'website' },
  }
}

export default async function NichePage({ params }: { params: Promise<{ niche: string }> }) {
  const { niche: slug } = await params
  const loaded = await loadNiche(slug)
  if (!loaded) notFound()
  const { niche, articles } = loaded
  const title = niche.title?.fr || niche.title?.en || niche.slug
  const description = niche.description?.fr || niche.description?.en || ''

  return (
    <main className="min-h-screen bg-[#07090F] text-white">
      <article className="max-w-5xl mx-auto px-6 py-16">
        <nav className="mb-8 text-xs text-white/50">
          <Link href="/wiki" className="hover:text-white/80">Wiki</Link>
          <span className="mx-2">/</span>
          <span className="text-white/80">{niche.slug}</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-5xl font-semibold tracking-tight mb-4">{title}</h1>
          <p className="text-lg text-white/70 max-w-3xl">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {niche.meta_keywords?.slice(0, 8).map((kw) => (
              <span key={kw} className="text-[11px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                {kw}
              </span>
            ))}
          </div>
        </header>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">
            Articles ({articles.length})
          </h2>
          {articles.length === 0 ? (
            <p className="text-white/60 py-8 border border-dashed border-white/10 rounded-xl text-center">
              Aucun article publié pour l&apos;instant. Le contenu arrive prochainement.
            </p>
          ) : (
            <ul className="space-y-2">
              {articles.map((a) => (
                <li key={`${a.slug}-${a.lang}`}>
                  <Link
                    href={`/wiki/${niche.slug}/${a.slug}?lang=${a.lang}`}
                    className="flex items-baseline justify-between gap-4 py-3 px-4 rounded-lg hover:bg-white/3 transition border border-transparent hover:border-white/10"
                  >
                    <span className="text-white/90">{a.title}</span>
                    <span className="text-xs text-white/40 tabular-nums">
                      {a.word_count ? `${a.word_count.toLocaleString()} mots` : ''} · {a.lang}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  )
}
