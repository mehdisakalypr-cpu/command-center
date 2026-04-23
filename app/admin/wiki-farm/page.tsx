'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-v2/client-fetch'

const GOLD = '#C9A84C'
const BG = '#040D1C'
const FG = '#E8E0D0'
const DIM = '#7D8BA0'

type Niche = {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  tier_access: 'free' | 'premium'
  status: 'draft' | 'live' | 'paused'
  article_count: number
  created_at: string
}

type ArticleRow = {
  id: string
  niche_id: string
  slug: string
  lang: string
  title: string
  word_count: number | null
  quality_score: number | null
  cost_eur: number
  published_at: string | null
  generated_at: string
}

type Tab = 'niches' | 'articles' | 'quality'

export default function WikiFarmAdmin() {
  const [tab, setTab] = useState<Tab>('niches')
  const [niches, setNiches] = useState<Niche[]>([])
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [publishMsg, setPublishMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([
      authFetch('/api/admin/wiki-farm/niches').then((r) => r.json()),
      authFetch('/api/admin/wiki-farm/articles?limit=100').then((r) => r.json()).catch(() => ({ articles: [] })),
    ])
      .then(([n, a]) => {
        if (cancelled) return
        setNiches(n.niches ?? [])
        setArticles(a.articles ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function publishArticle(id: string) {
    setPublishing(id)
    setPublishMsg((m) => ({ ...m, [id]: '…' }))
    try {
      const r = await authFetch(`/api/wiki/publish/${id}`, { method: 'POST' })
      const j = await r.json()
      if (r.ok && j.ok) {
        setPublishMsg((m) => ({ ...m, [id]: `✅ publié (q=${j.quality_score})` }))
        setArticles((a) =>
          a.map((x) =>
            x.id === id ? { ...x, published_at: new Date().toISOString() } : x,
          ),
        )
      } else {
        setPublishMsg((m) => ({
          ...m,
          [id]: `❌ ${(j.failures ?? [j.error ?? 'refusé']).join(' · ')}`,
        }))
      }
    } catch (e) {
      setPublishMsg((m) => ({ ...m, [id]: `❌ ${String(e)}` }))
    } finally {
      setPublishing(null)
    }
  }

  const totalArticles = articles.length
  const publishedCount = articles.filter((a) => a.published_at).length
  const avgQuality =
    articles.length > 0
      ? (
          articles.reduce((s, a) => s + (a.quality_score ?? 0), 0) /
          articles.length
        ).toFixed(2)
      : '—'
  const totalCost = articles.reduce((s, a) => s + (a.cost_eur ?? 0), 0).toFixed(2)

  return (
    <div
      style={{
        padding: 24,
        minHeight: '100vh',
        background: BG,
        color: FG,
        fontFamily:
          "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: '.7rem',
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Wiki Farm · Hisoka #3
        </div>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>
          Portfolio multilingue SEO — niches × articles × qualité
        </h1>
        <p style={{ fontSize: '.72rem', color: DIM, marginTop: 6 }}>
          Génération cascade IA, gates qualité, publish manuel ou cron. Spec:{' '}
          <code>docs/superpowers/specs/2026-04-23-wiki-farm.md</code>
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Stat label="Niches" value={String(niches.length)} />
        <Stat label="Articles" value={String(totalArticles)} />
        <Stat
          label="Publiés"
          value={`${publishedCount}/${totalArticles}`}
        />
        <Stat label="Qualité moy." value={String(avgQuality)} />
      </div>

      <nav style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['niches', 'articles', 'quality'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? GOLD : 'transparent',
              color: tab === t ? BG : FG,
              border: `1px solid ${GOLD}`,
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '.75rem',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {loading && <div style={{ color: DIM }}>Chargement…</div>}
      {error && <div style={{ color: '#E06A6A' }}>Erreur: {error}</div>}

      {!loading && !error && tab === 'niches' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {niches.map((n) => (
            <div
              key={n.id}
              style={{
                padding: 12,
                background: '#0A1628',
                border: '1px solid #1A2940',
                borderRadius: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '.9rem', color: GOLD }}>
                  {n.title?.fr ?? n.slug}
                </div>
                <div style={{ fontSize: '.7rem', color: DIM }}>
                  {n.slug} · {n.article_count} articles · {n.tier_access} · {n.status}
                </div>
              </div>
              <Link
                href={`/wiki/${n.slug}`}
                style={{ color: GOLD, fontSize: '.72rem' }}
              >
                → /wiki/{n.slug}
              </Link>
            </div>
          ))}
          {niches.length === 0 && (
            <div style={{ color: DIM }}>Aucune niche seedée.</div>
          )}
        </div>
      )}

      {!loading && !error && tab === 'articles' && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              fontSize: '.7rem',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ color: GOLD, textAlign: 'left' }}>
                <th style={{ padding: 6 }}>Titre</th>
                <th style={{ padding: 6 }}>Lang</th>
                <th style={{ padding: 6 }}>Mots</th>
                <th style={{ padding: 6 }}>Qualité</th>
                <th style={{ padding: 6 }}>Coût</th>
                <th style={{ padding: 6 }}>Statut</th>
                <th style={{ padding: 6 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} style={{ borderTop: '1px solid #1A2940' }}>
                  <td style={{ padding: 6 }}>{a.title}</td>
                  <td style={{ padding: 6 }}>{a.lang}</td>
                  <td style={{ padding: 6 }}>{a.word_count ?? '—'}</td>
                  <td style={{ padding: 6 }}>{a.quality_score ?? '—'}</td>
                  <td style={{ padding: 6 }}>€{a.cost_eur?.toFixed(2)}</td>
                  <td style={{ padding: 6 }}>
                    {a.published_at ? (
                      <span style={{ color: '#7CE073' }}>✓ live</span>
                    ) : (
                      <span style={{ color: DIM }}>draft</span>
                    )}
                  </td>
                  <td style={{ padding: 6 }}>
                    {!a.published_at && (
                      <button
                        disabled={publishing === a.id}
                        onClick={() => publishArticle(a.id)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${GOLD}`,
                          color: GOLD,
                          padding: '2px 8px',
                          cursor: 'pointer',
                          fontSize: '.65rem',
                        }}
                      >
                        Publier
                      </button>
                    )}
                    {publishMsg[a.id] && (
                      <div
                        style={{
                          fontSize: '.6rem',
                          color: DIM,
                          marginTop: 2,
                        }}
                      >
                        {publishMsg[a.id]}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {articles.length === 0 && (
            <div style={{ color: DIM, padding: 8 }}>Aucun article.</div>
          )}
        </div>
      )}

      {!loading && !error && tab === 'quality' && (
        <div
          style={{
            padding: 12,
            background: '#0A1628',
            border: '1px solid #1A2940',
            borderRadius: 4,
          }}
        >
          <div style={{ fontSize: '.75rem', marginBottom: 8, color: GOLD }}>
            Gates de publication
          </div>
          <ul style={{ fontSize: '.7rem', color: DIM, lineHeight: 1.7 }}>
            <li>Mots ≥ 1800 · FAQ ≥ 5 · Sources HTTP 200 ≥ 3</li>
            <li>Dedup Jaccard &lt; 0.4 vs articles même niche</li>
            <li>Quality score LLM-as-judge ≥ 0.7 (clarté × structure × véracité)</li>
          </ul>
          <div
            style={{
              marginTop: 16,
              fontSize: '.7rem',
              color: FG,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}
          >
            <div>
              <div style={{ color: GOLD }}>Coût total</div>
              <div style={{ fontSize: '1.1rem' }}>€{totalCost}</div>
            </div>
            <div>
              <div style={{ color: GOLD }}>Publiés</div>
              <div style={{ fontSize: '1.1rem' }}>
                {publishedCount}/{totalArticles}
              </div>
            </div>
            <div>
              <div style={{ color: GOLD }}>Qualité moy.</div>
              <div style={{ fontSize: '1.1rem' }}>{avgQuality}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        background: '#0A1628',
        border: '1px solid #1A2940',
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontSize: '.65rem',
          color: GOLD,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.3rem', color: FG, marginTop: 4 }}>{value}</div>
    </div>
  )
}
