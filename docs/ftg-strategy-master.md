# FTG — Stratégie master (mise à jour 2026-04-17)

Document maître de la stratégie Feel The Gap. Maintenu en parallèle du projet `/var/www/feel-the-gap/` ; référencé depuis le Command Center.

> **Rôle Claude dans ce document** : je personnifie la plateforme FTG ici. Ce fichier accumule mes analyses, décisions et projections. À chaque nouvelle session, relire ce document AVANT d'agir sur FTG.

---

## 0. État actuel (snapshot 2026-04-17)

- **ARR courant** : ~€14M (base €1.2M MRR depuis session 2026-04-11, leviers P5 en cours)
- **Tiers confirmés** : `29 € / 99 € / 149 € / 299 €` (Data / Strategy / Premium / Ultimate)
- **Couverture DB** : 115 pays × 10 144 produits × 1 163 règles réglementaires × 5 315 benchmarks coûts × 1 809 corridors logistiques × 191 business plans 3 scénarios
- **Infra** : Vercel + Supabase (projet partagé `jebuagyeapkltyjitosm`) + Auth-v2 (WebAuthn + OTP) + cron Vercel (8 jobs actifs)
- **Deploy** : `feel-the-gap.vercel.app` (prod), `feel-the-gap.duckdns.org` (VPS local pour dev)

---

## 1. Production 3.0 — nouvelle brique parcours

**Implémentée 2026-04-17. Détails dans `/var/www/feel-the-gap/supabase/migrations/20260417220000_production_methods.sql` + seed Café.**

### Principes
- Brique insérée entre "Rapport opportunités" et "Business plan"
- Expose méthodes de fabrication réelles (procédés, machines, matières, coût, temps, qualité, capex/opex)
- Comparateur multi-critères avec cellules éditables + score pondéré
- Médias (images + vidéos)

### Pilote Café
- 6 méthodes : 3 procédés (natural / washed / honey) × 3 torréfactions (artisanal / semi-indus / industriel)
- 18 resources (2 machines + 1 matière par méthode)
- 6 metrics (cost/quality/capex/opex)
- 12 media (1 image + 1 vidéo par méthode)

### À dérouler
- Seeds supplémentaires : cacao, textile, anacarde, huile_palme, mangue (même gabarit)
- Page front `/country/[iso]/methods` (UI comparateur, à construire)
- Intégration `<ProductSelectorChips />` sur toutes les étapes Production 3.0 + Fill the Gap

---

## 2. Quotas Fill the Gap (Premium / Ultimate)

**Implémenté 2026-04-17. Table `user_fillthegap_quota` + 4 RPCs.**

- **Premium (149 €)** : 150 crédits/mois
- **Ultimate (299 €)** : 250 crédits/mois
- Reset 1er du mois (cron 00:01 UTC, `/api/cron/reset-fillthegap-credits`)
- Rollover = 0 (mention CGV discrète uniquement)
- Déclencheur débit = passage Feel the Gap → Fill the Gap (videos, clients, store, recap, AI engine, bulk BP)
- Modal confirmation unitaire + modal bulk agrégée (checkboxes sur `/reports/[iso]`)
- Compteur live dans sidebar
- AI engine Ultimate = cascade ×3 coût (design doc `/docs/ai-cascade-design.md`, scénario HYBRID recommandé)

---

## 3. Géo-pricing PPP (P5 — +€446K MRR attendu)

**Implémenté 2026-04-17. `lib/geo-pricing.ts` (247 pays, 4 tiers couverts).**

- Multiplicateurs basés sur WB PPP + Big Mac + Numbeo + IMF
- Clamped entre 0.40× et 1.30×
- Detection via Cloudflare `CF-IPCountry` → fallback Vercel → Accept-Language
- Intégré au checkout Stripe (plan + cc param) et à la page `/pricing` (5 colonnes Free/Data/Strategy/Premium/Ultimate)
- **Environnement Stripe à provisionner** : `STRIPE_PRICE_STRATEGY_MONTHLY`, `STRIPE_PRICE_ULTIMATE_MONTHLY`, `STRIPE_PRODUCT_STRATEGY`, `STRIPE_PRODUCT_ULTIMATE`

