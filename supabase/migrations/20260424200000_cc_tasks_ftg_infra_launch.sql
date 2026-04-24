-- FTG launch infra tasks — scalability + zero-downtime + auto cost controls.
-- Why: pre-launch window. Visitors must never experience interruption.
-- Structure: critical for go-live blockers, high for must-have-before-launch,
-- medium for nice-to-have, low for post-launch optimizations.

insert into cc_tasks (project, category, owner, priority, status, title, description, url, platform, tags)
select project, category, owner, priority, status, title, description, url, platform, tags from (values

-- ═════════════════ CAPACITY / LOAD ═════════════════
('ftg','infra','claude','critical','pending',
  'Load test k6 / Artillery — 1000 RPS sur endpoints publics',
  'Scénarios: GET /, /marketplace, /reports/[iso], /api/marketplace/market-pulse. Seuil: p95 < 400ms, p99 < 1s, erreurs < 0.1%. Run avant tout push marketing.',
  null,'api',array['launch','critical-path']),

('ftg','infra','claude','critical','pending',
  'Vercel Fluid Compute activé + monitoring',
  'Vérifier plan Vercel supporte scale auto. Fluid Compute réduit cold starts. Confirmer max concurrent invocations + budget alerts.',
  'https://vercel.com/dashboard/settings/general','api',array['launch','vercel']),

('ftg','infra','claude','high','pending',
  'Supabase — vérifier tier + connection pooler',
  'Pro tier minimum pour RLS perf + 200 connexions. PgBouncer en transaction mode sur port 6543. Check max_connections + pool_size.',
  'https://supabase.com/dashboard/project/jebuagyeapkltyjitosm/settings/database','api',array['launch','db']),

('ftg','infra','claude','high','pending',
  'Index audit — EXPLAIN ANALYZE sur top 10 requêtes',
  'Endpoints chauds : /marketplace list volumes/demands, /reports/[iso], /api/marketplace/market-pulse. Chercher seq scan sur tables > 10k rows. Ajouter index manquants.',
  null,'api',array['launch','db','perf']),

('ftg','infra','claude','high','pending',
  'Runtime Cache Vercel sur APIs publiques hot-path',
  'Market Pulse (1h), /api/reports/[iso] (24h + tag invalidation), /api/countries (static). Tag-based invalidation après UPDATE DB.',
  null,'api',array['launch','cache']),

-- ═════════════════ AUTO SCALING WORKERS ═════════════════
('ftg','infra','claude','high','pending',
  'Scout-queue VPS : auto-restart PM2 + horizontal scale',
  'ecosystem.config.js avec max_memory_restart 512M. systemd unit d enabled. Si queue > N jobs en attente : spawn worker addon.',
  null,'api',array['launch','workers']),

('ftg','infra','claude','high','pending',
  'Content cascade agents — quota tracking + daily reset',
  'Gemini 20rpm × 4 keys, Groq 100k TPD, YouTube 10k/day. Table agent_quota_usage avec reset cron 00:00 UTC. Fallback OpenAI si saturated.',
  null,'api',array['launch','workers','llm']),

-- ═════════════════ COÛTS & BUDGET ═════════════════
('ftg','ops','claude','critical','pending',
  'Vercel usage alerts @ 50/80/95% du plan',
  'Configurer email alerts + Slack webhook. Si 95% atteint : email immédiat + prévu d''upgrade automatique vs throttle.',
  'https://vercel.com/dashboard/usage','api',array['launch','cost']),

('ftg','ops','claude','critical','pending',
  'Supabase billing alerts + read replica conditionnelle',
  'Activer cost alerts 50/80/95%. Read replica seulement si p95 > 500ms sur 30 min. Sinon éviter le coût.',
  'https://supabase.com/dashboard/project/jebuagyeapkltyjitosm/settings/billing','api',array['launch','cost','db']),

('ftg','ops','claude','high','pending',
  'LLM cost cap par provider — kill-switch auto',
  'OpenAI ≤ $50/jour, Anthropic ≤ $30/jour, Google ≤ $20/jour. Env var MAX_LLM_SPEND_DAY_USD. Si dépassé : fallback vers free tier uniquement + alert.',
  null,'api',array['launch','cost','llm']),

('ftg','ops','user','critical','pending',
  'Stripe billing alert — anomalies detection',
  'Stripe Dashboard > Developers > Webhooks alerts. Si erreur rate > 5% ou charges > 2× moyenne 7j : email.',
  'https://dashboard.stripe.com/settings/notifications','desktop',array['launch','cost','payment']),

('ftg','ops','claude','high','pending',
  'Resend quota monitoring + fallback provider',
  'Free tier 100/day → Pro $20/mo = 50k/mo. Alert à 80%. Si saturé : fallback SMTP direct (Mailgun, Postmark).',
  null,'api',array['launch','cost','email']),

-- ═════════════════ ZERO-DOWNTIME DEPLOY ═════════════════
('ftg','infra','claude','critical','pending',
  'Pattern migrations zero-downtime documented',
  'Règles : ajouter col NULLABLE first, backfill async, NOT NULL after. Jamais DROP column sans déploy intermediate. Scripts rollback prêts.',
  null,'n/a',array['launch','db','deploy']),

('ftg','infra','claude','high','pending',
  'Vercel preview URLs pour chaque PR + E2E smoke',
  'PR ouverture → preview URL → Playwright headless smoke 5 routes critiques. Blocker merge si smoke fail.',
  null,'api',array['launch','deploy','ci']),

('ftg','infra','claude','high','pending',
  'Feature flag system pour rollout gradual',
  'GrowthBook OSS ou simple NEXT_PUBLIC_ROLLOUT_<feature> env. Activer nouveaux endpoints pour 1% → 10% → 100% sur 24h.',
  null,'api',array['launch','deploy','safety']),

-- ═════════════════ MONITORING & ALERTING ═════════════════
('ftg','infra','claude','critical','pending',
  'Sentry error tracking — front + API routes',
  'Installer @sentry/nextjs, set DSN, configurer sampling 10% perf + 100% errors. Alert PagerDuty si error rate > 0.5%.',
  null,'api',array['launch','monitoring']),

('ftg','infra','claude','critical','pending',
  'Uptime monitor — 5 routes externes',
  '/, /marketplace, /reports/CIV, /api/health, /auth/login. BetterUptime ou UptimeRobot. Check 60s. Alerte Slack + email.',
  null,'api',array['launch','monitoring']),

('ftg','infra','claude','high','pending',
  'DB slow query log — alert si > 2s',
  'pg_stat_statements enabled. Query avec mean_exec_time > 2000ms → alert. Dump top 20 dans /admin/db-health.',
  null,'api',array['launch','db','monitoring']),

('ftg','infra','claude','high','pending',
  '/api/health endpoint + readiness probe',
  'Check DB connexion + Supabase réponse + quotas non saturés. Retourne 200 OK ou 503 avec details. Consommé par uptime monitors.',
  null,'api',array['launch','monitoring']),

-- ═════════════════ SECURITY & DDoS ═════════════════
('ftg','infra','claude','critical','pending',
  'Rate limiting global — Vercel Middleware',
  'Pattern @upstash/ratelimit : 100 req/min par IP sur /api/*, 10 req/h sur /auth/login. Bypass pour IPs allowlist (cron).',
  null,'api',array['launch','security']),

('ftg','infra','claude','high','pending',
  'Cloudflare DNS proxied + DDoS shield',
  'Toute request passe CF → Vercel. Block countries non-cibles si besoin. Bot fight mode.',
  'https://dash.cloudflare.com','desktop',array['launch','security']),

('ftg','infra','claude','medium','pending',
  'Stripe Radar rules activées + webhook retry',
  'Règles BLOCK/REVIEW/3DS dynamic déjà en place (docs/STRIPE_RADAR_RULES.md). Vérifier webhook retry policy Stripe (3 jours).',
  'https://dashboard.stripe.com/radar','desktop',array['launch','security','payment']),

-- ═════════════════ BACKUP & RECOVERY ═════════════════
('ftg','infra','user','critical','pending',
  'Supabase PITR (Point-in-Time Recovery) activé',
  'Pro tier inclut 7j PITR. Vérifier activé + tester restore sur staging. Doc runbook dans docs/RECOVERY.md.',
  'https://supabase.com/dashboard/project/jebuagyeapkltyjitosm/settings/database','desktop',array['launch','backup']),

('ftg','infra','claude','high','pending',
  'Daily DB logical dump → S3/R2',
  'pg_dump schema-only + data-only. Upload Cloudflare R2 (cheaper). Retention 30j. Test restore trimestriel.',
  null,'api',array['launch','backup']),

-- ═════════════════ DELIVERABILITY ═════════════════
('ftg','ops','user','critical','pending',
  'SPF + DKIM + DMARC configurés pour feelthegap.app',
  'SPF: v=spf1 include:amazonses.com include:_spf.resend.com -all. DKIM key auto par Resend. DMARC p=quarantine. Vérif via mail-tester.com.',
  'https://resend.com/domains','desktop',array['launch','email']),

('ftg','ops','claude','high','pending',
  'Bounce + complaint handling via Resend webhook',
  'Webhook /api/webhooks/resend reçoit bounces/complaints → mark email invalide dans entrepreneur_demos/entrepreneurs_directory. Évite reputation damage.',
  null,'api',array['launch','email']),

-- ═════════════════ PERF FRONT ═════════════════
('ftg','infra','claude','high','pending',
  'Bundle analyzer + code split routes',
  'next/bundle-analyzer. Cibler initial JS < 150 KB gzipped. Dynamic import pour Market Pulse, Ad Factory components lourds.',
  null,'api',array['launch','perf','frontend']),

('ftg','infra','claude','medium','pending',
  'Image optimization — Vercel Image CDN',
  'next/image partout. AVIF/WebP auto. Lazy load below fold. Sizes + srcset corrects.',
  null,'desktop',array['launch','perf','frontend']),

('ftg','infra','claude','medium','pending',
  'Core Web Vitals — LCP < 2.5s / CLS < 0.1 / INP < 200ms',
  'Vercel Analytics activé. Cible: Lighthouse mobile > 90 sur homepage, /marketplace, /pricing.',
  'https://pagespeed.web.dev/analysis?url=https://feelthegap.app','desktop',array['launch','perf']),

-- ═════════════════ RUNBOOK & ON-CALL ═════════════════
('ftg','ops','user','high','pending',
  'docs/RUNBOOK.md — scénarios incident + recovery',
  'DB down, Vercel down, Stripe down, LLM quota exhausted, DDoS in progress, payment dispute wave. Pour chaque: detect, mitigate, recover.',
  null,'n/a',array['launch','ops']),

('ftg','ops','user','medium','pending',
  'Status page publique — status.feelthegap.app',
  'BetterStack Status Page ou Atlassian Statuspage. Auto-update depuis monitors. Link dans footer app.',
  null,'desktop',array['launch','ops']),

('ftg','ops','user','medium','pending',
  'On-call rotation + paging (solo phase)',
  'PagerDuty free tier ou Slack @channel. Phone push critical only. Éviter burnout sur faux positifs.',
  null,'mobile',array['launch','ops'])

) as v(project, category, owner, priority, status, title, description, url, platform, tags)
where not exists (select 1 from cc_tasks t where t.project = v.project and lower(t.title) = lower(v.title));
