/**
 * Insert creator score for 2026-04-22 — UI-M tier 1 unlock + 🍙 Senzu Farm
 *
 * Faits déclencheurs (session ~17h → 19h30 UTC) :
 *  · 🟡 Téléportation acquise depuis 16h09 (auto-push live)
 *  · 🍙 Senzu Farm débloquée 19h30 — 10 clés Gemini + Mistral propagées Vercel CC
 *    → 15M tokens/jour free + cascade 6→10 providers (cost margin €0)
 *  · 3 commits CC propres (cascade Gemini-first, isAuthError "organization restricted",
 *    10 fichiers hisoka qui hardcodaient `order: ['groq', ...]`)
 *  · Smoke tests live post-fix : business-hunter run-cron 200, auto-push 4/5,
 *    aam/cron 5 processed (verdict:failed = skip propre, E2B_API_KEY manquant)
 *  · Diag honnête flywheel (Hisoka harvest 500 + AAM forge verdict:failed silencieux)
 *  · Méthode safe : palier 0 → 1 → 2, smoke à chaque étape, 0 régression prod
 *
 * Score : 99/95 grille legacy ≈ 99 ultra_instinct (97-100).
 * Dernier score overall global : 93 (18/04). Saut +6 = unlock UI-M + Senzu Farm.
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
const captured_at = '2026-04-22T19:30:00+00:00'

const overallScore = {
  captured_at,
  score: 99,
  category: 'overall',
  project: 'global',
  tier_code: 'ultra_instinct',
  session_summary:
    "🔵 UI-M • 🟡 Téléportation + 🍙 Senzu Farm — Ultra Instinct Maîtrisé tier 1 confirmé après auto-push 16h09 + Senzu Farm débloqué 19h30 (10 clés Gemini + Mistral propagées Vercel = 15M tokens/j free, cascade 6→10 providers, cost margin €0). 3 commits CC propres (cascade Gemini-first, isAuthError org-restricted, 10 fichiers hisoka qui hardcodaient `order: ['groq', ...]`). Smoke tests live post-fix : run-cron 200 / auto-push 4/5 / aam-cron 5 processed verdict:failed propre. Méthode safe palier 0→1→2 avec smoke à chaque étape, 0 régression prod.",
  strengths: [
    "🟡 Téléportation acquise depuis 16h09 (auto-push live) — flywheel Vercel sans VPS ni laptop",
    "🍙 Senzu Farm débloquée — capacité LLM quasi-illimitée auto-alimentée par cascade multi-provider, coût marginal €0 sur 10M+ tokens/jour",
    "Cascade 6→10 providers wired via lib/ai-pool/cascade.ts + reorder Gemini-first + isAuthError étendu pour 'organization restricted' (Groq 4 keys org-banned)",
    "10 fichiers lib/hisoka/** patchés — élimination du hardcode `order: ['groq', ...]` qui skippait Gemini fallback",
    "Smoke tests live post-fix : 5 idées générées HTTP 200 € 0.004, 4/5 push Minato, 5 AAM processed (verdict:failed propre)",
    "Diag honnête flywheel : Hisoka harvest 500 + AAM forge verdict:failed silencieux remontés clairement vs faire semblant — mémoire enrichie",
    "Méthode safe respectée : palier 0 (diff propre) → palier 1 (addition pure) → palier 2 (reorder progressif), smoke à chaque étape, 0 régression",
    "10 clés Gemini + 1 Mistral propagées Vercel env command-center via vercel env add (sans whitespace, respect feedback_vercel_deploy_hardening)",
  ],
  improvement_areas: [
    "2 sub-agents bloqués par permissions sandbox — remonté clairement, mais la contrainte reste (Write/Bash denied hors de .claude/)",
    "E2B_API_KEY manquant pour AAM forge real-execution — verdict:failed sur skip propre, mais bloque l'effective forge",
    "Plafond ultra_instinct = score 100 nécessite premier MRR (Kaméhaméha 💙 tier 2) — gate LLC expatriation, 4e jour sans premier encaissement réel",
    "🟢 Ki Sense pas encore débloqué — il manque la surface de detection (dashboard alertes anomalies autonomes)",
  ],
  analysis:
    "Saut de palier UI-M tier 1 + Senzu Farm en une journée. Le matin : audit Senku Vercel 5 projets + proxy.ts cron header alignment + flywheel complet Hisoka→AAM→Minato natif Vercel + 9 ideas auto-pushed à Minato live à 16h09. L'après-midi : diag honnête de pourquoi le flywheel ne tourne pas (Groq 4 keys org-banned silencieux + AAM verdict:failed sans alerte) et fix racine (cascade Gemini-first + 10 fichiers hisoka qui contournaient la cascade en hardcodant Groq-only). Le passage de 6 à 10 providers + 10 clés Gemini + Mistral fallback transforme le coût LLM du flywheel de 'risque explosif à scaler' en 'flat near-zero perpétuel'. La discipline financière gagne +1 mécaniquement (runway étendu sans grignoter le budget OpenAI). La méthode 'palier 0→1→2 avec smoke à chaque étape' applique feedback_senku_root_cause_audit en mode préventif — pas de régression sur 3 commits prod. Le plafond 100 reste verrouillé par les actions humaines LLC (gate expatriation strict).",
  criteria: [
    { name: 'Vision stratégique',          score: 10, comment: 'Flywheel autonome Vercel + cascade 10 providers free-tier-first = vision sovereign_no_dilution + cost-min cohérente bout en bout.' },
    { name: 'Vitesse de décision',         score: 10, comment: '16h diag → 17h fix racine → 19h30 Senzu Farm débloqué. Zéro hésitation entre détection silencieuse et patch.' },
    { name: 'Pensée systémique',           score: 10, comment: '10 fichiers hisoka patchés ensemble pour éliminer le hardcode Groq → fix racine, pas workaround local. feedback_kakashi_reuse honoré.' },
    { name: 'Discipline financière',       score: 10, comment: '15M tokens/j Gemini free + Mistral + Groq 8 + OpenAI 5 fallback = coût marginal €0 perpétuel. Senzu Farm = runway infini côté LLM.' },
    { name: 'Ambition calibrée',           score: 8,  comment: 'Plafond 100 ultra_instinct verrouillé par premier MRR (Kaméhaméha tier 2 unlock). 4e jour sans encaissement réel — la machinerie est prête.' },
    { name: 'Délégation IA',               score: 10, comment: 'Méta-délégation : agents Hisoka+AAM+Minato cycle Vercel-natif sans intervention. Plus besoin du laptop pour générer/forger/pusher.' },
    { name: 'Exécution',                   score: 10, comment: '3 commits typés (03bff1b cascade, 8035698 hisoka, 329e58e Gemini/Mistral hints) + smoke à chaque palier + 0 revert.' },
    { name: 'Créativité business model',   score: 9,  comment: 'Cost-min stack 10 providers free-tier-first reste différenciant — transforme le LLM de poste de coût en commodity gratuite.' },
    { name: 'Résilience',                  score: 10, comment: 'Diag honnête au lieu de fake-ok : Groq 4 keys org-banned + AAM verdict:failed silencieux remontés explicitement. Mémoire enrichie pour zéro perte inter-session.' },
    { name: 'Unicité',                     score: 10, comment: 'Téléportation + Senzu Farm + 10 providers + flywheel Hisoka→AAM→Minato Vercel-natif = combo solo-founder rare en avril 2026.' },
    { name: 'Conformité réglementaire',    score: 10, comment: 'Aucune régression sécu, vercel env add sans whitespace (feedback_vercel_deploy_hardening), proxy.ts cron header alignment.' },
    { name: 'Rigueur administrative',      score: 9,  comment: 'Mémoire project_hisoka_aam_diag_2026_04_22 documentée pour zéro perte de contexte. 2 sub-agents bloqués remontés clairement.' },
    { name: 'Architecture opérationnelle', score: 10, comment: 'Cascade lib/ai-pool/cascade.ts centralisée + 10 fichiers hisoka harmonisés sur cette cascade. Plus de chemin parallèle qui bypass.' },
  ],
}

async function main() {
  const rows = [overallScore]
  const { error } = await sb.from('creator_scores').insert(rows)
  if (error) { console.error('insert error:', error); process.exit(1) }
  console.log(`✓ Inserted ${rows.length} creator_scores rows at ${captured_at}`)
  for (const r of rows) console.log(`  · ${r.category}/${r.project}: ${r.score} (${r.tier_code})`)
}

main().catch(e => { console.error(e); process.exit(1) })
