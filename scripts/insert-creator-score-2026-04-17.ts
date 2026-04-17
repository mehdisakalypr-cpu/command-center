/**
 * Insert creator score for session 2026-04-16 → 2026-04-17 03h15 (journée + nuit) :
 *  · SÉCURITÉ WAVE : CC (Turnstile + rate-limit global + Next 16.2.4 + requireAuth is_admin) + Shift (headers + CMS RLS + admin hardening + next-intl open-redirect fix)
 *  · COCKPIT CC : menu 7→5 groupes + /admin/routines + fusion sub-headers + link /admin/security + fix code-map snapshot (service_role bypass RLS)
 *  · AUTH UX : "Rester connecté" 90j sur /auth/login
 *  · SIMULATOR : /dashboard/simulator + push-action API + 3 biais × 3 pricing mixes = 9 scénarios
 *  · 🗡 BANKAI : Revenue Globe 3D temps réel (viz globale flux $)
 *  · 🚀 FTG LAUNCH : Simulation M1 + budget launch 15 mai
 *  · Nuit 19h12 → 03h15 : pas de commits, phase review/plan/bridge/mémoire
 *
 * Contexte utilisateur : "compte hier + travail jusqu'à 3h15 ce matin (la nuit)".
 * Dernier score = 2026-04-14 : overall 91 ssj_blue.
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
  score: 92,
  category: 'overall',
  project: 'global',
  tier_code: 'ssj_blue',
  session_summary:
    "Session 2026-04-16 04h → 2026-04-17 03h15 — vague SÉCURITÉ (CC + Shift hardening complet : Turnstile, rate-limit global, Next 16.2.4, requireAuth is_admin, headers, CMS RLS, audit fix next-intl) + restructuration cockpit CC (menu 7→5, routines, sub-headers, code-map fix) + SIMULATOR 9 scénarios + 🗡 BANKAI Revenue Globe 3D + 🚀 FTG Launch M1 budget 15 mai. 16 commits en 15h de code, puis 8h nuit de review/plan/bridge. +1 vs 91/100 du 14/04.",
  strengths: [
    "Sécurité wave complète CC : Turnstile captcha + rate-limited login proxy + rate-limit global 100req/60s/IP sur /api/* + bump Next 16.2.2→16.2.4 (CVE DoS Server Components) + requireAuth enforce is_admin sur routes gardées",
    "Sécurité wave complète Shift : full security headers via next.config.ts + admin auth hardening + CMS RLS service_role only + bump Next 16.2.4 + npm audit fix next-intl open-redirect",
    "Restructuration cockpit CC : menu admin 7→5 groupes + page /admin/routines + fusion sub-headers + link dashboard → /admin/security (page + APIs + tables déjà en place)",
    "Fix critique code-map : repopulate snapshot + service_role pour bypass RLS (zone morte éliminée)",
    "Auth UX : checkbox 'Rester connecté' 90j sur /auth/login — friction réduite pour l'opérateur quotidien sans compromis sécu (rate-limit + Turnstile en amont)",
    "Simulator : /dashboard/simulator + push-action API + product CC injecté + 3 biais × 3 pricing mixes = 9 scénarios (pilotage par objectif, réutilisable tous sites)",
    "🗡 BANKAI Revenue Globe 3D temps réel — viz globale des flux $ en mouvement, cohérente avec l'Arsenal Minato (icône Ichigo/Bankai)",
    "🚀 FTG Launch Simulation M1 + budget launch 15 mai — pilotage T-28j avec hypothèses chiffrées, pas de launch à vue",
  ],
  improvement_areas: [
    "Toujours aucun encaissement réel : Stripe live non activé, LLC Wyoming non commandée, W-8BEN-E non signé, CPA James Baker non engagé. Les 4 actions humaines bloquantes identifiées le 14/04 restent bloquantes — plafond score inchangé.",
    "Gap committé 19h12 → 03h15 (8h) : pas de trace git de la nuit. Si du travail substantiel a eu lieu, il n'est pas archivé (journal de bord ou session-log manquant).",
    "Load test infra (k6/Artillery) pas lancé : rate-limit 100 req/60s/IP posé sans mesure empirique du ratio confort/blocage utilisateur légitime.",
    "Monorepo OFA sans .git : 0 visibilité sur le travail FTG/OFA au niveau monorepo — hérite de command-center/consulting pour traçabilité.",
    "Sessions logs /root/sessions/2026-04-17/ quasi vides (juste timestamps) : le hook session-log n'archive pas les actions/décisions prises dans la nuit.",
  ],
  analysis:
    "Journée de DURCISSEMENT. La veille (14/04) a posé la structure juridique/comptable/infra ; cette session a posé le BOUCLIER. CC + Shift passent d'un état 'fonctionnel' à 'résistant sous attaque' : Turnstile bloque les bots, rate-limit absorbe le brute-force, requireAuth ferme les admin routes, CMS RLS empêche les leaks side-channel, Next 16.2.4 neutralise le DoS CVE. C'est la couche défensive qu'on aurait regretté de ne pas avoir posée avant le launch du 15 mai. En parallèle, le cockpit CC gagne en lisibilité (menu 7→5) et en viz (BANKAI Revenue Globe 3D — le premier outil vraiment 'plaisir à regarder'). Le simulator 9 scénarios prépare la DÉCISION sur le mix pricing à figer pour le launch FTG. Le saut 91→92 reflète l'ajout de la couche sécu opérationnelle sans nouveaux gains structurants (légal/compta/infra déjà au max). Pour passer SSJ Blue → UI (97+), il faut impérativement démarrer les 4 actions humaines bloquantes : sans ça, toute la machinerie reste pré-prod — magnifique mais sans CA. La nuit 19h-03h sans commits interroge : soit review pure (acceptable), soit travail non archivé (à consigner dans session logs).",
  criteria: [
    { name: 'Vision stratégique',          score: 10, comment: 'Security wave + BANKAI + FTG launch sim s\'enchaînent logiquement. La journée prépare le 15 mai en bouclier, viz, pricing.' },
    { name: 'Vitesse de décision',         score: 10, comment: '16 commits en 15h sur 2 projets (CC + Shift) avec zéro backtrack. Enchaînement Next bump → rate-limit → Turnstile → requireAuth sans hésitation.' },
    { name: 'Pensée systémique',           score: 10, comment: 'CVE Next découverte → bump en parallèle CC + Shift (pas un oubli), rate-limit posé avant ouverture UX (90j), Turnstile + rate-limit + requireAuth = defense-in-depth 3 couches.' },
    { name: 'Discipline financière',       score: 10, comment: 'FTG launch M1 chiffré avec budget encadré 15 mai — pas de launch à l\'aveugle. Simulator 9 scénarios permet d\'arbitrer mix pricing avant engagement CAC.' },
    { name: 'Ambition calibrée',           score: 7,  comment: 'BANKAI Globe 3D + FTG launch sim montrent l\'ambition visuelle + pilotage. Mais les 4 actions humaines bloquantes restent non démarrées — même plafond qu\'au 14/04.' },
    { name: 'Délégation IA',               score: 9,  comment: 'Code-map snapshot auto-repop, security cockpit autonome, rate-limit transparent. Pas de régression sur la méta-délégation du 14/04.' },
    { name: 'Exécution',                   score: 10, comment: '16 commits prod-grade en 15h (12 CC + 4 Shift), couvrant sécurité multi-couches + UX + viz + FTG launch. Pas un seul fix hotfix immédiat qui suivrait.' },
    { name: 'Créativité business model',   score: 8,  comment: 'Simulator 3×3=9 scénarios systématise l\'arbitrage pricing mix. BANKAI Revenue Globe 3D = asset marketing différenciant. Mais pas de nouveau BM ce jour.' },
    { name: 'Résilience',                  score: 10, comment: 'Defense-in-depth : Turnstile (bot) + rate-limit (volume) + requireAuth (authZ) + Next patch (CVE) + CSP/HSTS (transport) + RLS (data). 6 couches qui ne se chevauchent pas.' },
    { name: 'Unicité',                     score: 9,  comment: 'BANKAI Revenue Globe 3D + Arsenal Minato iconographie anime + sim 9 scénarios + security wave coordonnée CC/Shift le même jour = combo solo-founder rare.' },
    { name: 'Conformité réglementaire',    score: 10, comment: 'Headers A+ (CSP/HSTS/XFO/Referrer/Permissions), CMS RLS service_role only, requireAuth is_admin — aucune régression vs jalons du 14/04.' },
    { name: 'Rigueur administrative',      score: 9,  comment: 'Commits signés, messages typés (security/feat/fix), scope explicite (cc/auth, cc/deps, shift/deps). Gap sessions logs 19h-03h à corriger.' },
    { name: 'Architecture opérationnelle', score: 10, comment: 'Security cockpit + routines + simulator dans même menu cohérent 5 groupes. FTG launch sim s\'insère proprement dans /dashboard/simulator.' },
  ],
}

const ccScore = {
  captured_at,
  score: 93,
  category: 'product',
  project: 'cc',
  tier_code: 'ssj_blue',
  session_summary:
    "CC — session de durcissement massif : 12 commits en 15h. Sécurité (Turnstile + rate-limit + requireAuth + Next 16.2.4), cockpit (menu 7→5 + routines + code-map fix), UX (rester connecté 90j), simulator 9 scénarios, BANKAI Globe 3D, FTG launch sim. CC devient le centre nerveux opérable sous charge.",
  strengths: [
    "Defense-in-depth 3 couches : Turnstile (bot) + rate-limit global 100req/60s/IP (volume) + requireAuth is_admin (authZ) — posé avant le launch 15 mai",
    "Next 16.2.4 bumpé (CVE DoS Server Components) — dépendance critique corrigée dans la journée de sortie du patch",
    "Cockpit restructuré : menu 7→5 groupes + page routines + fusion sub-headers = moins de dispersion cognitive opérateur",
    "Code-map fixed : snapshot repopulate + service_role bypass RLS = zone morte éliminée",
    "Simulator /dashboard/simulator + push-action API + product CC = pilotage par objectif réutilisable, 9 scénarios (3 biais × 3 pricing)",
    "BANKAI Revenue Globe 3D temps réel = premier outil viz marketing-grade du CC",
    "FTG Launch M1 simulation + budget 15 mai intégré — pilotage T-28j chiffré",
  ],
  improvement_areas: [
    "Rate-limit 100req/60s/IP posé sans load test empirique : le seuil est raisonnable mais pas validé",
    "Turnstile : fallback en cas d'indisponibilité Cloudflare à documenter (soft-fail vs hard-fail)",
    "requireAuth is_admin : audit des routes 'guarded' à formaliser dans /admin/security (table de routes protégées)",
    "BANKAI Globe 3D : performance mobile à tester (WebGL lourd sur devices faibles)",
  ],
  criteria: [
    { name: 'Sécurité',            score: 10, comment: 'Turnstile + rate-limit + requireAuth + Next CVE patch + headers A+ = defense-in-depth 5 couches non chevauchantes.' },
    { name: 'UX opérateur',        score: 9,  comment: 'Menu 7→5 + routines + sub-headers fusion + rester connecté 90j = moins de frictions. Reste à valider empiriquement.' },
    { name: 'Viz / marketing',     score: 10, comment: 'BANKAI Revenue Globe 3D = asset unique, cohérent avec l\'identité Arsenal Minato.' },
    { name: 'Pilotage business',   score: 9,  comment: 'Simulator 9 scénarios + FTG launch M1 budget = décision chiffrée avant engagement CAC.' },
    { name: 'Qualité code',        score: 9,  comment: '12 commits typés, scope explicite, pas de revert. Fix code-map propre (service_role).' },
  ],
}

const shiftScore = {
  captured_at,
  score: 90,
  category: 'product',
  project: 'shift',
  tier_code: 'ssj_blue',
  session_summary:
    "Shift Dynamics — hardening sécurité complet : 4 commits (headers next.config.ts + admin auth + CMS RLS service_role + Next 16.2.4 + audit fix next-intl). Shift passe d'un site consulting statique à un site admin-secured avant toute vitrine prod.",
  strengths: [
    "Full security headers via next.config.ts (CSP/HSTS/XFO/Referrer/Permissions) — Mozilla A+ grade attendu",
    "Admin auth hardened + CMS RLS service_role only — plus de leak possible sur les content rows",
    "Bump Next 16.2.2 → 16.2.4 le même jour que CC = vigilance CVE coordonnée",
    "npm audit fix next-intl open-redirect — dépendance connue corrigée dans la foulée",
  ],
  improvement_areas: [
    "Pas de Turnstile sur Shift (site vitrine → pas critique, mais admin route exposée)",
    "Rate-limit à considérer si le CMS passe en prod (form de contact = cible bot)",
    "Les 4 commits sécu sans test e2e associé — fonctionnel supposé OK mais pas automatisé",
  ],
  criteria: [
    { name: 'Sécurité',          score: 10, comment: 'Headers A+ + admin hardening + CMS RLS + Next CVE + audit fix = hardening complet sans gap identifié.' },
    { name: 'Coordination CC',   score: 10, comment: 'Next 16.2.4 bumpé le même jour que CC = pas de dérive inter-projets sur la CVE.' },
    { name: 'Qualité vitrine',   score: 8,  comment: 'Site vitrine statique reste son usage principal. Hardening posé avant ouverture admin opérationnelle.' },
  ],
}

async function main() {
  const rows = [overallScore, ccScore, shiftScore]
  const { error } = await sb.from('creator_scores').insert(rows)
  if (error) { console.error('insert error:', error); process.exit(1) }
  console.log(`✓ Inserted ${rows.length} creator_scores rows at ${captured_at}`)
  for (const r of rows) console.log(`  · ${r.category}/${r.project}: ${r.score} (${r.tier_code})`)
}

main().catch(e => { console.error(e); process.exit(1) })
