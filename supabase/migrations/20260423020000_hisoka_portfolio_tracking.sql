-- Hisoka Portfolio Tracking (Ultra Instinct mode)
-- Adds build tracking to business_ideas + events timeline + power mode singleton

-- 1) Augment business_ideas with build tracking
ALTER TABLE business_ideas
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog','ready','in_progress','blocked','shipped')),
  ADD COLUMN IF NOT EXISTS progress_pct INTEGER NOT NULL DEFAULT 0
    CHECK (progress_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS estimate_days_min NUMERIC,
  ADD COLUMN IF NOT EXISTS estimate_days_max NUMERIC,
  ADD COLUMN IF NOT EXISTS estimate_confidence INTEGER
    CHECK (estimate_confidence BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS last_commit_sha TEXT,
  ADD COLUMN IF NOT EXISTS last_commit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hours_reuse NUMERIC,
  ADD COLUMN IF NOT EXISTS days_new_code NUMERIC,
  ADD COLUMN IF NOT EXISTS critical_path TEXT,
  ADD COLUMN IF NOT EXISTS human_gates TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reuse_bricks TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS business_ideas_status_idx ON business_ideas(status);
CREATE INDEX IF NOT EXISTS business_ideas_rank_idx ON business_ideas(rank);

-- 2) Build events timeline
CREATE TABLE IF NOT EXISTS hisoka_build_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES business_ideas(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('commit','checkpoint','blocked','unblocked','gate_hit','shipped','minato_scan','cron_tick','started','paused')),
  progress_pct INTEGER CHECK (progress_pct BETWEEN 0 AND 100),
  message TEXT,
  commit_sha TEXT,
  worker_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hisoka_build_events_idea_created_idx
  ON hisoka_build_events(idea_id, created_at DESC);

ALTER TABLE hisoka_build_events ENABLE ROW LEVEL SECURITY;

-- 3) Power mode singleton
CREATE TABLE IF NOT EXISTS cc_power_mode (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'shaka_33'
    CHECK (mode IN ('shaka_33','ultra_instinct')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_by TEXT,
  budget_cap_eur NUMERIC NOT NULL DEFAULT 100,
  workers_max INTEGER NOT NULL DEFAULT 1,
  daily_spend_cap_eur NUMERIC NOT NULL DEFAULT 1.5
);

ALTER TABLE cc_power_mode ENABLE ROW LEVEL SECURITY;

-- Seed singleton as ultra_instinct since user activated it now
INSERT INTO cc_power_mode (id, mode, activated_by, budget_cap_eur, workers_max, daily_spend_cap_eur)
VALUES (1, 'ultra_instinct', 'mehdi.sakalypr@gmail.com', 100, 3, 4)
ON CONFLICT (id) DO UPDATE SET
  mode = 'ultra_instinct',
  activated_at = NOW(),
  activated_by = 'mehdi.sakalypr@gmail.com',
  budget_cap_eur = 100,
  workers_max = 3,
  daily_spend_cap_eur = 4;

-- 4) Backfill estimates on top 10 ideas (by rank)
UPDATE business_ideas SET
  hours_reuse = 58, days_new_code = 18,
  estimate_days_min = 14, estimate_days_max = 35, estimate_confidence = 55,
  critical_path = 'Intégration Google/Meta Ads API + revenue-share tracking',
  human_gates = ARRAY['LLC_Wyoming','expat'],
  reuse_bricks = ARRAY['auth_webauthn','stripe_subs_tier','geo_pricing','llm_cascade','warm_outreach'],
  status = 'blocked', blocked_reason = 'LLC Wyoming + expat requis'
WHERE rank = 1;

UPDATE business_ideas SET
  hours_reuse = 58, days_new_code = 10,
  estimate_days_min = 8, estimate_days_max = 22, estimate_confidence = 70,
  critical_path = 'Compliance-matrix multi-juridictions + IDP/HRIS hooks',
  human_gates = ARRAY['LLC_SOC2'],
  reuse_bricks = ARRAY['llm_cascade','i18n','auth','stripe','geo_pricing'],
  status = 'blocked', blocked_reason = 'LLC + SOC2 commercial required'
WHERE rank = 2;