---

## 4. Churn reduction (P5 — +€73K MRR attendu)

**Implémenté 2026-04-17. Route `/api/churn` upgradée : envoi effectif emails + dedup 7j.**

- 3 niveaux selon score risque :
  - `send_tips` (risk 40-59)
  - `reengagement_email` (risk 60-79, sujet "nouveaux pays débloqués")
  - `urgent_outreach_discount` (risk ≥ 80, offre -50% x3 mois)
- Templates inline HTML + text, envoi via Resend
- Dedup 7j par (user, action_type) anti-spam
- Déclenché par cron `/api/churn` quotidien 8h UTC

---

## 5. Drapeaux corrompus — fix (bug découvert 2026-04-17)

**211/211 pays avaient leur flag shifté de -6 sur les regional indicators** (ex: CIV stocké `BC` au lieu de `CI`).

- Fix via helper SQL `iso2_to_flag(iso2)` déterministe + IMMUTABLE
- Backfill `UPDATE countries SET flag = iso2_to_flag(iso2)` → 211/211 valides (8 octets UTF-8 chacun)
- Migration `20260417230000_fix_flags_iso2_helper.sql`

---

## 6. Industrialisation 115 pays (tâche background)

**Lancée 2026-04-17 (en cours). Objectif : couvrir tous les pays (vs 30 pilotes).**

Agents exécutés :
- `factbook-enrich.ts` : 119 pays enrichis (92 skipped sans data CIA)
- `energy-enrich.ts` : 200 pays enrichis avec % renouvelable + score coût énergie
- `regulatory-collector.ts` : **115 pays** / 1 163 règles (était 30/327)
- `production-costs.ts` : **30 pays** / 5 315 benchmarks (était 17/3 947)
- `logistics-collector.ts` : 30 origines / 1 809 corridors (en cours, OpenAI 429 → Groq fallback)
- `batch-enriched-plans.ts` : 191 business plans 3 scénarios (pilotes × 6 produits)

**À faire** :
- Finir logistics (fallback en attente reset quotas)
- Étendre batch-enriched-plans aux 30+ pays enrichis (vs 6 pilotes)
- Quota YouTube 50k/jour à demander (actuellement saturé)

---

## 7. API institutionnelle — nouveau segment (Palier 7)

**Positionnement :** "Trade Operations Platform" (nouvelle catégorie, complément Bloomberg, PAS concurrent).

### Bloomberg reference
- Bloomberg L.P. : **~$13 Mds CA/an**, 325 000 terminaux à $24K/an
- Bloomberg = finance/markets temps réel
- FTG = trade opérationnel (coûts production, corridors, réglementation, business plans)
- Overlap uniquement sur commodity data, mais angles différents (traders vs exportateurs/gov)

### Pricing API institutionnel (À VALIDER)
| Tier | Ticket/an | Seats | Couverture | Cible |
|---|---|---|---|---|
| **Starter Public** | €12K | 1 | 50 pays, 5k req/j | Consulat, petite CCI |
| **Pro Institutional** | €40K | 5 | 195 pays, 50k req/j, white-label docs | Agence export régionale |
| **Enterprise** | €120K | 20 | 195 pays + historique, SLA 99.9% | Ministère commerce, stats nationaux |
| **Sovereign** | €300K+ | illimité | Hébergement dédié EU, mirroring | Union gov multi-pays, PNUD, BM, FAO |

**Règles** : flat-fee tiered, jamais usage-based (mémoire `feedback_cost_min_fixed`). Soft caps avec upsell, pas de mur 402. Durations 12/24/36 mois dégressif -10/-20/-30%.

### Add-ons margin-rich
- Rapport custom LLM sur brief : €5-15K par livrable
- API sector deep-dive (HS6 ciblé) : €20-50K/an
- Workshops trade en présentiel : €30-80K/session

