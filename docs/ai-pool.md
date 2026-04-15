# AI Key Pool — architecture

Phase 3 de la stratégie AI scaling légale : chaque projet (FTG / OFA / CC) fait tourner un pool de clés réelles par provider, avec circuit-breaker et cascade.

## Flux

```
request → withFallback(order=[openrouter, groq, gemini, ...])
            │
            ├─ pickKey(provider) ──► round-robin, skip clés en circuit open
            │
            ├─ callProvider(k.value, input) ──► providers/openrouter.ts (ou autre)
            │
            ├─ success → markSuccess(k) + logEvent('call_ok', latency, tokens, cost)
            └─ fail    → markFailure(k, cooldown) + logEvent('rate_limit'|'call_fail'|'quota_exhausted')
                          │
                          └─ next key / next provider
```

## Fichiers

- `lib/ai-pool/types.ts` — `Provider`, `KeyEntry`, `PoolStats`, `GenInput/Output`
- `lib/ai-pool/registry.ts` — lecture env, round-robin cursor par provider
- `lib/ai-pool/router.ts` — `pickKey`, `DEFAULT_CASCADE_ORDER`
- `lib/ai-pool/health.ts` — circuit breaker, `logEvent` Supabase
- `lib/ai-pool/cascade.ts` — `withFallback`, `withFallbackJSON`
- `lib/ai-pool/providers/openrouter.ts` — client OpenRouter (1 clé → N modèles)

## Ajouter une clé

```bash
# .env ou dashboard Vercel
GROQ_API_KEY_2="gsk_..."
GROQ_API_KEY_2_ENTITY="alias2@ofaops.xyz"
GROQ_API_KEY_2_TIER="free"
GROQ_API_KEY_2_QUOTA="14400"   # appels/mois estimés
```

Conventions :
- numérotation `_2` à `_10` par provider (max 10 clés/provider)
- `{KEY}_ENTITY` = label entité (email/alias/LLC) affiché dans le dashboard
- `{KEY}_TIER` = `free` | `paid` | `trial`
- `{KEY}_QUOTA` = quota mensuel estimé (0 = illimité), utilisé pour les alertes 80%+

Providers supportés : `openrouter`, `groq`, `gemini` (aussi `GOOGLE_API_KEY`), `together`, `openai`, `anthropic`, `mistral`, `cohere`.

## Utilisation

```ts
import { withFallback, withFallbackJSON } from '@/lib/ai-pool'

const { text, provider, costUsd } = await withFallback(
  { prompt: 'Hello', maxTokens: 200 },
  { project: 'cc' },
)

const { data } = await withFallbackJSON<{ title: string }>(
  { prompt: 'Return JSON {title}', temperature: 0 },
  { project: 'ofa', order: ['openrouter', 'groq'] },
)
```

OpenRouter est prioritaire dans `DEFAULT_CASCADE_ORDER` : une seule clé donne accès à Claude / GPT / Llama / Gemini / Mistral via un même endpoint.

## Monitoring

- Dashboard : `/admin/ai-pool` (gated `requireAdmin()`)
- API : `GET /api/admin/ai-pool/stats` → JSON (providers, daily cost, top keys, alerts)
- Table : `ai_key_events` (migration `20260415180000_ai_key_events.sql`)

Colonnes loggées par appel : `project`, `provider`, `key_label`, `event`, `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`, `error_code`.

## Alertes

Le dashboard flag toute clé ayant consommé ≥ 80 % de son `QUOTA` mensuel estimé. À 100 %+ : rouge, à 80-100 % : orange. Le circuit breaker se déclenche automatiquement sur rate-limit (65 s de cooldown) ou auth fail (24 h).

## Prochaines étapes

- copier le pattern vers FTG (`/var/www/feel-the-gap/lib/ai-pool`) et OFA (qui a déjà `agents/lib/key-pool.ts` à remplacer)
- ajouter les providers natifs (groq/gemini/openai/anthropic/mistral/cohere) dans `lib/ai-pool/providers/*.ts` quand on veut bypass OpenRouter pour du volume
- cron Supabase hebdo : purge `ai_key_events` > 30 jours