UPDATE business_ideas SET
  hours_reuse = 52, days_new_code = 12,
  estimate_days_min = 10, estimate_days_max = 24, estimate_confidence = 75,
  critical_path = 'Pipeline wiki content gen + SEO cluster manager',
  human_gates = ARRAY[]::TEXT[],
  reuse_bricks = ARRAY['scraper_oignon','llm_cascade','i18n','auth','stripe'],
  status = 'in_progress', started_at = NOW()
WHERE rank = 3;

UPDATE business_ideas SET
  hours_reuse = 56, days_new_code = 16,
  estimate_days_min = 12, estimate_days_max = 32, estimate_confidence = 60,
  critical_path = 'Orchestration Seedance/ElevenLabs + quota usage-based',
  human_gates = ARRAY['payment_keys','expat'],
  reuse_bricks = ARRAY['video_gen','llm_cascade','i18n','auth','geo_pricing'],
  status = 'in_progress', started_at = NOW()
WHERE rank = 4;

UPDATE business_ideas SET
  hours_reuse = 58, days_new_code = 14,
  estimate_days_min = 11, estimate_days_max = 28, estimate_confidence = 65,
  critical_path = 'Red-flag detection prompts + PDF redline renderer',
  human_gates = ARRAY['LLC','legal_review'],
  reuse_bricks = ARRAY['llm_cascade','dokho','auth','stripe','geo_pricing'],
  status = 'blocked', blocked_reason = 'LLC + revue juridique requise'
WHERE rank = 5;

UPDATE business_ideas SET
  hours_reuse = 60, days_new_code = 18,
  estimate_days_min = 14, estimate_days_max = 36, estimate_confidence = 55,
  critical_path = 'Intégrations Zendesk/Intercom/HelpScout + routing ML',
  human_gates = ARRAY['api_keys','LLC'],
  reuse_bricks = ARRAY['llm_cascade','i18n','auth','stripe','cc_fleet'],
  status = 'blocked', blocked_reason = 'LLC + API keys tierces'
WHERE rank = 6;

UPDATE business_ideas SET
  hours_reuse = 54, days_new_code = 10,
  estimate_days_min = 8, estimate_days_max = 22, estimate_confidence = 75,
  critical_path = 'Parsers OpenAPI/gRPC + interactive runner sandbox',
  human_gates = ARRAY[]::TEXT[],
  reuse_bricks = ARRAY['llm_cascade','i18n','auth','stripe','image_cascade'],
  status = 'in_progress', started_at = NOW()
WHERE rank = 7;

UPDATE business_ideas SET
  hours_reuse = 58, days_new_code = 12,
  estimate_days_min = 10, estimate_days_max = 26, estimate_confidence = 60,
  critical_path = 'Templates + veille réglementaire multi-juridictions',
  human_gates = ARRAY['LLC','legal_review'],
  reuse_bricks = ARRAY['dokho','llm_cascade','i18n','auth','stripe'],
  status = 'blocked', blocked_reason = 'LLC + legal review'
WHERE rank = 8;

UPDATE business_ideas SET
  hours_reuse = 60, days_new_code = 18,
  estimate_days_min = 14, estimate_days_max = 38, estimate_confidence = 50,
  critical_path = 'Ingestion data-rooms + scoring DD + PDF reports',
  human_gates = ARRAY['LLC','NDA'],
  reuse_bricks = ARRAY['scraper_oignon','llm_cascade','dokho','auth','geo_pricing'],
  status = 'blocked', blocked_reason = 'LLC + NDA client M&A'
WHERE rank = 9;

UPDATE business_ideas SET
  hours_reuse = 54, days_new_code = 16,
  estimate_days_min = 12, estimate_days_max = 32, estimate_confidence = 60,
  critical_path = 'Builder no-code UI + NLP multi-langue + widget embed',
  human_gates = ARRAY['GDPR_hosting','expat'],
  reuse_bricks = ARRAY['llm_cascade','i18n','auth','stripe','image_cascade'],
  status = 'backlog', blocked_reason = 'Hébergement GDPR + expat'
WHERE rank = 10;

-- 5) Seed "started" events for the 3 active workers
INSERT INTO hisoka_build_events (idea_id, event_type, progress_pct, message, worker_id)
SELECT id, 'started', 10, 'Ultra Instinct ON — worker assigned, spec checkpoint', 'ultra-instinct-worker-' || rank::TEXT
FROM business_ideas WHERE rank IN (3, 4, 7);
