# API Doc Autopilot — Design Spec

**Rank:** 7 (Hisoka portfolio) · **Score:** 41.1 · **MRR Y3:** €52k · **Estimate:** 8/14/22j · **Status:** Ultra Instinct worker active

## 1. Vision

Auto-generate production-grade interactive API documentation from any spec (OpenAPI 3.x, GraphQL SDL, gRPC `.proto`, tRPC). Zero-ops pipeline: connect repo → detect spec → parse AST → generate docs (MDX/HTML) → multi-language code examples → embedded sandbox → auto-redeploy on spec change. Targets indie devs, SaaS platforms, and API-first startups who ship faster than they document.

**Differentiators vs ReadMe / Stoplight / Mintlify:**
- Auto-detect spec from repo (no manual import)
- AI-generated semantic descriptions (from endpoint names + code comments)
- Diff-aware changelogs (breaking-change detector)
- Sandbox with rate-limited egress (E2B-style isolated runs)
- Unified dashboard for multi-repo teams

## 2. Bricks Reused

| Brick | Usage |
|---|---|
| **ai-pool** (`/lib/ai-pool`) | LLM cascade for description enrichment + code example generation (Groq → OpenAI → Anthropic) |
| **auth-v2** (`/lib/auth`) | WebAuthn + Supabase session, site_access cloisonnement |
| **Stripe bootstrap** (migration `20260423030000_stripe_subscriptions.sql`) | Subscriptions table, webhook handler, tier gating |
| **i18n** (`/lib/i18n`) | Generated docs localized en/fr/es/de (locale per project) |
| **Kakashi** (copy ninja) | Reuse `/admin/security` dashboard shell for `/admin/api-doc-autopilot` |
| **Supabase RLS** | Per-project ownership, team sharing via shared table |

## 3. DB Tables (see migration `20260423050000_api_doc_autopilot.sql`)

- `api_doc_projects` — repo connections (GitHub App install), slug, tier, custom domain
- `api_doc_specs` — parsed OpenAPI/GraphQL/gRPC AST, versioned, changelog diff
- `api_doc_generated` — rendered MDX/HTML + search index (Pagefind/lunr)
- `api_doc_code_examples` — per endpoint × 9 languages (js/ts/py/go/rb/curl/rs/java/php), cached
- `api_doc_sandbox_requests` — sandboxed HTTP executions, latency + cost tracking

## 4. Tiers

| Tier | Price | Limits |
|---|---|---|
| Free | €0 | 1 repo, 100 sandbox/mo, watermark |
| Pro | €19/mo | 5 repos, 10k sandbox/mo, custom domain, no watermark |
| Team | €99/mo | Unlimited repos + sandbox, SSO, team seats, branding, SLA |

**Annual variants:** 12/24/36 mois (-10/-20/-30%) per règle `feedback_subscription_durations`.

## 5. Routes Next.js

- `/docs/[slug]` — public doc viewer (MDX + Tailwind + shadcn), SSG + ISR 5min
- `/docs/[slug]/[version]` — version pinning
- `/docs/[slug]/sandbox/[endpoint]` — interactive try-it
- `/admin/api-doc-autopilot` — dashboard (list projects, connect repo, trigger rebuild)
- `/admin/api-doc-autopilot/[id]` — project detail (specs, changelog, usage)
- `/api/api-doc-autopilot/webhook/github` — push event → re-parse spec
- `/api/api-doc-autopilot/sandbox` — proxy sandbox calls (rate-limited by tier)
- `/api/api-doc-autopilot/generate` — trigger regeneration (queue job)

## 6. Pipeline

```
GitHub push → webhook → detect spec file →
parse AST (openapi-parser/graphql-js/protobufjs) →
diff vs last version → changelog →
LLM enrich descriptions (ai-pool cascade) →
generate code examples (9 lang × N endpoints) →
render MDX + search index →
deploy to edge (Vercel ISR)
```

## 7. Next Checkpoints

- 30% → API routes scaffold (webhook, generate, sandbox)
- 50% → parser (OpenAPI first) + LLM enrichment
- 70% → `/docs/[slug]` public renderer
- 90% → sandbox isolation + tier gating + Stripe link
- 100% → admin dashboard + smoke tests + deploy prod
