# Auth Isolation — Decision Note (2026-04-15)

## Context
Les 3 apps prod (FTG, CC, OFA) partagent **le même projet Supabase**
(`jebuagyeapkltyjitosm`). Un utilisateur enregistré sur FTG peut donc se connecter
à CC et OFA avec les mêmes credentials. Cela viole la règle
`feedback_per_site_user_isolation`.

## Options

### Option A — 3 projets Supabase séparés (cloisonnement fort)
- 1 projet Supabase par app (FTG garde l'existant, CC et OFA migrent).
- Chaque `auth.users`, `webauthn_credentials`, `profiles` est indépendant.
- Emails brandés nativement (SITE_URL + templates par projet).
- OAuth Google configuré par projet.
- **Coût** : 3x free tier Supabase — OK tant que < 50k MAU / projet.
- **Migration** : 2h × 2 apps (CC, OFA) = 4h. Users existants CC/OFA doivent se
  réinscrire (mails annonce).

### Option B — 1 projet partagé + table `site_access` (cloisonnement applicatif)
- Ajouter `site_access(user_id uuid, site_slug text, created_at timestamptz, UNIQUE(user_id, site_slug))`.
- Middleware/proxy de chaque app vérifie `site_access(user, SITE_SLUG)` après signin.
- Forgot/signup passent par la même table.
- **Coût** : 0€ (même projet).
- **Migration** : 1 migration SQL + patch proxy.ts x3 = 2h total.
- **Faille résiduelle** : un user peut techniquement déclencher `signUp` sur le
  projet partagé (via Supabase client) et apparaître dans `auth.users`. Il sera
  bloqué par `site_access` mais sa ligne existe. À accepter si on désactive
  `signUp` côté client et qu'on force l'inscription via API serveur qui insère
  aussi dans `site_access`.

## Recommandation : **Option B** (pragmatique, réversible)

**Justification** :
1. **Compat users existants** : FTG a déjà des users payants. Migration A = tous
   les users FTG doivent refaire un compte sur CC/OFA même si FTG garde les
   siens (personne ne partage CC/OFA publiquement pour l'instant → low blast).
   B = 0 disruption ; on backfill `site_access` pour tous les users existants
   sur le site où ils sont nés (via logs / profile table).
2. **Effort** : B = 2h vs A = 4h + risque de casser OAuth Google sur 2 projets.
3. **Réversibilité** : B → A plus tard si on atteint 10k MAU partagés. A → B
   impossible sans re-fusion manuelle.
4. **Coût** : B = 0€, A = 0€ aussi pour l'instant (free tier) mais 3 dashboards
   à monitorer, 3x rate-limit quotas, 3x cron jobs.

**Trade-off accepté** : pour fermer la faille rapidement (< 1j), on va en B.
Si cross-contamination des emails de reset devient un problème user-facing
(branding email FTG envoyé à user CC), on migre vers A au prochain sprint.

## Steps migration Option B (proposés — pas exécutés)

1. **Migration SQL** (Supabase partagé) :
   ```sql
   CREATE TABLE IF NOT EXISTS public.site_access (
     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
     site_slug text NOT NULL CHECK (site_slug IN ('ftg', 'cc', 'ofa')),
     created_at timestamptz DEFAULT now(),
     PRIMARY KEY (user_id, site_slug)
   );
   ALTER TABLE public.site_access ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "read_own" ON public.site_access FOR SELECT USING (auth.uid() = user_id);
   ```
2. **Backfill** : pour chaque user, deviner le site d'origine via la première
   row `profiles` / `ftg_profile` / `cc_users` / `ofa_admins` (heuristique, à
   affiner). Tous les users aujourd'hui appartiennent **à FTG** de facto.
   ```sql
   INSERT INTO site_access (user_id, site_slug)
   SELECT id, 'ftg' FROM auth.users
   ON CONFLICT DO NOTHING;
   ```
3. **Patch `/api/auth/login`** (créé dans Fix 1) :
   après `signInWithPassword` OK, query `site_access` pour `SITE_SLUG`
   (nouvelle env var par projet). Si aucune ligne → `signOut()` + 401 "compte
   inconnu sur ce site".
4. **Patch `/api/auth/register`** : après `signUp`, `INSERT INTO site_access`
   avec `SITE_SLUG` courant.
5. **Patch forgot-password** : avant `resetPasswordForEmail`, vérifier via
   admin client qu'une ligne `site_access(user, SITE_SLUG)` existe — sinon
   réponse "email envoyé si le compte existe" (uniform response, anti-enum).
6. **Désactiver signUp côté client** partout sauf `/auth/register` qui hit
   `/api/auth/register` (server-side avec insert `site_access`).
7. **Tester** : compte FTG → login CC doit renvoyer 401 "compte inconnu".

## À faire pour Option A si on change d'avis plus tard
Voir `/root/.claude/projects/-root/memory/feedback_per_site_user_isolation.md`
section "Migration à faire (Option A)" — 6 steps, ~6h total.
