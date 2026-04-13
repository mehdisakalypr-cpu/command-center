"use client";

const C = {
  bg: "#040D1C",
  card: "#0A1A2E",
  cardAlt: "rgba(255,255,255,.03)",
  gold: "#C9A84C",
  text: "#E8E0D0",
  muted: "#9BA8B8",
  border: "1px solid rgba(201,168,76,.15)",
};

const SCHEMA = String.raw`
┌─────────────────────────────────────────────────────────────────┐
│  MINATO ORCHESTRATOR — Managed Agent (infra Anthropic)          │
│  ────────────────────────────────────────────────────────────   │
│  Agent versionné · claude-opus-4-6 · Skills chargés à la demande│
│                                                                 │
│   ┌─ KAKASHI ──────┐  ┌─ SUK ──────────┐  ┌─ GENKIDAMA ───┐    │
│   │ scan briques   │  │ versioning auto│  │ objectifs 100%│    │
│   │ avant code     │  │ amélioration   │  │ check progrès │    │
│   └────────────────┘  └────────────────┘  └───────────────┘    │
│                                                                 │
│   ┌─ NAMI ─────────────────────────────────────────────────┐    │
│   │ scout → builder → pitcher (3 custom tools chaînés)     │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                 │
│   ┌─ KAIOKEN ──────────────────────────────────────────────┐    │
│   │ Promise.all(N agents locaux) — parallèle massif        │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ custom tools (SSE event stream)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  WEBHOOK BRIDGE — Command Center (Vercel, déjà déployé)         │
│  POST /api/minato/run-tool { tool, args, project }              │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / SSH
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  FTG (VPS)   │  │  OFA (VPS)   │  │  Estate      │
│  ─────────── │  │  ─────────── │  │  ─────────── │
│  hyperscale  │  │  refresh     │  │  scout PY    │
│  scout       │  │  recover     │  │  → Vercel    │
│  social      │  │  classify    │  │              │
│  seo-factory │  │  outreach    │  │              │
│              │  │  hyperscale  │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
   tsx + Gemini      tsx + Gemini      Python free
   FREE (0€)         FREE (0€)         FREE (0€)
`;

const MAPPING = [
  { minato: "KAKASHI — scan briques avant code", ma: "Skill `kakashi-bricks-index.md` + tool `scan_existing_bricks(keyword)`" },
  { minato: "SUK — méta-agents auto-améliorants", ma: "Agent versioning natif. Chaque amélioration prompt = nouvelle version. Sessions critiques pinnent la version stable." },
  { minato: "R&B — Research + Business", ma: "2 agents séparés (research-agent, business-agent) appelés comme custom tools par Minato Orchestrator" },
  { minato: "KAIOKEN — parallèle massif", ma: "Promise.all côté custom tool : 1 call lance N scripts en parallèle sur le VPS" },
  { minato: "NAMI — scout → build → pitch", ma: "Pipeline 3 custom tools chaînés. Minato décide quand déclencher selon état Genkidama" },
  { minato: "GENKIDAMA — objectifs 100%", ma: "Skill `objectifs.md` (cibles par projet) + tool `check_genkidama_progress()` lit Supabase counts" },
  { minato: "Commit toutes les 15-20 min", ma: "Hook auto à chaque session.status_idle (stop_reason=end_turn) → tool `commit_progress`" },
  { minato: "Update Insights CC", ma: "Tool `update_cc_insights` appelé après chaque batch → table `dashboard_insights`" },
  { minato: "Per-site user isolation", ma: "Vault par projet → credentials cloisonnés (chaque projet son vault)" },
];

const COSTS = [
  { layer: "Cerveau (Minato meta orchestrator)", tech: "Managed Agent Opus 4.6", cost: "~50€/mois" },
  { layer: "Bras (R&B, Nami pipelines)", tech: "Managed Agent Opus 4.6", cost: "~30€/mois" },
  { layer: "Soldats (scaling, scout, builder, social)", tech: "tsx + Gemini Flash gratuit", cost: "0€" },
  { layer: "Réflexes (cron, monitoring)", tech: "PM2 + bash", cost: "0€" },
  { layer: "POC minimal (Minato seul, 1-2 runs/jour)", tech: "Managed Agent Opus 4.6", cost: "~10-15€/mois" },
];

const BENEFITS = [
  "🗣️ **Pilotage à la voix via Aria** : « Lance Minato sur OFA » → exécution autonome 30 min, SSE en live",
  "📼 **Reproductibilité** : chaque run = 1 session archivée, rejouable",
  "🔄 **Cascade intelligente** : si KAIOKEN échoue, l'agent décide tout seul (rerun, switch cible, demander confirmation)",
  "🧠 **Mémoire entre sessions** : Skill se met à jour avec ce qui marche → SUK auto-improve réel",
  "⚡ **Multi-projet en parallèle** : 3 sessions Minato sur FTG/OFA/Estate simultanément",
  "🛡️ **Container isolé par session** : graceful shutdown, reschedule auto si crash, plus de PM2 qui meurt",
  "📊 **Observabilité native** : SSE event stream complet, logs structurés, usage tracking auto",
];