### Closers humains + AI Whisperer (stratégie acquisition)
- **Scout IA** + qualif (€0.50-2)
- **Warm-up automatique** (3 emails + LinkedIn, €0.20)
- **Call fermeture local langue** (call center Maroc/Sénégal/Philippines/Colombie, €30-80/deal)
- **AI Whisperer live** (OpenAI Realtime, €2-5/call, souffle réponses au closer en 2-3s)
- **CAC blended** €500-1000/deal vs €1500-3000 AE senior Europe
- **LTV/CAC ratio** : 180-360× (vs 30× top décile SaaS)

### Pipeline Y1 (168 prospects P1+P2)
| Segment | # prospects | Ticket moyen | ARR Y1 (15 % conversion) |
|---|---|---|---|
| Ministères FR/EU/Afrique | 30 | €100K | €450K |
| Agences export (Business France, Pro-XYZ) | 25 | €60K | €225K |
| Consulats & SE régionaux | 40 | €25K | €150K |
| Instituts stats (INSEE, HCP, ANSD) | 15 | €40K | €90K |
| CCI régionales + internationales | 30 | €30K | €135K |
| Orgs internationales (FAO, FMI, BM, UNCTAD) | 12 | €200K | €360K |
| Universités / recherche | 10 | €20K | €30K |
| White-label consulting (McKinsey/BCG) | 6 | €350K | €315K |
| **TOTAL** | **168** | — | **€1.75M ARR Y1** |

### Livrables produits aujourd'hui
- `docs/sales-playbook/kit-argumentaire-v1.md` (260 lignes, 7 segments, 7 objections, protocole AI Whisperer, deal escalation ladder)
- `docs/sales-playbook/institutional-prospects-v1.md` (pipeline 168 prospects avec tickets par segment)

---

## 8. Potentiel €1 Mds ARR en 5 ans — analyse

**Verdict honnête : €1B en 5 ans est top 1 % outcome. Réaliste : €300-500M ARR.**

### Trajectoire hockey-stick (scénario €1B)
| Année | ARR | Capital cumulé levé | Dilution founders |
|---|---|---|---|
| Y0 (2026) | €14M | €0 (bootstrap) | 0% |
| Y1 (2027) | €70M | €15-25M (Seed+A) | ~10% |
| Y2 (2028) | €220M | +€60-100M (B) | ~25% |
| Y3 (2029) | €480M | +€150-250M (C) | ~40% |
| Y4 (2030) | €750M | +€200-300M (D) | ~50% |
| **Y5 (2031)** | **€1 000M** | **€450-700M total** | **~55-65%** |

### Répartition investissement €600M
- Commercial (closers, SDR, call centers) : **€145M** (24%)
- M&A acquisitions trade data + boutiques consulting : **€200M** (33%)
- Runway buffer + ops + legal : **€100M** (17%)
- International 6 bureaux régionaux : **€55M** (9%)
- Tech + IA + infra : **€50M** (8%)
- Marketing + SEO + partenariats : **€48M** (8%)

### Conditions execution hockey-stick
1. Signer 10+ contrats institutionnels d'ici M12
2. Category creation "Trade Operations Platform" validée par VC tier-1
3. Data moat 195 pays × 50 produits × 10 ans historique
4. M&A opportuniste : Trading Economics ~$150M, IHS Maritime subsets, boutiques consulting trade
5. Investisseurs tier-1 (Sequoia / a16z / Index / Accel)

### Risques qui peuvent tuer le hockey-stick
- Cycle de vente gov 6-18 mois (déprime métriques SaaS)
- Compliance data souveraineté (RGPD++, Cloud Act, localisation EU)
- Consolidation concurrente (Bloomberg pivot, S&P acquérant un startup trade)
- Dilution excessive si €700M levé (founders à < 20 %)

