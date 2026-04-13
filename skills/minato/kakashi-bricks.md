---
name: kakashi-bricks-index
description: Index des briques réutilisables across projets (auth, Supabase, i18n, etc.). Charger avant tout développement de feature.
---

# KAKASHI — Index des briques existantes

**RÈGLE ABSOLUE** : avant de coder une feature, scanner cet index. Si une brique existe → la copier/adapter, jamais redupliquer.

## Auth (FTG → réutilisable partout)
- `WebAuthn biométrique` (Touch/Face ID) : `/var/www/feel-the-gap/lib/auth/webauthn.ts`
- `Forgot/reset password` (avec sécurité anti-bypass) : `/var/www/feel-the-gap/app/forgot-password/`
- 2FA TOTP : `/root/command-center/lib/auth/totp.ts`
- JWT + bcrypt : `/root/command-center/app/api/auth/`

## Supabase
- Client server: `lib/supabase/server.ts` (FTG, OFA, CC homogènes)
- Client browser: `lib/supabase/client.ts`
- RLS policies pattern : voir `/var/www/feel-the-gap/supabase/migrations/`

## i18n (FTG)
- `lib/i18n/` avec 15 langues (en/fr/es/it/ar/zh/id/pt/de/hi/tr/ja/ko/ru/sw)
- Helper : `useT(key)`

## Image scout (OFA)
- `/var/www/site-factory/agents/lib/image-scout.ts` — cascade CF FLUX → HF FLUX → fal.ai → Pollinations
- Avec dédup per-site (patché 2026-04-13)

## Sections content (OFA)
- `/var/www/site-factory/agents/lib/section-content.ts` — quality gates 400-800ch + retry × 2

## Cron / agents
- FTG : `vercel.json` crons (collect/research/perf/trends/optimize/friction/churn)
- OFA : `scripts/orchestrate-all.sh` (batch master)
- Status checks : `agents/status-check.ts` (FTG), `scripts/ofa-health.sh` (OFA)

## Email
- Resend wrapper : `/var/www/feel-the-gap/lib/email/resend.ts`
- `/var/www/site-factory/agents/lib/resend.ts`

## Catch-all emails / AI free tier
- Domaine : `ofaops.xyz` (Cloudflare, en propagation)
- Cascades codées : video (Veo→Kling→Luma→Runway), voice (ElevenLabs→Azure→Google), image (5+)
- Convention : `PROVIDER_API_KEY_N` (1..20)

## Avant de coder, demander :
1. Cette feature existe-t-elle déjà dans 1 des 5 projets ?
2. Quelle brique puis-je adapter au lieu de partir de zéro ?
3. Le design system / palette / fonts existent-ils déjà ?