const FORCE = [
  { label: "Minato seul", desc: "Philosophie d'orchestration manuelle. Tu lances les scripts. Pas d'auto-pilote, pas de mémoire inter-session, pas d'observabilité native. Gratuit, fonctionne aujourd'hui." },
  { label: "Managed Agents seul", desc: "Infra agent hébergée puissante. Mais sans Minato → pas de méthodologie, pas de KAKASHI/KAIOKEN/GENKIDAMA, donc l'agent réinvente à chaque run. Coûteux et déstructuré." },
  { label: "MINATO × MANAGED AGENTS (couplé)", desc: "🔥 Méthodologie Shonen + infra Anthropic. Skills = mémoire des règles. Versioning = SUK auto-improve. Custom tools = soldats locaux gratuits gardés. SSE = observabilité Aria. Coût maîtrisé (~80€ max). Autonomie 24/7." },
];

export default function MinatoDocPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "32px 24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 32, borderBottom: C.border, paddingBottom: 16 }}>
          <h1 style={{ fontSize: 32, color: C.gold, margin: 0, letterSpacing: ".02em" }}>
            ⚡ MINATO × MANAGED AGENTS
          </h1>
          <p style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>
            Architecture hybride — Méthodologie Shonen Ultimate Skill couplée à l'infra agent hébergée d'Anthropic.
            Doc de référence pour orchestration multi-projets (FTG · OFA · Estate · Shift · CC).
          </p>
        </header>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>🎯 La force des deux modèles couplés</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {FORCE.map((f, i) => (
              <div key={i} style={{ background: i === 2 ? C.card : C.cardAlt, padding: 16, borderRadius: 8, border: i === 2 ? `1px solid ${C.gold}` : C.border }}>
                <div style={{ color: i === 2 ? C.gold : C.text, fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                <div style={{ color: C.muted, fontSize: 14 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>📐 Schéma d'architecture</h2>
          <pre style={{ background: C.card, padding: 20, borderRadius: 8, border: C.border, color: C.text, fontSize: 11, lineHeight: 1.4, overflow: "auto", fontFamily: "Menlo, Consolas, monospace" }}>
            {SCHEMA}
          </pre>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 8, fontStyle: "italic" }}>
            Le cerveau (Opus 4.6) orchestre. Les soldats (Gemini Flash gratuit) exécutent. Le bridge CC fait le pont. Coûts maîtrisés, puissance maximale.
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>🗺️ Mapping concepts Minato → Managed Agents</h2>
          <div style={{ background: C.card, borderRadius: 8, border: C.border, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.cardAlt }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: C.gold, borderBottom: C.border, width: "35%" }}>Concept Minato</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: C.gold, borderBottom: C.border }}>Implémentation Managed Agents</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map((m, i) => (
                  <tr key={i} style={{ borderBottom: i < MAPPING.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                    <td style={{ padding: "10px 14px", color: C.text, fontWeight: 500 }}>{m.minato}</td>
                    <td style={{ padding: "10px 14px", color: C.muted }}>{m.ma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>💰 Coûts par couche</h2>
          <div style={{ background: C.card, borderRadius: 8, border: C.border, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.cardAlt }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: C.gold, borderBottom: C.border }}>Couche</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: C.gold, borderBottom: C.border }}>Tech</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: C.gold, borderBottom: C.border, width: "20%" }}>Coût</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((c, i) => (
                  <tr key={i} style={{ borderBottom: i < COSTS.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                    <td style={{ padding: "10px 14px", color: C.text }}>{c.layer}</td>
                    <td style={{ padding: "10px 14px", color: C.muted }}>{c.tech}</td>
                    <td style={{ padding: "10px 14px", color: C.gold, textAlign: "right", fontWeight: 600 }}>{c.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
            <b style={{ color: C.gold }}>Total stack complet ~80€/mois</b> · POC minimal &lt; 15€/mois · Soldats restent gratuits (Gemini/CF FLUX/Groq).
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>🚀 Bénéfices concrets</h2>
          <ul style={{ background: C.card, padding: "16px 32px", borderRadius: 8, border: C.border, listStyle: "none", margin: 0 }}>
            {BENEFITS.map((b, i) => (
              <li key={i} style={{ padding: "8px 0", color: C.text, fontSize: 14, borderBottom: i < BENEFITS.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                {b}
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>🛠️ Plan POC</h2>
          <ol style={{ background: C.card, padding: "16px 32px", borderRadius: 8, border: C.border, color: C.text, fontSize: 14, lineHeight: 1.8 }}>
            <li><b style={{ color: C.gold }}>Setup (one-time)</b> · <code>scripts/setup-minato-agent.ts</code> : <code>agents.create()</code> + upload Skills (kakashi/objectifs/personas)</li>
            <li><b style={{ color: C.gold }}>Bridge API</b> · <code>/api/minato/run-tool/route.ts</code> dans CC (déjà Vercel) — expose les scripts existants comme custom tools</li>
            <li><b style={{ color: C.gold }}>Aria modifié</b> · client appelle <code>sessions.create()</code> au lieu de l'API Claude directe</li>
            <li><b style={{ color: C.gold }}>Test E2E</b> · « Lance Minato sur OFA » → orchestrator déclenche refresh-demos + recover + audit</li>
            <li><b style={{ color: C.gold }}>Itération</b> · ajout R&B agents, vault par projet, multi-session parallèle</li>
          </ol>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 8, fontStyle: "italic" }}>
            ETA POC complet : ~2h. Itérations suivantes au fil des sessions.
          </div>
        </section>

        <footer style={{ marginTop: 40, paddingTop: 16, borderTop: C.border, color: C.muted, fontSize: 12, textAlign: "center" }}>
          Doc Minato × Managed Agents · v1 · 2026-04-13 · Command Center Admin
        </footer>
      </div>
    </div>
  );
}
