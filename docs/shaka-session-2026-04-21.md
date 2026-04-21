# 🧘 Shaka deep work — Command Center audit & consolidation

**Date** : 2026-04-21
**Agent** : Shaka (Virgo · précision divine · data/analytics)
**Origine** : audit navigation admin CC, consolidation doublons, harmonisation simulators.

---

## Contexte

Command Center grossissait en surface (~40+ pages admin) avec :
- 3 pages redirect legacy orphelines (`/admin/minato-arsenal`, `/neji`, `/infinite-tsukuyomi`)
- Doublons CRM (`/admin/crm` + `/admin/demo` + `/admin/demo-parcours` + `/admin/users` dispersés)
- Doublon tableau de bord (`/admin/analytics` vs `/admin/overview`, overlap ~80%)
- Funnel rates hardcodés dans `/admin/simulator/page.tsx` (2018 lignes) — impossible à réutiliser ailleurs
- QUICK_LINKS de l'overview pointant vers des routes legacy

Shaka = précision, coupure sans pitié du superflu, source de vérité unique.

---

## Livré

### 1. Purge des redirects legacy
- `rm -rf app/admin/{minato-arsenal,neji,infinite-tsukuyomi}/` — ces 3 pages ne faisaient qu'un `redirect` vers leur équivalent moderne. Les entrées correspondantes avaient déjà été retirées de la sidebar lors d'une session antérieure.

### 2. CRM Hub consolidé (`/admin/crm-hub`)
Nouveau layout unifié avec 4 onglets :
- **Utilisateurs** (`/crm-hub/users`) — profils FTG, tiers, Stripe
- **Leads** (`/crm-hub/leads`) — pipeline funnel simulator par produit
- **Démo** (`/crm-hub/demo`) — comptes test partagés
- **Parcours** (`/crm-hub/parcours`) — demandes démo + tours guidés

Layout : tabs-under-header avec `usePathname` pour état actif. Thème doré CC (#C9A84C).

### 3. Redirect stubs (anti-404 pour bookmarks)
- `app/admin/crm/page.tsx` → `/admin/crm-hub/users`
- `app/admin/demo/page.tsx` → `/admin/crm-hub/demo`
- `app/admin/demo-parcours/page.tsx` → `/admin/crm-hub/parcours`
- `app/admin/analytics/page.tsx` → `/admin/overview` (fusion 80% overlap)

### 4. Simulator funnels DRY (`lib/simulator-funnels.ts`)
- Nouveau module central : `PRODUCT_FUNNELS`, `computeStageVolumes`, `funnelTotalConversion`, types `ProductKey` / `FunnelStage` / `ProductFunnel`.
- Utilisé par la nouvelle page `/admin/crm-hub/leads`.
- **Divergence documentée** : `/admin/simulator/page.tsx` garde sa copie locale (comments métier riches, rates post-calibration 2026-04-21). Reconciliation prévue quand Funnel Registry v1 sera déployé.

### 5. Sidebar admin (`app/admin/layout.tsx`)
- Entrées "Démo", "Parcours", "Users", "CRM" regroupées sous **CRM Hub** dans le groupe **Ops & Contenu**.

### 6. Overview cleanup
- `QUICK_LINKS` → pointent vers `/admin/crm-hub` + `/admin/simulator` (retrait routes legacy orphelines).

---

## À faire — Shaka phase 2

1. **Funnel Registry v1** (DB-persistable)
   - Table `funnel_definitions(product, stage_id, stage_label, default_rate, calibrated_rate, source)`
   - Table `funnel_calibrations(product, stage_id, measured_rate, sample_size, period_start, period_end)`
   - Cron hebdo : mesure conversion stage→stage depuis events Supabase, calibre `calibrated_rate`.
   - `lib/simulator-funnels.ts` lit DB avec fallback sur defaults.
   - Unifie simulator + leads + VR + MRR MAX sur une seule source.

2. **Harmonisation simulators**
   - Intégrer `/admin/vr` (Vision vs Réalisé) + `/admin/mrr-max-scenarios` comme onglets du Simulator principal.
   - Ou inversement : garder 3 pages séparées mais avec header commun + breadcrumb "Stratégie".
   - Décision à prendre post-Funnel Registry (pour éviter de déplacer du code hardcodé).

3. **Analytics info perdues lors du redirect**
   - `new 7d users` KPI → ajouter à overview.
   - `with credits` KPI → ajouter à overview.
   - `top countries by opportunities` → ajouter à overview (section compact).

4. **Users/Demo/Parcours sub-pages crm-hub**
   - Sub-pages déplacées depuis `/admin/users`, `/admin/demo`, `/admin/demo-parcours` vers `/admin/crm-hub/{users,demo,parcours}` — vérifier que layouts hérités (header CC) ne conflictent pas avec le nouveau layout CRM Hub (tab header).

---

## Notation

- **Avant Shaka** : 40+ pages admin, 3 stubs orphelins, 4 doublons CRM, 2 overviews séparés, funnel rates dupliqués.
- **Après Shaka** : –3 stubs orphelins, –3 doublons CRM (via redirect), –1 overview (analytics fusionné), +1 source funnel réutilisable.

Cut net sans perte de fonctionnalité navigable.
