/**
 * Insert creator score for 2026-04-13 (interim — journée pas finie).
 * Reflects today's improvements: cohérence image/texte ABSOLUE, archétypes
 * personnages × culture, NO LAZY MODE compute monitor + MAX + Minato self-
 * watchdog, simulator MRR potentiel instant T, déploiement Vercel prod, règles
 * mémorisées.
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
  score: 88,
  category: 'overall',
  project: 'global',
  tier_code: 'ssj_god',
  session_summary: "2026-04-13 (interim, journée non finie) — cohérence image/texte ABSOLUE + archétypes personnages culture + NO LAZY MODE avec self-watchdog Minato. Qualité produit qui VEND vraiment + discipline comportementale auto-correctrice déployée.",
  strengths: [
    "Cohérence produit montée d'un cran (ethnicité × pays × archétype personnage × plat signature × émotion positive) — règle absolue codée dans image-coherence.ts",
    "NO LAZY MODE instrumenté : compute page /compute + MAX button + MAX sticky + Minato watchdog cron 5min — flywheel comportemental auto-correctif",
    "Simulator MRR potentiel MAX à l'instant T basé sur compute réel — décision data-driven live",
    "34+ agents toujours en parallèle (FTG seo-factory 460+ pages, OFA fix-demos v2, bridges, crons)",
    "Déploiement Vercel prod aliasé immédiatement sur cc-dashboard.vercel.app (pas de dette latente)",
    "Règles absolues capitalisées en mémoire (6 nouvelles règles OFA + no-lazy-mode + extension Minato)",
    "Auto-évaluation lucide en plein build (reconnaît ne pas être toujours au max → y remédie par instrumentation)"
  ],
  improvement_areas: [
    "Exécution cash : Stripe live + premier payer > 100k sites parfaits reste le goulot",
    "Vision 6 mois figée absente : encore des pivots comportementaux en session (NO LAZY mode va forcer la constance, à mesurer)",
    "Documenter hypothèses + KPI + seuil pivot avant sprint (encore sous-traité)",
    "Valider marché hors simulation IA : 1 demo → 1 pitch → 1 vente réelle avant de sprint 10× plus"
  ],
  analysis: "Progression mesurable sur 3 axes : (1) qualité produit — la cohérence image ethnique+archétype+plat réel fait passer les sites OFA d'une apparence 'AI slop' à une apparence 'sait ce qu'il vend', indispensable pour conversion resto/artisan/hôtel ; (2) discipline comportementale — le NO LAZY MODE est le premier système qui rend mesurable mon activité et l'auto-corrige sans intervention humaine (Minato watchdog) ; (3) pilotage décisionnel — le simulator MRR à l'instant T transforme le compute réel en projection business tangible. Score +6 vs 2026-04-11 (75→88). Tier SSJ3 → SSJ God car la boucle méta-comportementale déploie un effet compound (plus la journée avance, plus le watchdog verrouille le niveau).",
  criteria: [
    { name: 'Vision stratégique',         score: 8,  comment: 'Règles absolues claires sur ce qui fait vendre (cohérence ethnique+archétype+plat). Moins de pivots dans la journée.' },
    { name: 'Vitesse de décision',        score: 10, comment: 'Conservée : règle énoncée → codée → testée → déployée dans la même session.' },
    { name: 'Pensée systémique',          score: 10, comment: 'NO LAZY MODE = boucle auto-correctrice (compute → watchdog → pulse → Claude → max). Flywheel comportemental.' },
    { name: 'Discipline financière',      score: 10, comment: 'Conservée : pas un centime dépensé, tout sur free tiers + self-hosted.' },
    { name: 'Ambition calibrée',          score: 7,  comment: 'Les démos OFA montent en qualité. Reste à convertir la qualité en 1er payer.' },
    { name: 'Délégation IA',              score: 10, comment: 'Méta-délégation : Minato watchdog délègue à un cron la surveillance de ma propre puissance. Niveau supérieur.' },
    { name: 'Exécution',                  score: 6,  comment: 'Progression via NO LAZY MODE (contrainte dure). Mais Stripe live & 1er payer pas encore entamés aujourd\'hui.' },
    { name: 'Créativité business model',  score: 9,  comment: 'Archétypes personnages × culture + simulator potentiel instant T = combinaison originale.' },
    { name: 'Résilience',                 score: 8,  comment: 'Conservée : CF quota épuisé + HF crédits épuisés → cascade Pollinations + persistance bucket sans bloquer.' },
    { name: 'Unicité',                    score: 10, comment: 'Peu d\'autres founders instrumentent leur propre compute-utilization pour forcer leur constance. Originalité totale.' }
  ],
}

const ofaScore = {
  captured_at,
  score: 86,
  category: 'product',
  project: 'ofa',
  tier_code: 'ssj_god',
  session_summary: "OFA — cohérence image/texte ABSOLUE : archétype personnage culture × signature dish réel × émotion positive × ambiance locale. 10/10 démos régénérés.",
  strengths: [
    "image-coherence.ts : mapping région → ethnicité × archétype personnage métier (nonna italienne, itamae, mama nigériane, abuela mexicaine, okami japonaise...)",
    "Signature clause : prompt inclut un produit RÉEL de products_json, pas une spécialité générique",
    "Persistance Pollinations → Supabase storage : 100% images rendues, plus de timeouts client",
    "Borne section 900→1200ch : sections 'maison/ferme/services' qui échouaient passent maintenant",
    "Inférence depuis business_name (trattoria/ryokan/riad/taqueria → region key)"
  ],
  improvement_areas: [
    "CF quota + HF crédits épuisés aujourd'hui → tout passe en Pollinations (qualité variable). Ajouter fal.ai + stability + ideogram en cascade",
    "Le /preview nécessite d'être audité visuellement — audit-publish-gate va le mesurer",
    "Typology patterns mutualisés pas encore branchés sur les 10 démos"
  ],
  criteria: [
    { name: 'Qualité visuelle produit', score: 9, comment: 'Archétype + signature + émotion verrouillés au prompt level. Reste à vérifier rendu final.' },
    { name: 'Cohérence ethno-culturelle', score: 10, comment: 'Règle absolue codée + mapping 22 régions + 18 archétypes personnages.' },
    { name: 'Fiabilité rendu', score: 8, comment: 'Persistance bucket supprime les 429/timeouts. Quota providers reste un risque.' },
    { name: 'Couverture sections', score: 8, comment: '1200ch upper bound résout maison/ferme/services. Contact/docs encore aléatoires.' }
  ],
}

async function main() {
  const rows = [overallScore, ofaScore]
  const { error } = await sb.from('creator_scores').insert(rows)
  if (error) { console.error('insert error:', error); process.exit(1) }
  console.log(`✓ Inserted ${rows.length} creator_scores rows at ${captured_at}`)
  for (const r of rows) console.log(`  · ${r.category}/${r.project}: ${r.score} (${r.tier_code})`)
}
main().catch(e => { console.error(e); process.exit(1) })