### Recommandation tactique
**Viser €300-500M ARR en 5 ans** (IPO-able, founders à ~40 %, valorisation IPO 10-15× ARR = €5-7 Mds marketcap, top 1 % européen).
**Puis pivot** vers trajectoire €1B en Series C-D si execution dépasse Y2-Y3.

### 3 scénarios résumés
| Scénario | Cible 5 ans | Capital levé | Dilution | Probabilité |
|---|---|---|---|---|
| Conservateur | €200-300M | €50-80M | 25% | **70%** |
| Agressif réaliste | €500-600M | €150-250M | 40% | **30%** |
| Hockey-stick €1B | €1 000M | €450-700M | 55-65% | **10-15%** |

---

## 9. Roadmap paliers de croissance

| Palier | État | ΔMRR | Leviers clés |
|---|---|---|---|
| P1-P4 | ✅ Complétés | 0→€1.2M | Data-first + PMF + Growth Engine + Scale |
| **P5** | 🟡 En cours | +€1.3M | 15 langues ✅, SEO Factory ✅, Social Autopilot ✅, Produits ✅, Influenceurs IA ✅, **Geo-pricing ✅**, **Churn ✅** (reste : upsell engine A/B testing) |
| P6 Profit Max | Pending | +€1.1M | Upsell auto, A/B pricing, 9k posts/j prod, Enterprise + API B2B, PWA mobile |
| **P7 Market Leadership** | Pending | +€1.4M | **API publique (+€200K)** + **White-label gov (+€300K)** + **AI closers autonomes** + **Marketplace take-rate (+€300-500K)** |
| P8 Platform Dominance | Pending | +€5M | Acquisitions datasets (Comtrade, douanes) + Bureaux régionaux + Certifications |

---

## 10. Prochaines étapes prioritaires

### Immédiat (semaine 17 avril - 24 avril 2026)
1. **Finir industrialisation 115 pays** (logistics + batch-enriched-plans aux 30 pays)
2. **Valider pricing API institutionnel** avec user (12K/40K/120K/300K)
3. **Scout institutionnel dédié** (agent scraper gouv/CCI/consulats + LinkedIn patterns) → porter pipeline de 168 à 500+ prospects
4. **Recrutement 1er closer pilote** (FR-Afrique francophone) + ouverture LinkedIn Sales Nav
5. **MVP AI Whisperer** (Realtime API + overlay Chrome extension, 2-3j dev)

### Court terme (mois 1-3 post-industrialisation)
6. **20-30 premiers appels pilote** sur P1 (ministères FR, Business France, AMDIE, CEPICI, APIX)
7. **Itération kit argumentaire v1 → v2** selon retours terrain
8. **Stripe live** (bloqué fin avril 2026 — société US en cours)
9. **Setup partenariat call center** (Maroc ou Sénégal prioritaire)
10. **Production 3.0 UI** : page `/country/[iso]/methods` + intégration ProductSelectorChips partout

### Moyen terme (mois 3-12)
11. **Palier 6 Upsell engine** + A/B testing pricing
12. **Palier 7 démarrage** : API publique (docs + pricing page dédiée) + Marketplace DB
13. **Premiers contrats signés** : target 10+ institutionnels M12
14. **Series A** (€15-25M) après 3-5 contrats signés pour crédibilité

### Long terme (mois 12-60)
15. **Category creation** "Trade Operations Platform" dans les rapports Gartner/Forrester
16. **M&A** (Trading Economics, IHS Maritime subsets, boutiques consulting trade)
17. **Bureaux régionaux** Afrique/Asie/LatAm (6 pays cibles)
18. **IPO-ready** à €300-500M ARR (environ Y5)

---

## 11. Historique sessions (journal)

- **2026-04-11** : Palier 5 démarré, 15 langues, SEO Factory, agents scale, simulation revenue €3.6M MRR
- **2026-04-17** : Production 3.0 + quotas Fill the Gap + geo-pricing 4 tiers + churn sending + drapeaux DB fix + industrialisation 115 pays (en cours) + kit argumentaire + pipeline 168 prospects + analyse €1B
