-- Wiki Farm migration — checkpoint 20% (Hisoka rank #3)
-- Tables: wiki_niches, wiki_articles, wiki_clusters, wiki_scrape_cache

CREATE TABLE IF NOT EXISTS wiki_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title JSONB NOT NULL DEFAULT '{}',
  description JSONB NOT NULL DEFAULT '{}',
  meta_keywords TEXT[] DEFAULT '{}',
  tier_access TEXT NOT NULL DEFAULT 'free' CHECK (tier_access IN ('free','premium')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','paused')),
  article_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wiki_niches_status_idx ON wiki_niches(status);

CREATE TABLE IF NOT EXISTS wiki_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id UUID NOT NULL REFERENCES wiki_niches(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  structure JSONB NOT NULL DEFAULT '{}',
  sources JSONB NOT NULL DEFAULT '[]',
  quality_score NUMERIC,
  word_count INTEGER,
  cost_eur NUMERIC DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(niche_id, slug, lang)
);
CREATE INDEX IF NOT EXISTS wiki_articles_niche_lang_idx ON wiki_articles(niche_id, lang);

CREATE TABLE IF NOT EXISTS wiki_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id UUID NOT NULL REFERENCES wiki_niches(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  authority_score NUMERIC DEFAULT 0,
  article_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wiki_scrape_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  key TEXT NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(source, key)
);
CREATE INDEX IF NOT EXISTS wiki_scrape_cache_expiry_idx ON wiki_scrape_cache(expires_at);

ALTER TABLE wiki_niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_scrape_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wiki_niches' AND policyname='public read live niches') THEN
    CREATE POLICY "public read live niches" ON wiki_niches
      FOR SELECT USING (status = 'live');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wiki_articles' AND policyname='public read published articles') THEN
    CREATE POLICY "public read published articles" ON wiki_articles
      FOR SELECT USING (published_at IS NOT NULL);
  END IF;
END $$;
