/**
 * Portfolio products registry — one row per shipped SaaS in the
 * gapup.io / ftg / ofa portfolio. Used by the autonomous page builder
 * (Vercel cron → portfolio_build_jobs queue → GitHub push) to know
 * where to write generated pages and which design tokens to apply.
 */

export type PortfolioProduct = {
  slug: string
  name: string
  tagline: string
  description: string
  colorPrimary: string
  colorAccent: string
  colorBg: string
  baseUrl: string
  repoOwner: string
  repoName: string
  repoBranch: string
  appDir: string
}

export const PORTFOLIO_PRODUCTS: PortfolioProduct[] = [
  {
    slug: 'aici',
    name: 'AICI',
    tagline: 'AI Competitive Intelligence Reporter',
    description: 'Snapshots competitor pricing, blog, careers, then digests the moves into a 5-minute weekly read for product/marketing teams.',
    colorPrimary: '#7C3AED',
    colorAccent: '#06B6D4',
    colorBg: '#0F0A1F',
    baseUrl: 'https://aici-flame.vercel.app',
    repoOwner: 'mehdisakalypr-cpu',
    repoName: 'aici',
    repoBranch: 'main',
    appDir: 'app',
  },
  {
    slug: 'aiplb',
    name: 'IP Licensing Bot',
    tagline: 'Autonomous IP licensing agent',
    description: 'Tracks who is using your patented IP across the open web, drafts cease-and-desist letters, and offers them a click-through commercial license.',
    colorPrimary: '#10B981',
    colorAccent: '#FBBF24',
    colorBg: '#06140E',
    baseUrl: 'https://aiplb.vercel.app',
    repoOwner: 'mehdisakalypr-cpu',
    repoName: 'aiplb',
    repoBranch: 'main',
    appDir: 'app',
  },
  {
    slug: 'ancf',
    name: 'Niche Content Forge',
    tagline: 'Vertical-specific content engine',
    description: 'Picks an under-served niche, mines the language of its forums, and ships SEO-optimised long-form content faster than the human writer can.',
    colorPrimary: '#F43F5E',
    colorAccent: '#0EA5E9',
    colorBg: '#1A0810',
    baseUrl: 'https://ancf.vercel.app',
    repoOwner: 'mehdisakalypr-cpu',
    repoName: 'ancf',
    repoBranch: 'main',
    appDir: 'app',
  },
]

export function getProduct(slug: string): PortfolioProduct | null {
  return PORTFOLIO_PRODUCTS.find((p) => p.slug === slug) ?? null
}

export type PageType =
  | 'home'
  | 'services'
  | 'offres'
  | 'faq'
  | 'contact'
  | 'demo'
  | 'cgu'
  | 'cgv'
  | 'mentions-legales'
  | 'privacy'

export const PAGE_TYPES: PageType[] = [
  'home', 'services', 'offres', 'faq', 'contact', 'demo',
  'cgu', 'cgv', 'mentions-legales', 'privacy',
]

export function pagePath(pageType: PageType, appDir: string): string {
  if (pageType === 'home') return `${appDir}/page.tsx`
  if (pageType === 'cgu' || pageType === 'cgv' || pageType === 'mentions-legales' || pageType === 'privacy') {
    return `${appDir}/legal/${pageType}/page.tsx`
  }
  return `${appDir}/${pageType}/page.tsx`
}
