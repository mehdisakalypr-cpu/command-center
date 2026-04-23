import { createSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const revalidate = 86400

type NicheRow = {
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  article_count: number
}

export const metadata: Metadata = {
  title: 'Wiki Farm — Guides ultra-verticaux',
  description: 'Collection de wikis micro-nichés générés et curés : café de spécialité, guitare manouche, freediving, et plus.',
}

export default async function WikiIndex() {
  const sb = createSupabaseAdmin()
  const { data: niches } = await sb
    .from('wiki_niches')
    .select('slug, title, description, article_count')
    .eq('status', 'live')
    .order('article_count', { ascending: false })
    .limit(100)

  const rows = (niches ?? []) as NicheRow[]

  return (
    <main className="min-h-screen bg-[#07090F] text-white">
      <section className="max-w-5xl mx-auto px-6 py-20">
        <header className="mb-12">
          <div className="text-xs uppercase tracking-widest text-[#C9A84C] mb-3">Wiki Farm</div>
          <h1 className="text-5xl font-semibold tracking-tight mb-4">Guides ultra-verticaux</h1>
          <p className="text-lg text-white/70 max-w-2xl">
            Micro-wikis multilingues, un domaine par niche. Sources citées, FAQ structurée, contenu long-form.
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="text-white/60 py-12 border border-dashed border-white/10 rounded-xl text-center">
            Aucun wiki publié pour l&apos;instant.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((n) => {
              const title = n.title?.fr || n.title?.en || n.slug
              const desc = n.description?.fr || n.description?.en || ''
              return (
                <Link
                  key={n.slug}
                  href={`/wiki/${n.slug}`}
                  className="block p-6 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 hover:border-[#C9A84C]/40 transition"
                >
                  <h2 className="text-xl font-medium mb-2">{title}</h2>
                  <p className="text-sm text-white/60 mb-3 line-clamp-2">{desc}</p>
                  <div className="text-xs text-white/40 tabular-nums">
                    {n.article_count} article{n.article_count > 1 ? 's' : ''}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
