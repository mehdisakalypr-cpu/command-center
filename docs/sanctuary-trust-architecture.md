# 🔱 Sanctuary Trust — Architecture légale complète

**Date décision** : 2026-04-21
**Inspiration** : Saint Seiya — 12 chevaliers d'or gardiens du Sanctuary
**Secret code** : invisible dans docs légaux (banquiers/avocats voient juste des "noms exotiques")

---

## Structure cible

```
┌─────────────────────────────────────────────────┐
│ SANCTUARY TRUST (Wyoming DAPT ou Nevada)        │
│ - Trustee: Mehdi (+ co-trustee pro avocat)      │
│ - Beneficiary: Mehdi + futurs enfants           │
│ - Purpose: asset protection + transmission      │
│ 🔱 "Le lieu sacré qui garde Athéna"             │
└──────────────────┬──────────────────────────────┘
                   │ owns 100%
                   ▼
┌─────────────────────────────────────────────────┐
│ SAGA VENTURES LLC (Wyoming)                     │
│ - Member: Sanctuary Trust (nom user NON public) │
│ - Manager: Northwest Registered Agent (shield)  │
│ - EIN IRS                                       │
│ ⚔ "Grand Pope — opère au nom d'Athéna"          │
└──────────────────┬──────────────────────────────┘
                   │ owns 100% each (progressif)
                   ▼
   ┌──────┬──────┬──────┬──────┬──────┬──────────┐
   ▼      ▼      ▼      ▼      ▼      ▼          ▼
 Aries  Alde-  Aiolia Shaka  Dohko  Milo       ...
 LLC    baran  LLC    LLC    LLC    LLC
 (FTG)  LLC
        (OFA)
```

---

## Mapping 12 Maisons zodiacales → produits

| Maison | LLC name | Gold Saint | Produit |
|:--:|---|---|---|
| ♈ Aries | **Aries Holdings LLC** | Mu | Feel The Gap |
| ♉ Taurus | **Aldebaran LLC** | Aldebaran | One For All |
| ♊ Gemini | *Saga Ventures (parent)* | Saga | — (parent holding) |
| ♋ Cancer | **Cancer Holdings LLC** | (Deathmask évité) | The Estate |
| ♌ Leo | **Aiolia LLC** | Aiolia | Shift Dynamics |
| ♍ Virgo | **Shaka LLC** | Shaka | Data/Analytics (Kurama) |
| ♎ Libra | **Dohko LLC** | Dohko | Legal/IP/Compliance |
| ♏ Scorpio | **Milo LLC** | Milo | Security stack |
| ♐ Sagittarius | **Aiolos LLC** | Aiolos | Outreach/Marketing |
| ♑ Capricorn | **Shura LLC** | Shura | Enterprise/Premium |
| ♒ Aquarius | **Camus LLC** | Camus | AI Labs (SUK) |
| ♓ Pisces | **Aphrodite LLC** | Aphrodite | Creative/Content |

**Convention** : noms de **Gold Saints** (pas les signes zodiacaux), car :
- Signes zodiacaux (Taurus/Leo/Virgo) = saturés dans les registres
- Gold Saints = ultra-rares, noms grecs-like qui passent bien aux US
- Le banquier ne voit pas la référence anime → perçu comme "nom premium neutre"

---

## Règles de scission par seuil MRR

Un produit ne gagne sa maison zodiacale qu'en méritant son armure d'or via le MRR :

| MRR produit | Action légale |
|---|---|
| < $4k/mo | DBA sous **Saga Ventures LLC** (pas de LLC dédiée) |
| ≥ $4k/mo ($50k ARR) | **File la LLC Gold Saint dédiée** |
| ≥ $50k/mo ($600k ARR) | Considère Series LLC Delaware + C-corp top |
| ≥ $200k/mo ($2.4M ARR) | Évalue exit possible (clean sale de l'entité) |

---

## Résultats check name dispo Wyoming (2026-04-21)

| Nom | Verdict | Confiance |
|---|---|---|
| ✅ Sanctuary Trust | clean | 🟢 |
| ✅ Saga Ventures LLC | clean | 🟢 |
| ⚠ Saga Holdings LLC | A&A Saga Holdings existe (Sheridan WY) | 🟡 risque refus similarité |
| ✅ Pope Holdings LLC (fallback parent) | clean | 🟢 |
| ✅ Aries Holdings LLC | clean | 🟢 |
| ❌ Taurus Holdings LLC | PRIS Cheyenne WY (→ raison du pivot vers Aldebaran) | 🔴 |
| ✅ Aldebaran Holdings LLC | clean | 🟢 |

**Validation finale** = Northwest Registered Agent check SOS direct gratuitement avant filing.

---

## Phasing exécution

```
Semaine 1 (post-cash-flow client #1):
  - File Saga Ventures LLC via Wyoming Registered Agent LLC (~$250)
  - Décrire business "SaaS/software services"

Semaine 2-6:
  - EIN IRS (4-6 sem délai fax +1-855-641-6935)
  - Dès EIN : Mercury Bank
  - W-8BEN-E Stripe

Mois 2:
  - Transférer subscriptions (Apollo/Instantly/Workspace) sur Mercury
  - File DBAs : GapUp, Feel The Gap, One For All, The Estate, Shift Dynamics

Mois 3-6 (post-MRR stable >$5k):
  - File Sanctuary Trust (Jennifer Bailey, Wyoming Trust & LLC Attorney)
  - Assign Saga Ventures → Sanctuary Trust (1-page amendment)
  - CPA non-résident engagé pour Form 5472 janvier n+1

Mois 6-12+ (selon MRR par produit):
  - Aries Holdings LLC → FTG ≥ $50k ARR
  - Aldebaran LLC → OFA ≥ $50k ARR
  - Etc, progressif
```

---

## Prestataires validés

| Service | Prestataire | Prix |
|---|---|---|
| Formation LLC | **Wyoming Registered Agent LLC** ⭐ | $99 + $100 state + $50 EIN |
| Registered Agent | Northwest Registered Agent | $125/an (privacy max) |
| Trust setup | Wyoming Trust & LLC Attorney (Jennifer Bailey) | $1500-3000 + $500-800/an admin |
| CPA non-résident | James Baker CPA / O&G / TaxHack | $500-800/an (5472+1120) |
| Banque | Mercury Bank | $0 (fallback: Relay, Wise Business) |
| Fiscaliste Portugal NHR | Belion Partners / Fresh Portugal | $300-500 consultation |

---

## Fiscalité résidence (critique)

**Contexte user** : expatriation France prévue 2026, résidence probable **Portugal NHR**.

**Reco** : Portugal NHR + élection **C-Corp** (Form 8832 dans 75 jours formation LLC) =
- US corp tax 21% sur profits
- Dividendes étrangers 0% sous NHR
- Effectif **~21%** vs 28-30% en disregarded LLC passthrough

⚠ LLC disregarded par défaut = profits remontent même si cash reste en Mercury.

---

## Lien Command Center

- Sauvegarde memory Claude : `/root/.claude/projects/-root/memory/project_sanctuary_trust_architecture.md`
- Setup domaine cold outreach : `/root/command-center/docs/gapup-io-setup.md`
- Coût complet consolidé : `/root/command-center/docs/cost-breakdown-legal-infra.md`
