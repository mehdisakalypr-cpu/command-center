#!/usr/bin/env node
// Seed 26 security_items reconstructed from the 2026-04-15 transverse audit.
// Idempotent: uses on-conflict-safe pattern via unique (site,category,title).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const token = fs.readFileSync(path.join(os.homedir(), '.supabase/access-token'), 'utf8').trim()
const ref = 'jebuagyeapkltyjitosm'

async function run(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await r.text()
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${body}`)
  return JSON.parse(body)
}

// Ensure unique constraint for idempotent upserts
await run(`
  create unique index if not exists security_items_site_cat_title_uidx
  on security_items (site, category, title);
`)

const items = [
  // ==== INCIDENTS (historique) ====
  {
    site: 'ftg', category: 'backdoor', severity: 'critical', status: 'done',
    title: 'Reset-password HMAC bypass (no session check)',
    description: '/api/auth/reset-password renvoyait un token HMAC sans vérification de session, permettant de réinitialiser le mot de passe de n\'importe quel compte.',
    remediation: 'Suppression de l\'endpoint HMAC, migration sur Supabase Auth recovery flow (magic link email).',
    owner: 'claude-minato', commit_hash: 'fea7b1ca',
    resolved_at: '2026-04-15T10:00:00Z',
  },

  // ==== BACKDOORS (11 admin routes en cours fix) ====
  {
    site: 'cc', category: 'backdoor', severity: 'high', status: 'in_progress',
    title: 'Admin API routes: requireAuth() does not enforce is_admin',
    description: '11 routes sous /api/admin/* utilisent requireAuth() (session présente) mais ne vérifient pas le flag is_admin. Un user lambda connecté peut invoquer des endpoints admin.',
    remediation: 'Remplacer requireAuth() par requireAdmin() (isAdmin check via profiles.is_admin) dans toutes les routes /api/admin/*.',
    owner: 'claude-minato',
  },
  {
    site: 'ofa', category: 'backdoor', severity: 'high', status: 'open',
    title: 'supabaseAdmin() usage in public routes without auth gate',
    description: 'Certaines routes API utilisent le service_role key sans vérification de session ou de rôle.',
    remediation: 'Audit et gate chaque usage de supabaseAdmin() derrière getUser() + role check.',
  },
  {
    site: 'estate', category: 'backdoor', severity: 'medium', status: 'open',
    title: 'Impersonate/debug endpoints non gated',
    description: 'Endpoints de debug/impersonate détectés sans gate de rôle.',
    remediation: 'Soit supprimer, soit gater strictement via super-admin + rate-limit.',
  },

  // ==== AUTH ====
  {
    site: 'ftg', category: 'auth', severity: 'medium', status: 'done',
    title: 'WebAuthn biométrie (passkeys) en place',
    description: 'Authentification passwordless via WebAuthn, RP_ID configuré, fallback password.',
    owner: 'claude-minato',
  },
  {
    site: 'ftg', category: 'auth', severity: 'high', status: 'open',
    title: 'Pas de rate-limit sur /api/auth/login',
    description: 'Endpoint login sans rate-limit → brute-force possible.',
    remediation: 'Ajouter Upstash Ratelimit (10 req/min/IP) ou Cloudflare Turnstile.',
  },
  {
    site: 'ftg', category: 'auth', severity: 'medium', status: 'open',
    title: 'HIBP password check non intégré',
    description: 'Pas de vérification Have-I-Been-Pwned à la création/changement de mot de passe.',
    remediation: 'Intégrer API HIBP k-anonymity avant submit.',
  },
  {
    site: 'cc', category: 'auth', severity: 'high', status: 'open',
    title: 'CC: pas de captcha sur login admin',
    description: 'Login admin unique sans captcha ni Turnstile.',
    remediation: 'Ajouter Cloudflare Turnstile (gratuit) sur /login.',
  },
  {
    site: 'ofa', category: 'auth', severity: 'medium', status: 'open',
    title: 'OAuth redirect URLs trop permissives',
    description: 'Redirect URLs OAuth incluent des wildcards ou des previews Vercel non nécessaires.',
    remediation: 'Restreindre aux domaines prod + 1 preview défini.',
  },

  // ==== MIDDLEWARE / PROXY ====
  {
    site: 'cc', category: 'middleware', severity: 'medium', status: 'open',
    title: 'Routes sensibles pas toutes gated dans middleware',
    description: 'Middleware/proxy.ts ne protège pas systématiquement /api/admin/*, s\'appuie sur chaque route.',
    remediation: 'Ajouter matcher /api/admin/:path* avec check auth centralisé.',
  },

  // ==== HEADERS HTTP ====
  {
    site: 'ftg', category: 'headers', severity: 'medium', status: 'open',
    title: 'CSP absente (Content-Security-Policy)',
    description: 'curl -I ne retourne pas de header CSP. Mozilla Observatory grade F sur ce point.',
    remediation: 'Définir une CSP stricte (default-src self + domaines whitelist).',
  },
  {
    site: 'ftg', category: 'headers', severity: 'low', status: 'open',
    title: 'HSTS non configuré (max-age insuffisant)',
    description: 'Strict-Transport-Security absent ou < 6 mois.',
    remediation: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    site: 'cc', category: 'headers', severity: 'medium', status: 'open',
    title: 'Permissions-Policy + Referrer-Policy manquants',
    description: 'Headers de durcissement manquants sur CC.',
    remediation: 'Ajouter Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy restrictive.',
  },
  {
    site: 'ofa', category: 'headers', severity: 'medium', status: 'open',
    title: 'X-Frame-Options / X-Content-Type-Options absents',
    description: 'OFA expose potentiellement des pages en iframe, MIME-sniffing non bloqué.',
    remediation: 'X-Frame-Options: DENY, X-Content-Type-Options: nosniff via next.config headers().',
  },

  // ==== RLS SUPABASE ====
  {
    site: 'ftg', category: 'rls', severity: 'high', status: 'open',
    title: 'Tables sensibles sans RLS: audit à compléter',
    description: 'Certaines tables (leads, subscriptions) à auditer pour confirmer RLS enabled + policies cohérentes.',
    remediation: 'Run pg_catalog query: verifier rowsecurity=true sur toutes tables user-facing.',
  },
  {
    site: 'cc', category: 'rls', severity: 'medium', status: 'in_progress',
    title: 'security_items RLS (admin only) — nouveau',
    description: 'Table security_items créée avec RLS admin-only.',
    owner: 'claude-minato', commit_hash: 'pending',
  },
  {
    site: 'ofa', category: 'rls', severity: 'high', status: 'open',
    title: 'Tables commerce_leads/social_credentials policies à durcir',
    description: 'Policies lecture/écriture à vérifier sur leads + credentials chiffrés.',
    remediation: 'Audit policies + test négatif (anon role doit 403).',
  },

  // ==== WEBHOOKS ====
  {
    site: 'ftg', category: 'webhook', severity: 'high', status: 'open',
    title: 'Stripe webhook signature verify à confirmer',
    description: 'Endpoint Stripe webhook → vérifier usage de stripe.webhooks.constructEvent() avec secret.',
    remediation: 'Logs + test avec payload forgé (doit 400).',
  },
  {
    site: 'cc', category: 'webhook', severity: 'medium', status: 'open',
    title: 'Resend webhook signature non vérifiée',
    description: 'Webhooks email bounce/complaint reçus sans verify signature.',
    remediation: 'Vérifier Svix signature header.',
  },

  // ==== SECRETS ====
  {
    site: 'global', category: 'secrets', severity: 'critical', status: 'verified',
    title: '.env* non commités (gitignore ok)',
    description: 'Audit repo: aucun .env.local dans git history.',
    owner: 'claude-minato',
  },
  {
    site: 'global', category: 'secrets', severity: 'high', status: 'open',
    title: 'SUPABASE_SERVICE_ROLE_KEY usage à auditer',
    description: 'Key service_role ne doit JAMAIS apparaître dans du code client/public.',
    remediation: 'grep "SERVICE_ROLE" dans app/ sans "process.env" côté server uniquement.',
  },

  // ==== DDoS / WAF ====
  {
    site: 'global', category: 'ddos', severity: 'medium', status: 'open',
    title: 'Pas de WAF Cloudflare devant Vercel',
    description: 'Vercel DDoS de base actif, mais pas de règles WAF custom ni Turnstile.',
    remediation: 'Cloudflare (proxy orange) + Turnstile sur forms publics. Gratuit.',
  },
  {
    site: 'cc', category: 'ddos', severity: 'low', status: 'open',
    title: 'Rate-limit global par IP absent',
    description: 'Pas de rate-limit transverse sur /api/*.',
    remediation: 'Upstash Ratelimit (free tier) 100 req/min/IP.',
  },

  // ==== DEPS ====
  {
    site: 'ftg', category: 'deps', severity: 'medium', status: 'open',
    title: 'npm audit: vulns à trier',
    description: 'Exécuter npm audit et lister CVEs high/critical.',
    remediation: 'npm audit fix + dependabot/renovate.',
  },
  {
    site: 'cc', category: 'deps', severity: 'low', status: 'open',
    title: 'npm audit CC: à exécuter régulièrement',
    description: 'Automatiser audit dans CI.',
    remediation: 'GitHub Action npm audit --audit-level=high weekly.',
  },

  // ==== CORS ====
  {
    site: 'cc', category: 'cors', severity: 'low', status: 'open',
    title: 'CORS Access-Control-Allow-Origin à vérifier',
    description: 'Certains endpoints renvoient * — à confirmer.',
    remediation: 'Whitelist explicite des origins autorisées.',
  },

  // ==== STACK (controls in place) ====
  {
    site: 'ftg', category: 'stack', severity: 'info', status: 'verified',
    title: 'Supabase Auth + cookies httpOnly secure',
    description: 'Sessions gérées via Supabase SSR, cookies httpOnly/Secure/SameSite=Lax.',
  },
  {
    site: 'cc', category: 'stack', severity: 'info', status: 'verified',
    title: 'Service role key côté server uniquement',
    description: 'SUPABASE_SERVICE_ROLE_KEY jamais exposée NEXT_PUBLIC_*.',
  },
]

for (const it of items) {
  const cols = ['site','category','severity','status','title','description','remediation','owner','evidence_url','commit_hash','resolved_at']
  const vals = cols.map((c) => {
    const v = it[c]
    if (v === undefined || v === null) return 'null'
    return `'${String(v).replace(/'/g, "''")}'`
  })
  const updates = cols.filter((c) => c !== 'site' && c !== 'category' && c !== 'title')
    .map((c) => `${c}=excluded.${c}`).join(', ')
  const sql = `
    insert into security_items (${cols.join(',')})
    values (${vals.join(',')})
    on conflict (site, category, title) do update set ${updates};
  `
  await run(sql)
}

const counts = await run(`select count(*)::int as n from security_items;`)
console.log('seeded:', counts)
