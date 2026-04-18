/**
 * Insert creator score for session 2026-04-17 07h41 UTC → 2026-04-18 matin :
 *  · 🔐 AUTH-V2 CANONIQUE : CC migré sur la brick canonique + consolidation des dossiers legacy
 *  · 🔐 PER-SITE PASSWORD ISOLATION (Option C) — plus de mutualisation de mot de passe
 *  · 🧪 SENKU RCA appliqué : bytea bug — ship en \x<hex> et non Buffer raw
 *  · 🔐 WebAuthn/biométrie : hide button until passkey + auto-propose + align finish body + drop Turnstile (read-only)
 *  · 🔐 CSRF centralisé via authFetch helper + fix mfa/verify + x-csrf-token forgot/reset
 *  · 🔐 Supabase cookie/proxy P0 fix : proxyConfig→config + cookie setAll persistence
 *  · 🔒 Aria voice interface / root GATED — pas publique
 *  · 🎨 UX auth : eye icons + logout sidebar/floating/admin + /account password change
 *  · 📘 FTG stratégie master + country-population (bootstrap+M&A souverain) + Solo Producer tier €19.99/mo
 *  · 🧪 E2E regression suite auth (détection chicken-and-egg)
 *
 * Volume : 29 commits CC en 15h, 385 files, +29,008 / -2,518 lignes.
 * Autres projets (consulting/estate/isekai) : zéro commit.
 * Dernier score = 2026-04-17 07h41 UTC : overall 92 ssj_blue.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(p: string) {
  try {
    for (const l of readFileSync(p, 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (!m) continue
      let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  } catch {}
}
loadEnv('/root/command-center/.env.local')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const captured_at = new Date().toISOString()

const overallScore = {
  captured_at,
  score: 93,
  category: 'overall',
  project: 'global',
  tier_code: 'ssj_blue',
  session_summary:
    "Session 2026-04-17 07h41 UTC → 2026-04-18 matin — MARATHON AUTH-V2. 29 commits CC en 15h : migration brick canonique auth-v2, per-site password isolation (Option C), WebAuthn/biométrie cleanup, CSRF centralisé via authFetch, Senku RCA bytea (\\x<hex>), Supabase cookie/proxy P0 fix, Aria / root gated, /account page, E2E auth regression suite, stratégie FTG master + country-population + Solo Producer tier €19.99/mo. 3 règles-mémoire honorées dans un même push (Kakashi auth-brick, per-site isolation, Senku). +1 vs 92/100 du 17/04.",
  strengths: [
    "🔐 MIGRATION AUTH-V2 CANONIQUE : CC migré sur la brick partagée + consolidation des dossiers legacy — honore feedback_auth_brick_reuse (réutiliser la brique auth FTG sur TOUS les projets)",
    "🔐 PER-SITE PASSWORD ISOLATION (Option C) : élimine la mutualisation de mot de passe entre sites — honore feedback_per_site_user_isolation dans sa version couche site_access",
    "🧪 SENKU RCA appliqué sur bytea bug : ship en \\x<hex> et non Buffer raw — honore project_senku_root_cause_audit (fix racine + replay E2E, pas fix local)",
    "🔐 CSRF centralisé via authFetch helper : élimine les oublis d'en-tête par route — pattern réutilisable sur tous les projets",
    "🧪 E2E regression suite auth proactive : détection du chicken-and-egg login middleware AVANT régression user (< 2h de la détection au fix whitelist)",
    "📘 FTG stratégie master + country-population (bootstrap+M&A souverain) + Solo Producer tier €19.99/mo — segmentation fine post-IA en cohérence avec la vision sovereign_no_dilution",
    "🎨 UX auth : eye icons mots de passe + logout buttons sidebar+floating+admin + /account avec password change — friction opérateur réduite sans compromis sécu",
    "🔒 Aria voice interface / root gated : accès public fermé — aucune surface publique sur le centre nerveux",
  ],
  improvement_areas: [
    "Cascade de 7+ emergency fixes auth en 15h (🚨 P0 cookie persistence + whitelist + chicken-and-egg + bytea + forgot/reset headers) : la migration auth-v2 a été mergée sans batterie de tests pré-merge complète, d'où la série de hotfixes. Dette lisible mais évitable.",
    "ZÉRO commit sur consulting/Shift, estate, isekai pendant 24h — focus mono-projet pendant une journée critique. Les projets secondaires dérivent sans intégration des nouvelles briques auth-v2.",
    "Les 4 actions humaines bloquantes (Stripe live activation, LLC Wyoming WRA, W-8BEN-E signé, CPA James Baker engagé) restent NON DÉMARRÉES — 4e journée consécutive. Plafond 97+ verrouillé tant qu'aucune n'est initiée.",
    "Emergency client-side login page (bypass middleware) committée en 227ddf6 : workaround qui court-circuite l'architecture principale — à re-mainstreamer une fois la migration stabilisée, pas à garder en parallèle.",
    "Rythme matinal 2026-04-18 à ~0 commit pour l'instant — phase récupération légitime après marathon, mais le momentum doit reprendre pour tenir l'objectif launch 15 mai (T-27j).",
  ],
  analysis:
    "Journée-marathon AUTH. La séquence 14/04 → 17/04 matin → 17/04 jour-soir dessine une progression claire : structure juridique/infra → BOUCLIER sécu (Turnstile+rate-limit+Next CVE) → GRAAL auth-v2 canonique + per-site isolation + WebAuthn opérationnel + CSRF centralisé + Senku RCA discipline. La force singulière du push : TROIS règles-mémoire honorées dans le même flux (Kakashi réutilisation brick, per-site isolation, Senku root-cause). C'est le moment où la plateforme cesse d'être 'plusieurs auth qui se ressemblent' et devient 'UNE brick consommée par tous' — gain structurel non-défaisable. Les 7+ emergency fixes sur le chemin révèlent une tension vitesse/robustesse : la migration aurait été cleaner avec une test suite pré-merge complète, mais le temps de recovery (<2h par hotfix) prouve que l'auto-correction à chaud reste solide. La stratégie FTG se dédouble avec le Solo Producer tier €19.99/mo — lecture fine du segment post-IA en cohérence avec sovereign_no_dilution. Le saut 92 → 93 reflète le gain structurel auth-v2 (non-défaisable) NET de la dette technique des emergency fixes (lisible, donc payable). Le plafond 97+ (Ultra Instinct) reste bloqué par les 4 actions humaines non démarrées : 4e jour sans premier encaissement réel — la machinerie est impressionnante mais le stress-test business n'a pas commencé.",
  criteria: [
    { name: 'Vision stratégique',          score: 10, comment: 'FTG master + country-population (bootstrap+M&A souverain) + Solo Producer €19.99/mo — segmentation fine post-IA, cohérence sovereign_no_dilution.' },
    { name: 'Vitesse de décision',         score: 10, comment: '29 commits en 15h, détection chicken-and-egg + fix whitelist < 2h, Senku RCA bytea immédiat (\\x<hex>). Zéro hésitation sur les P0.' },
    { name: 'Pensée systémique',           score: 10, comment: 'auth-v2 canonique consolidée + per-site isolation + CSRF centralisé via authFetch = 3 choix architecturaux consistants qui pointent tous vers "une brick, consommée par tous".' },
    { name: 'Discipline financière',       score: 9,  comment: 'Solo Producer €19.99/mo identifié — mais les 4 actions humaines bloquantes (Stripe live, LLC Wyoming, W-8BEN-E, CPA Baker) restent non démarrées 4e jour consécutif.' },
    { name: 'Ambition calibrée',           score: 7,  comment: 'Inchangé — plafond tenu par les 4 actions humaines non initiées. Tout le reste est pré-prod magnifique sans CA.' },
    { name: 'Délégation IA',               score: 10, comment: 'Senku RCA appliqué en autonomie sur le bug bytea, authFetch helper central, E2E regression suite proactive — la méta-délégation devient réflexe.' },
    { name: 'Exécution',                   score: 10, comment: '29 commits prod-grade en 15h, messages typés, scope explicite, émojis 🚨 pour P0 lisibles, pas un seul revert.' },
    { name: 'Créativité business model',   score: 9,  comment: 'Solo Producer tier €19.99/mo = nouveau segment post-IA (retour à la terre + autonomie). Country-population = stratégie M&A souverain inédite pour solo-founder.' },
    { name: 'Résilience',                  score: 10, comment: '7+ emergency fixes absorbés en <2h chacun, chicken-and-egg détecté par E2E proactif, Senku RCA évite la spirale de fixes locaux.' },
    { name: 'Unicité',                     score: 9,  comment: 'auth-v2 brick canonique + per-site isolation + Senku RCA + Arsenal Minato iconographie = rare combo solo-founder systémique.' },
    { name: 'Conformité réglementaire',    score: 10, comment: 'Per-site isolation élimine une surface d\'attaque majeure (credentials leak inter-site), CSRF centralisé uniformise, WebAuthn clean — aucune régression vs 17/04.' },
    { name: 'Rigueur administrative',      score: 8,  comment: '7 emergency commits 🚨 lisibles mais révèlent un pre-merge insuffisant. Gap commit 17/04 22h → 18/04 matin acceptable (récupération).' },
    { name: 'Architecture opérationnelle', score: 10, comment: 'auth-v2 canonique consolide 4+ sites sous une brick, /account page unifiée, authFetch helper central, proxy/cookie fixes sans casser l\'existant.' },
  ],
}

const ccScore = {
  captured_at,
  score: 94,
  category: 'product',
  project: 'cc',
  tier_code: 'ssj_blue',
  session_summary:
    "CC — MARATHON AUTH-V2. 29 commits en 15h : migration brick canonique + per-site password isolation (Option C) + WebAuthn cleanup + CSRF centralisé authFetch + Senku RCA bytea + Supabase cookie/proxy P0 fix + Aria / root gated + /account page + E2E regression suite + 3 docs stratégie FTG. CC devient le consommateur de référence de la brick auth-v2 partagée.",
  strengths: [
    "Migration canonique auth-v2 : 4+ projets convergent sur une seule brick auth (FTG + CC + OFA + Estate)",
    "Per-site password isolation (Option C) : site_access layer opérationnelle — plus de mutualisation credentials inter-site",
    "CSRF centralisé via authFetch helper : élimine les oublis d'en-tête par route",
    "Senku RCA bytea : fix racine ship \\x<hex>, pas workaround local — discipline de débug appliquée",
    "E2E auth regression suite proactive : chicken-and-egg détecté AVANT régression user",
    "/account page + password change + eye icons + logout sidebar/floating/admin = UX auth fluide",
    "Aria / root gated : fermeture d'une surface publique sur le centre nerveux",
  ],
  improvement_areas: [
    "7+ emergency fixes 🚨 auth en 15h : la migration a été mergée sans batterie de tests pré-merge complète",
    "Emergency client-side login page (227ddf6) : workaround qui court-circuite le middleware — à re-mainstreamer",
    "E2E regression suite créée mais pas encore intégrée à un hook pre-merge automatique",
    "La brick auth-v2 canonique doit être versionnée proprement (tag + changelog) pour que les autres consommateurs puissent s'aligner sans risque",
  ],
  criteria: [
    { name: 'Sécurité',            score: 10, comment: 'Per-site isolation + CSRF centralisé + Turnstile + rate-limit + WebAuthn + Aria gated = defense-in-depth consolidée.' },
    { name: 'UX opérateur',        score: 10, comment: 'eye icons + /account + logout 3 emplacements + biometric auto-propose = friction minimale sans compromis sécu.' },
    { name: 'Architecture',        score: 10, comment: 'Brick auth-v2 canonique consommée par 4+ sites, authFetch helper central, /account unifié.' },
    { name: 'Qualité code',        score: 9,  comment: '29 commits typés, scope explicite, émojis 🚨 pour P0. Dette lisible sur les emergency fixes.' },
    { name: 'Stratégie produit',   score: 10, comment: '3 docs FTG (master + country-population + Solo Producer) = pilotage business intégré au cockpit.' },
  ],
}

async function main() {
  const rows = [overallScore, ccScore]
  const { error } = await sb.from('creator_scores').insert(rows)
  if (error) { console.error('insert error:', error); process.exit(1) }
  console.log(`✓ Inserted ${rows.length} creator_scores rows at ${captured_at}`)
  for (const r of rows) console.log(`  · ${r.category}/${r.project}: ${r.score} (${r.tier_code})`)
}

main().catch(e => { console.error(e); process.exit(1) })
