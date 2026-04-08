# Command Center — Hub Central

Hub centralisé pour piloter tous les projets de l'écosystème. Aria (assistant vocal), dashboard métriques, session logging.

## Écosystème des projets

### Architecture d'hébergement

| Projet | Stack | Hébergeur principal | URL résiliente (sans VPS) | URL VPS | GitHub |
|--------|-------|--------------------|--------------------------:|---------|--------|
| **The Estate** | HTML/CSS/JS | **Netlify** | [the-estate-fo.netlify.app](https://the-estate-fo.netlify.app) | — | [the-estate](https://github.com/mehdisakalypr-cpu/the-estate) |
| **Shift Dynamics** | Next.js 16 | **Vercel** | [consulting-on55melzp-...vercel.app](https://consulting-on55melzp-mehdisakalypr-3843s-projects.vercel.app) | — | [shift-dynamics](https://github.com/mehdisakalypr-cpu/shift-dynamics) |
| **Command Center** | Next.js 16 | **Vercel + VPS** | [command-center-lemon-xi.vercel.app](https://command-center-lemon-xi.vercel.app) | [command-center01.duckdns.org](https://command-center01.duckdns.org) | [command-center](https://github.com/mehdisakalypr-cpu/command-center) |
| **Feel The Gap** | Next.js 16 | **Vercel + VPS** | Vercel (pas de domaine prod actif) | [feel-the-gap.duckdns.org](https://feel-the-gap.duckdns.org) | [feel-the-gap](https://github.com/mehdisakalypr-cpu/feel-the-gap) |

### Pourquoi Netlify vs Vercel

| Critère | Netlify | Vercel |
|---------|---------|--------|
| Spécialité | Sites statiques, HTML pur, JAMstack | Next.js, apps React full-stack |
| Server-side | Netlify Functions (AWS Lambda) | Fluid Compute (Node.js natif) |
| Next.js | Support basique | Créateur de Next.js — support natif |
| HTML statique | Parfait, zéro config | Overkill |
| Free tier BW | 100 GB/mois | 100 GB/mois |
| Free tier build | 300 min/mois | 6 000 min/mois |

**Principe** : HTML pur → Netlify | Next.js → Vercel | Chaque outil là où il excelle.

### Résilience

- **The Estate** et **Shift Dynamics** sont 100% indépendants du VPS (Netlify/Vercel)
- **Command Center** fonctionne sur VPS et Vercel simultanément. Sur Vercel : pas d'accès shell (RAM, PM2), mais Aria, dashboard Supabase et auth fonctionnent.
- **Feel The Gap** tourne sur le VPS (PM2 port 3002). Le code est déployable sur Vercel mais pas de domaine prod configuré.

### Base de données partagée

Tous les projets utilisent la même instance **Supabase** : `jebuagyeapkltyjitosm.supabase.co`

| Table | Projet | Usage |
|-------|--------|-------|
| `hotels`, `vouchers`, `guest_cards`, `alerts`, `contracts`, `trips`, `members` | The Estate | Données hôtelières |
| `hotel_census`, `hotel_research_requests` | The Estate | Audit hôtelier (recensement) |
| `estate_users` | The Estate | Auth (passwords hashés SHA-256) |
| `cms_entries`, `leads` | Shift Dynamics | CMS + leads capture |
| `countries`, `opportunities`, `reports`, `business_plans`, `profiles`, `affiliate_*`, `influencer_*` | Feel The Gap | Données commerce international |
| `webauthn_credentials` | Tous | Passkeys biométriques (WebAuthn) |
| `telegram_inbox` | Command Center | Messages Telegram bridge |

### Authentification

| Projet | Méthode | Biométrie WebAuthn |
|--------|---------|-------------------|
| The Estate | SHA-256 hash vs Supabase `estate_users` | Via navigator.credentials (client-side) |
| Shift Dynamics | Gate password + Admin JWT (bcrypt) | Pas encore |
| Command Center | Email/password + TOTP 2FA → JWT | Oui (SimpleWebAuthn, multi-domaine) |
| Feel The Gap | Supabase Auth + Google OAuth | Oui (SimpleWebAuthn + magic link) |

### Ports VPS (PM2)

| Port | Projet |
|------|--------|
| 3000 | Command Center |
| 3002 | Feel The Gap |

### Monitoring (`/root/monitor/`)

- `health-check.sh` — cron 5 min : RAM, disque, PM2, Supabase
- `supabase-keepalive.sh` — cron 5 jours : empêche pause Supabase free tier
- `scaling-check.sh` — cron dimanche 08h : rapport hebdo
- `send-alert.sh` — alertes email via Resend API
- `session-log.sh` — logging sessions Claude Code

## Pages du Command Center

- `/` — Aria (voice assistant, push-to-talk, bridge Claude)
- `/gemini` — Chat Gemini 2.0 Flash
- `/dashboard` — Hub projets (métriques VPS, Supabase, ping services)
- `/login` — Auth (email + password, biométrie)
- `/login/verify` — TOTP 2FA + proposition biométrie
- `/setup-2fa` — Configuration TOTP

## Développement

```bash
npm run dev    # http://localhost:3000
npm run build  # Production build
npm start      # Serveur production
```

## Env vars requises

```
OPENAI_API_KEY          # STT/TTS Whisper
SUPABASE_URL            # Supabase REST
SUPABASE_ANON_KEY       # Supabase anon
SUPABASE_SERVICE_ROLE_KEY # Supabase admin (WebAuthn)
TAVILY_API_KEY          # Recherche web Aria
RESEND_API_KEY          # Email
JWT_SECRET              # Session auth
TOTP_SECRET             # 2FA
ADMIN_EMAIL             # Admin email
ADMIN_PASSWORD_HASH     # bcrypt hash
NEXT_PUBLIC_BASE_URL    # URL publique
FTG_URL                 # URL Feel The Gap
SHIFT_DYNAMICS_URL      # URL Shift Dynamics
TELEGRAM_BOT_TOKEN      # Telegram bridge
```
