-- Seed cc_tasks from current state (memory snapshots + live repo analysis 2026-04-24).
-- Organised by project; each row is either a test (category='test') the user can
-- run, or a dev/ops/legal todo owned by user or claude. Safe to re-run: checks
-- against (project, title) to avoid dup-inserting.

insert into cc_tasks (project, category, owner, priority, status, title, description, url, platform)
select project, category, owner, priority, status, title, description, url, platform from (values

-- ═════════════════ FTG ═════════════════
-- Tests (user)
('ftg','test','user','critical','pending','Test /marketplace anon → Market Pulse 12 corridors visibles','Vérifier chargement Market Pulse strip sans loguer, gap formats B/T corrects, CTAs Sell/Buy routent /marketplace/new avec ?country= prefill','https://feelthegap.app/marketplace','desktop'),
('ftg','test','user','critical','pending','Test /marketplace/new?kind=volume&country=CIV prefilled','Prefill ISO3 CIV sur countryIso, submit marche après login, row visible dans /admin/marketplace','https://feelthegap.app/marketplace/new?kind=volume&country=CIV','desktop'),
('ftg','test','user','high','pending','Test /marketplace/new?kind=demand&country=DEU prefilled','Prefill deliveryCountry DEU, submit marche, visible dans /marketplace','https://feelthegap.app/marketplace/new?kind=demand&country=DEU','desktop'),
('ftg','test','user','critical','pending','Test /admin/outreach-enrichment (813 bloqués)','Voir 50 demos top-ROI + directory hints + boutons email-guesses cliquables + save → snapshot trend visible','https://feelthegap.app/admin/outreach-enrichment','desktop'),
('ftg','test','user','high','pending','Test save email → outreach-engine next tick envoie','Après save email sur 1 demo, vérifier 24h plus tard que outreach_sent_at set + email Resend reçu','https://feelthegap.app/admin/outreach-enrichment','n/a'),
('ftg','test','user','high','pending','Test /dashboard entrepreneur hub','Vérifier entrepreneur hub shippé f4a894c, composants affichent données persos','https://feelthegap.app/dashboard','desktop'),
('ftg','test','user','high','pending','Test /admin/lead-approval swipe pending','Approuver/rejeter 5 leads, vérifier status flip + count updates','https://feelthegap.app/admin/lead-approval','desktop'),
('ftg','test','user','high','pending','Test /admin/fraud-events KPIs + chart 7j','Vérifier stats 24h/7j + chart stack + table 80 derniers events','https://feelthegap.app/admin/fraud-events','desktop'),
('ftg','test','user','medium','pending','Test /admin/demo-accounts switch','Switcher demo.entrepreneur → demo.investisseur etc. depuis sidebar footer','https://feelthegap.app/admin/demo-accounts','desktop'),
('ftg','test','user','high','pending','Test /reports/[iso] cache-first','Visiter 2x même pays : 2e visite lit DB, pas de regen LLM (check logs)','https://feelthegap.app/reports/CIV','desktop'),
('ftg','test','user','medium','pending','Test /demo/[token] public','Token valide affiche demo complète, CTA sign-up FTG','https://feelthegap.app','desktop'),
('ftg','test','user','high','pending','Test WebAuthn biométrie login','Enregistrer bio + login depuis device différent','https://feelthegap.app/auth/login','mobile'),
('ftg','test','user','high','pending','Test forgot-password + reset','Flow complet avec token expire + email Resend','https://feelthegap.app/auth/forgot','desktop'),
('ftg','test','user','medium','pending','Test marketplace match accept producer+buyer','2 users acceptent le même match → confirmed → 2 emails notifyConfirmed','https://feelthegap.app/marketplace','desktop'),
('ftg','test','user','high','pending','Test i18n 6 langues','/reports fr/en/ar/pt/es/de : UI + content DB langue correcte','https://feelthegap.app','desktop'),
('ftg','test','user','high','pending','Test mobile responsive /marketplace + /admin','Vérifier overlap CTA + Market Pulse readable 375px','https://feelthegap.app/marketplace','mobile'),
('ftg','test','user','high','pending','Test pricing page geo-pricing','Vérifier prix PPP adaptés au pays détecté IP (proxy si besoin)','https://feelthegap.app/pricing','desktop'),
('ftg','test','user','medium','pending','Test Stripe checkout 3DS Radar rules','Carte 4000 0027 6000 3184 → 3DS challenge accepté','https://feelthegap.app/pricing','desktop'),
('ftg','test','user','medium','pending','Test Shippo quote dynamique','Post volume avec shipping_origin → quote /api/store/[slug]/shipping/quote','https://feelthegap.app/marketplace/new','n/a'),
('ftg','test','user','medium','pending','Test Ad Factory studio FR render E2E','/admin/ad-factory/studio/[id] run FR → vidéo Seedance + voix ElevenLabs','https://feelthegap.app/admin/ad-factory','desktop'),
('ftg','test','user','medium','pending','Test /deal/[slug] lead capture public','Formulaire rate-limit 5/h + email Resend vendeur','https://feelthegap.app/deal','desktop'),
-- Dev + ops (claude)
('ftg','dev','claude','high','pending','Migration deal room → OFA standalone (phase 2)','Exporter templates deal-rooms + handoff 1-click vers OFA','https://github.com/mehdisakalypr-cpu/feel-the-gap','n/a'),
('ftg','dev','claude','medium','pending','Marketplace filters (product + country + certs)','Quand liquidité > 50 volumes, ajouter filtres search/dropdown','https://feelthegap.app/marketplace','n/a'),
('ftg','dev','claude','medium','pending','i18n EN 200+ strings (3 pages) — post-LLC','strings hardcoded FR sur /pricing/prospect, /auth/*, /dashboard','n/a','n/a'),
('ftg','ops','claude','medium','pending','Scout-queue auto-enrich contacts VPS','Google Places / Hunter.io pattern pour compléter email/phone sur 813 bloqués','n/a','n/a'),
('ftg','infra','claude','low','pending','Infra-ingest 401 post-rotation Vercel','Re-câbler clé dans CC /admin/infra après rotation','n/a','n/a'),
-- Legal + ops (user)
('ftg','legal','user','high','blocked','Wyoming LLC + Mercury bank','Gate absolu : post-expatriation Portugal ou Maroc uniquement','n/a','n/a'),
('ftg','legal','user','medium','pending','Signature NDA tripartite Yassine + Younes','DocuSeal tripartite 2026-04-20+','n/a','n/a'),

-- ═════════════════ OFA ═════════════════
('ofa','test','user','critical','pending','Test génération site démo anonyme','Lead capture → agent build → publish gate 100% images HTTP 200','https://one-for-all.vercel.app','desktop'),
('ofa','test','user','high','pending','Test pricing géo par pays','Voir prix 149€/mo = ajusté PPP CIV/FRA/USA','https://one-for-all.vercel.app/pricing','desktop'),
('ofa','test','user','high','pending','Test image cascade 9 sources','Archétype → image hero unique + 1 image/section','https://one-for-all.vercel.app','desktop'),
('ofa','test','user','medium','pending','Test CTA gates (contact présent)','Pas de site publié sans email/phone capturable','n/a','n/a'),
('ofa','dev','claude','high','pending','Classifier archétype auto-improve','Apprendre continu depuis feedback user','n/a','n/a'),
('ofa','dev','claude','medium','pending','Product-level scouting (spaghetti ≠ tagliatelle)','Deep Typology Builder taxonomie fine','n/a','n/a'),
('ofa','content','shared','high','pending','Enrichir persona library metier × région','25 metiers × 5 régions = 125 personas calibrés','n/a','n/a'),

-- ═════════════════ CC (Command Center) ═════════════════
('cc','test','user','critical','pending','Test /admin/overview dashboard load','Métriques live (MRR/ARR + agents actifs)','https://cc-dashboard.vercel.app/admin/overview','desktop'),
('cc','test','user','high','pending','Test /admin/hisoka forge pipeline','Harvest + forge + push x-cron-secret, bilan 4 lignes','https://cc-dashboard.vercel.app/admin/hisoka','desktop'),
('cc','test','user','high','pending','Test /admin/businesses multi-business picker','BusinessPicker global + scope rubriques CRM','https://cc-dashboard.vercel.app/admin/businesses','desktop'),
('cc','test','user','high','pending','Test Aria voice chat','Click micro + question vocale + STT Groq whisper-large-v3-turbo','https://cc-dashboard.vercel.app','desktop'),
('cc','test','user','medium','pending','Test /admin/tasks (nouveau)','Filtres project/owner/category + add/update/hide done','https://cc-dashboard.vercel.app/admin/tasks','desktop'),
('cc','test','user','medium','pending','Test /admin/content-jobs (nouveau)','Progression + ETA + rythme par projet','https://cc-dashboard.vercel.app/admin/content-jobs','desktop'),
('cc','dev','claude','high','pending','CC Fleet N workers v3 provisioning','Finaliser N≥5 workers isolés + systemd auto-restart','n/a','n/a'),
('cc','ops','user','high','pending','Rotation CRON_SECRET + Vercel envs','Post dark-web leak Vercel 2026-04-20','n/a','n/a'),

-- ═════════════════ Estate ═════════════════
('estate','test','user','high','pending','Test booking flow hôtel démo','Réservation complète avec paiement Stripe test','n/a','desktop'),
('estate','dev','claude','medium','pending','Channel manager integration','Booking.com + Airbnb sync 2-way','n/a','n/a'),

-- ═════════════════ Shift Dynamics ═════════════════
('shift','test','user','medium','pending','Test landing Shift consulting','CTA contact + formulaire submit','n/a','desktop'),
('shift','content','shared','low','pending','Case studies section','Ajouter 3 études de cas anonymisées','n/a','n/a'),

-- ═════════════════ Optimus ═════════════════
('optimus','test','user','critical','pending','Test batch-backtest TOP stratégies','RAVE +49.98% reproduit sur candles récents','https://optimus.vercel.app','desktop'),
('optimus','test','user','high','pending','Test dashboard coverage prod','ws-bridge 3 venues live, Rust daemon 5 streams actifs','https://optimus.vercel.app','desktop'),
('optimus','dev','claude','high','pending','Kill-switch global test conditions','Tester trigger conditions + rollback safe','n/a','n/a'),

-- ═════════════════ Hisoka ═════════════════
('hisoka','test','user','high','pending','Test /admin/hisoka forge','harvest → forge → push, bilan 4 lignes + top10 J-H estimation','https://cc-dashboard.vercel.app/admin/hisoka','desktop'),
('hisoka','ops','claude','medium','pending','AAM phase 5 flywheel debug','5/5 failed le 22/04, check current state','n/a','n/a'),

-- ═════════════════ AAM ═════════════════
('aam','test','user','high','pending','Test AAM cron live','cron 2026-04-22 smoke ok:true, current state?','n/a','n/a'),
('aam','ops','user','medium','pending','Setter E2B_API_KEY','Dernier blocker phase 5 activation','n/a','n/a'),

-- ═════════════════ General (cross-cutting) ═════════════════
('general','legal','user','critical','blocked','Expatriation Portugal ou Maroc effective','Gate absolu pour tout action LLC/bank','n/a','n/a'),
('general','legal','user','high','pending','Payer INPI e-Soleau 60€','Paquet uploadé 2026-04-20','n/a','n/a'),
('general','legal','user','high','pending','USCO enregistrement $45','Draft dans /root/authorship/USCO_DRAFT_20260420.md','n/a','n/a'),
('general','ops','user','medium','pending','gapup.io Workspace + Instantly setup','Namecheap+CF OK, reste email+outreach','n/a','n/a'),
('general','dev','claude','medium','pending','Deploy process systematic après chaque CC feature','Règle mémoire feedback_cc_deploy_systematic.md','n/a','n/a'),
('general','ops','claude','low','pending','Monitoring VPS scripts /root/monitor/','Crons actifs + Supabase CLI token','n/a','n/a')

) as v(project, category, owner, priority, status, title, description, url, platform)
where not exists (
  select 1 from cc_tasks t
   where t.project = v.project
     and lower(t.title) = lower(v.title)
);
