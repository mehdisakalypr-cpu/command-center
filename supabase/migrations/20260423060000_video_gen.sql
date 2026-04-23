-- Video Gen (Hisoka #4 portfolio) — 2026-04-23
-- Tables: video_jobs, video_scenes, video_templates, video_usage_logs
-- Strategy: freemium + flat €49 tier (skip Stripe metered, bypass payment_keys gate)

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','scripting','scene_gen','voice_gen','assembling','completed','failed','cancelled')),
  brief TEXT NOT NULL,
  tone TEXT,
  duration_s INTEGER,
  language TEXT NOT NULL DEFAULT 'fr',
  resolution TEXT NOT NULL DEFAULT '720p' CHECK (resolution IN ('480p','720p','1080p','4k')),
  ratio TEXT NOT NULL DEFAULT '16:9' CHECK (ratio IN ('16:9','9:16','1:1')),
  scenes_json JSONB,
  cost_eur NUMERIC DEFAULT 0,
  output_url TEXT,
  error_message TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS video_jobs_user_idx ON video_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_jobs(status) WHERE status IN ('pending','scripting','scene_gen','voice_gen','assembling');

CREATE TABLE IF NOT EXISTS video_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  media_url TEXT,
  voiceover_text TEXT,
  voiceover_url TEXT,
  duration_s NUMERIC,
  provider TEXT,
  cost_eur NUMERIC DEFAULT 0,
  generated_at TIMESTAMPTZ,
  UNIQUE(job_id, seq)
);

CREATE TABLE IF NOT EXISTS video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('explainer','product_demo','testimonial','ads','educational','story')),
  structure JSONB NOT NULL,
  default_duration_s INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  month TEXT NOT NULL,
  videos_count INTEGER NOT NULL DEFAULT 0,
  total_seconds NUMERIC DEFAULT 0,
  total_cost_eur NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

INSERT INTO video_templates (slug, name, category, structure, default_duration_s) VALUES
  ('explainer-60s', 'Explainer 60s', 'explainer',
   '{"scenes":[{"type":"hook","duration":5},{"type":"problem","duration":15},{"type":"solution","duration":25},{"type":"proof","duration":10},{"type":"cta","duration":5}]}'::jsonb, 60),
  ('product-demo-90s', 'Product Demo 90s', 'product_demo',
   '{"scenes":[{"type":"context","duration":10},{"type":"feature-1","duration":25},{"type":"feature-2","duration":25},{"type":"feature-3","duration":20},{"type":"cta","duration":10}]}'::jsonb, 90),
  ('testimonial-30s', 'Testimonial 30s', 'testimonial',
   '{"scenes":[{"type":"intro","duration":5},{"type":"quote","duration":20},{"type":"outro","duration":5}]}'::jsonb, 30),
  ('tiktok-ad-15s', 'TikTok Ad 15s', 'ads',
   '{"scenes":[{"type":"hook","duration":3},{"type":"value","duration":8},{"type":"cta","duration":4}]}'::jsonb, 15)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_usage_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_templates' AND policyname='public read templates') THEN
    CREATE POLICY "public read templates" ON video_templates FOR SELECT USING (TRUE);
  END IF;
END$$;
