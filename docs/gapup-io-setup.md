# 📮 gapup.io — Setup cold outreach machine

**Date** : 2026-04-21
**Usage** : Machine cold email pour Feel The Gap (3 personas, Instantly scale)
**Rattachement légal** : DBA "GapUp" sous Saga Ventures LLC (phase 1)

---

## Pourquoi domaine séparé (pas ftg-direct)

Protection réputation email. Si Gmail flag `gapup.io`, le domaine principal FTG (`feel-the-gap.com`) reste clean.

---

## État live (2026-04-21 ~05:00 UTC)

| Composant | Status | Détails |
|---|---|---|
| Achat Namecheap | ✅ Fait | Auto-renew ON · WhoisGuard/Privacy ON sur tous domaines |
| Cloudflare | ✅ Actif | Nameservers `burt.ns.cloudflare.com` + `tia.ns.cloudflare.com` |
| Namecheap DNS | ✅ Custom DNS → Cloudflare | DNSSEC OFF confirmé |
| Cleanup DNS Namecheap defaults | 🔄 EN COURS | 7 records à supprimer (MX eforward + parking A/CNAME + TXT SPF Namecheap) |
| Google Workspace | ⏳ À commander | $21/mo (3 mailboxes Business Starter) |
| Mailboxes | ⏳ À créer | alex@ · maria@ · thomas@ |
| Instantly | ⏳ Bloqué | Attend mailboxes externes (exige Google/MS365) |
| Warmup | ⏳ À activer | 2-4 semaines par mailbox avant send réel |

---

## 3 personas pré-créés en DB FTG

Statut `is_active = false` (commit `ccc84ad`, docs + DB).

| Persona | Voice | Segment cible |
|---|---|---|
| **alex@gapup.io** | direct, data-driven | traders, investors |
| **maria@gapup.io** | narrative, empathic | entrepreneurs, founders |
| **thomas@gapup.io** | formal, strategic | corporate procurement |

---

## Pourquoi 3 mailboxes (pas 1 ou 5)

1. **Rotation deliverability** : Gmail spam flag si 1 boîte >50-150/jour. 3 boîtes = 150-450/jour (~4500-13k/mo sweet spot)
2. **Voice matching par segment** : direct vs narrative vs formel
3. **Risk distribution** : 1 mailbox flagué ≠ machine morte
4. **Warmup parallèle** : 2-4 sem × 3 en parallèle vs 6-12 sem séquentiel
5. **A/B signal** : reply rate par persona mesurable
6. **Brand depth** : perception "équipe légit" vs "1 solo spammeur"

---

## Coûts cold outreach récurrents

| Poste | Setup | Mensuel | Annuel |
|---|---:|---:|---:|
| Namecheap gapup.io | $35-45 | — | $50/an renew (.io) |
| Cloudflare Free | $0 | $0 | $0 |
| Google Workspace (3 mailboxes) | $0 | $21 | **$252/an** |
| Instantly Growth | $0 | $37 | **$444/an** |
| Apollo (lead gen, optionnel) | $0 | $99 | $1188/an |
| **Total minimal (sans Apollo)** | **~$45** | **$58** | **~$750/an** |
| **Total avec Apollo** | **~$45** | **$157** | **~$1,940/an** |

**Payback** : 1 client FTG Strategy (€99+) couvre tout.

---

## Google Workspace signup — champs à remplir (pré-LLC)

User n'a pas encore Saga Ventures LLC → rempli comme **Sole Proprietor** :

| Champ | Valeur |
|---|---|
| Business name | `GapUp` (label brand, pas entité légale) |
| Legal entity type | Sole Proprietor / Individual |
| Number of employees | 1-2 |
| Region | France |
| Contact | Nom réel + adresse perso + tel perso |
| Domain | "Use a domain I already own" → `gapup.io` |
| Plan | Business Starter $6/user/mo |
| Admin email | `mehdi@gapup.io` |
| Payment | Carte perso (transférer Mercury post-LLC) |

---

## Records DNS à ajouter dans Cloudflare (post Workspace)

Google fournira automatiquement :
- 5 MX records : `aspmx.l.google.com` + `alt1-4.aspmx.l.google.com` (prio 1, 5, 5, 10, 10)
- TXT SPF : `v=spf1 include:_spf.google.com ~all`
- TXT DKIM (généré depuis Gmail admin)
- TXT `google-site-verification=...` (ownership check)
- TXT DMARC : `v=DMARC1; p=none; rua=mailto:postmaster@gapup.io`

---

## Flow Instantly post-mailboxes

1. Instantly → Email Accounts → **Add new → Connect existing accounts**
2. Provider : Google
3. OAuth avec chaque mailbox
4. Onglet Warmup → activer sur chaque compte
5. Settings → API Keys → Create (intégration Minato agents)

---

## Rattachement structure Sanctuary Trust

- **Phase 1** (maintenant → MRR FTG < $50k ARR) : DBA "GapUp" sous **Saga Ventures LLC**
- **Phase 2** (FTG ≥ $50k ARR) : DBA "GapUp" migre sous **Aries Holdings LLC** (maison du Bélier, gardienne FTG)

Voir `/root/command-center/docs/sanctuary-trust-architecture.md`.
