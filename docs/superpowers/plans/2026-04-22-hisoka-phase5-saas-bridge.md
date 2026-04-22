# Hisoka Phase 5 — Bridge to SaaS (inline worker)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou superpowers:executing-plans.

**Goal:** Fermer la boucle — une idée promoted dans `minato_tickets(queued, project=hisoka)` devient une landing publique sous `cc-dashboard.vercel.app/saas/[slug]` avec waitlist actif, URL tracée sur `business_ideas.deployed_url`.

**Architecture:** Worker inline (cron Vercel 15min) claim 1 ticket hisoka → génère `landing_content` JSON via LLM (cascade Gemini) → écrit sur `business_ideas` → marque ticket done. Le rendu public est une route App Router `app/saas/[slug]` ISR 1h qui lit la DB. Waitlist = table `saas_waitlist` + POST route. Pas de Vercel sub-project par idée : tout sert depuis cc-dashboard. LLC-safe (waitlist only).

**Tech Stack:** Next.js App Router, Supabase (RLS public-read si landing publiée), ai-pool cascade, Vercel cron.

---

## File Structure

- Migration: `supabase/migrations/20260423000000_hisoka_phase5_saas.sql`
- Worker lib: `lib/hisoka/saas-forge/{types,claim,landing-renderer,publish}.ts`
- Cron route: `app/api/business-hunter/saas-forge/cron/route.ts`
- Public page: `app/saas/[slug]/page.tsx` + `components/saas-landing/LandingView.tsx`
- Waitlist API: `app/api/saas/[slug]/waitlist/route.ts`
- Cron registration: `vercel.json`
- Admin link: `app/admin/hisoka/page.tsx`
- Ki Sense surfacing: `lib/ki-sense/summary.ts`
- Mémoire: `project_hisoka_phase5_saas_bridge.md`

---

## Task 1 — Migration

Ajoute à `business_ideas`: `landing_content jsonb`, `deployed_url text`, `landing_rendered_at timestamptz` + unique index sur `slug`. Crée `saas_waitlist(idea_slug, email, source, user_agent, ip_hash, created_at)` avec unique(slug,email), RLS admin-read. Ajoute policy public-read sur `business_ideas` where `landing_content is not null`.

Appliquer via Management API (pattern `reference_supabase_migration_bypass`). Commit : `feat(hisoka/phase5): migration — landing_content + saas_waitlist + RLS`.

## Task 2 — Types + landing renderer

Crée `lib/hisoka/saas-forge/types.ts` : `LandingContent` (hero_title ≤120, hero_tagline, hero_cta, features[3-6] {title,description,icon}, faq[3-5], footer_note, lang).

Crée `lib/hisoka/saas-forge/landing-renderer.ts` : `renderLanding(idea)` → appelle `withFallback` (order gemini/mistral/groq/...) avec prompt système strict (pas de buzzwords, pas de placeholders, lang inféré du marché). Parse via `extractJSON`, valide shape, retourne `{ok,content,cost_eur,provider}`.

Smoke script `scripts/saas-forge-smoke-renderer.ts` avec idée PPP-Pricing. Commit.

## Task 3 — Claim + publish + cron

Crée `lib/hisoka/saas-forge/claim.ts` : `claimHisokaTicket(admin)` atomique — select 1 ticket `project=hisoka, state=queued` ORDER BY priority DESC, puis UPDATE only-if-still-queued → in_progress (évite double-claim).

Crée `lib/hisoka/saas-forge/publish.ts` : `publishLanding({ticketId,slug,content,baseUrl})` → update business_ideas (landing_content/deployed_url/landing_rendered_at) + minato_tickets (state=done, pr_url=deployed_url). `failTicket(admin,id,err)` → state=failed, error_message tronqué 500.

Crée `app/api/business-hunter/saas-forge/cron/route.ts` : auth CRON_SECRET + x-vercel-cron, claim 1 ticket, extrait slug de `mrr_target_id` (`hisoka.<slug>`), fetch idea, render, publish. Sur échec → failTicket. Réponse `{ok,claimed,deployed_url,provider,cost_eur}`.

Smoke prod via curl avec x-cron-secret. Commit.

## Task 4 — Page publique /saas/[slug] + waitlist

`components/saas-landing/LandingView.tsx` client component : hero + email form + grid features + FAQ details + footer. Tailwind neutral-950. i18n léger (cta/placeholder en/fr selon `content.lang`).

`app/saas/[slug]/page.tsx` server ISR 1h : fetch `business_ideas` par slug, 404 si `landing_content` null, `generateMetadata` (title=hero_title).

`app/api/saas/[slug]/waitlist/route.ts` POST : valide email regex, hash IP (daily salt), insert saas_waitlist. Duplicate = idempotent success.

Smoke : GET /saas/<slug> = 200, POST waitlist valid = 200, invalid email = 400. Commit.

## Task 5 — Cron registration + admin link

`vercel.json` : ajouter `{ "path": "/api/business-hunter/saas-forge/cron", "schedule": "*/15 * * * *" }`. Vérifier quota cron Vercel (Hobby 100/j — on sera sous).

`app/admin/hisoka/page.tsx` : afficher badge « Voir SaaS » quand `idea.deployed_url` présent (link target=_blank). Ajouter `deployed_url` au select Supabase + type.

Smoke UI + insertion waitlist visible en DB. Commit.

## Task 6 — Ki Sense surfacing + mémoire

`lib/ki-sense/summary.ts` : ajouter `saas_live` (count business_ideas where deployed_url not null) et `waitlist_total` (count saas_waitlist).

Mémoire : créer `project_hisoka_phase5_saas_bridge.md` + update MEMORY.md.

Commit.

---

## LLC gate

Respecté : zéro Stripe, zéro signup payant, waitlist = capture emails only. Graduation vers billing + project Vercel standalone = Phase 6 post-expat Portugal/Maroc.

## Self-review

- Spec coverage : 5 étapes « queued → SaaS » toutes adressées (claim 1, scaffold remplacé par DB-rendering 2, render 3, deploy remplacé par route dynamique 4, mark done + URL 5).
- Type consistency : `LandingContent` défini Task 2, utilisé Tasks 3/4 via import.
- Placeholder scan : aucun TBD/TODO.
- Gap : rate-limiting waitlist au-delà de unique(email,slug) laissé à Phase 6.
