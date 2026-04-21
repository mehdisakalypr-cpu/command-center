"use client";
import { useState, useEffect } from "react";

type CapacityRow = { label: string; actual: number; target: number; weekly_rate: number; kaioken_rate: number; remaining: number; eta_days: number | null; eta_days_kaioken: number | null; pct: number };
type CapacityData = { ok: boolean; updated_at: string; rows: CapacityRow[]; global_eta_days: number | null; global_eta_kaioken: number | null; note?: string };

function CapacitySection() {
  const [data, setData] = useState<CapacityData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/minato/capacity")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setErr(d.error || "load failed")))
      .catch((e) => setErr(String(e)));
  }, []);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const eta = (d: number | null) => (d === null ? "jamais" : d < 30 ? `${d}j` : d < 365 ? `${Math.round(d / 7)}sem` : `${Math.round(d / 30)}mois`);

  return (
    <div style={{ background: "#0A1A2E", padding: 16, borderRadius: 8, border: "1px solid rgba(201,168,76,.15)", marginBottom: 32 }}>
      <div style={{ color: "#C9A84C", fontWeight: 600, fontSize: 16, marginBottom: 10 }}>⚡ Capacité technique vs objectifs</div>
      {err && <div style={{ color: "#FF6B6B", fontSize: 13 }}>❌ {err}</div>}
      {!data && !err && <div style={{ color: "#9BA8B8", fontSize: 13 }}>Chargement...</div>}
      {data && (
        <>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,.03)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", color: "#C9A84C", borderBottom: "1px solid rgba(201,168,76,.15)" }}>Métrique</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>Actuel</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>Cible</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>%</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>Reste</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>Rythme/sem</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#C9A84C" }}>ETA (actuel)</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", color: "#6BCB77" }}>ETA KAIOKEN×5</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "8px 10px", color: "#E8E0D0", fontWeight: 500 }}>{r.label}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#E8E0D0" }}>{fmt(r.actual)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>{fmt(r.target)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: r.pct >= 50 ? "#6BCB77" : r.pct >= 10 ? "#C9A84C" : "#FF6B6B" }}>{r.pct}%</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>{fmt(r.remaining)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#9BA8B8" }}>{r.weekly_rate === 0 ? "❌ 0" : fmt(r.weekly_rate)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: r.eta_days === null ? "#FF6B6B" : r.eta_days > 365 ? "#FF6B6B" : "#C9A84C", fontWeight: 600 }}>{eta(r.eta_days)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#6BCB77", fontWeight: 600 }}>{eta(r.eta_days_kaioken)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: 10, background: "rgba(0,0,0,.3)", borderRadius: 6, fontSize: 13 }}>
            <span style={{ color: "#C9A84C" }}>🎯 ETA global (ligne la pire) :</span>{" "}
            <b style={{ color: "#FF6B6B" }}>{eta(data.global_eta_days)}</b> actuel →{" "}
            <b style={{ color: "#6BCB77" }}>{eta(data.global_eta_kaioken)}</b> avec KAIOKEN×5.
            {data.note && <div style={{ color: "#9BA8B8", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>{data.note}</div>}
          </div>
        </>
      )}
    </div>
  );
}

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
│  MINATO ORCHESTRATOR — Managed Agent (Opus 4.7 / 1M ctx)        │
│  Agent versionné · Skills on-demand · SHAKA mode autonome       │
│                                                                 │
│  NIVEAU 1 Exécution   → KAKASHI · KURAMA · TANJIRO · KURAPIKA   │
│                         MUSTANG · DEKU · KAMADO · AKAME         │
│  NIVEAU 2 Scaling     → KAIOKEN · GIANT PICCOLO · GOJO          │
│                         RIMURU · SHIKAMARU · NEJI               │
│  NIVEAU 3 Commerce    → NAMI · AAM · NAMI REINVEST              │
│                         LELOUCH · JIRAIYA                       │
│  NIVEAU 4 Benchmark   → BEERUS · SENKU-bench · GENKIDAMA        │
│  NIVEAU 5 Garde-fous  → AEGIS · NO LAZY · SHISUI                │
│                         SENKU (root-cause) · DOKHO · SHAKA      │
│  NIVEAU 6 Content     → ITACHI (trade) · HANCOCK (prod)         │
│                         ROCK LEE · KUSHINA · MIGHT GUY · MERLIN │
│  NIVEAU 7 Cascade     → 10 providers LLM · APOLLO · RADAR · SHIPPO │
│  NIVEAU ∞             → INFINITE TSUKUYOMI (never-idle)         │
└────────────────────────┬────────────────────────────────────────┘
                         │ custom tools + SSE event stream
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CASCADE LLM 10 providers (agents/providers.ts · FTG)           │
│  Gemini×4 → Groq×2 → OpenAI×4 → Mistral → Together              │
│  Auto-fallback payant quand free tier saturé ($0.05/15 jobs)    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / SSH bridge CC
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  FTG (VPS)   │  │  OFA (VPS)   │  │  Estate      │
│  hyperscale  │  │  refresh     │  │  scout PY    │
│  content 3.0 │  │  recover     │  │  Netlify     │
│  marketplace │  │  classify    │  │              │
│  deal rooms  │  │  outreach    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
   10 providers      10 providers       Python free
   ~$0.05/job        ~$0.05/job         0€
`;

const MAPPING = [
  { minato: "KAKASHI — scan briques avant code", ma: "Skill `kakashi-bricks-index.md` + tool `scan_existing_bricks(keyword)`" },
  { minato: "SUK / RIMURU — méta-agents auto-améliorants", ma: "Agent versioning natif. Chaque amélioration prompt = nouvelle version. Sessions critiques pinnent la version stable." },
  { minato: "SHIKAMARU — R&B data+content+revenue", ma: "Agent spécialisé research appelé comme custom tool par l'orchestrator" },
  { minato: "KAIOKEN — parallèle massif", ma: "Promise.all côté custom tool : 1 call lance N scripts en parallèle sur le VPS" },
  { minato: "NAMI — scout → build → pitch", ma: "Pipeline 3 custom tools chaînés. Orchestrator décide quand déclencher selon état Genkidama" },
  { minato: "GENKIDAMA — objectifs 100%", ma: "Skill `objectifs.md` (cibles par projet) + tool `check_genkidama_progress()` lit Supabase counts" },
  { minato: "ITACHI / HANCOCK / ROCK LEE — content 3.0 FTG", ma: "Crons VPS 5min `content-generation` — trade plans, production plans, rich methods via cascade 10 providers" },
  { minato: "CASCADE 10 providers", ma: "`agents/providers.ts` — Gemini ×4 keys → Groq ×2 → OpenAI ×4 → Mistral → Together. Auto-fallback sur 429/quota." },
  { minato: "SENKU — root-cause audit", ma: "Skill obligatoire : replay E2E à chaque bug, jamais patch local seul" },
  { minato: "DOKHO — guardian DB", ma: "Crons maintenance idempotents sur matviews/caches — `country_opportunity_stats_matview`, `opportunity_content_cache`, `product_country_videos_cache`" },
  { minato: "SHAKA — mode autonome", ma: "Flag session : exécution sans confirmation utilisateur, propagation en continu" },
  { minato: "NEJI — supervisor infinite overshoot", ma: "Monitoring cross-projet : si agent idle 5min → NAMI reload target, scale agents, jamais de capacity gap silencieuse" },
  { minato: "Commit toutes les 15-20 min", ma: "Hook auto à chaque session.status_idle (stop_reason=end_turn) → tool `commit_progress`" },
  { minato: "Update Insights CC", ma: "Tool `update_cc_insights` appelé après chaque batch → table `dashboard_insights`" },
  { minato: "Per-site user isolation", ma: "Vault par projet → credentials cloisonnés (FTG / OFA / CC / Estate vaults séparés)" },
];

const COSTS = [
  { layer: "Cerveau (Minato orchestrator)", tech: "Managed Agent Opus 4.7 · 1M context", cost: "~50€/mois" },
  { layer: "Bras (Shikamaru R&B, Nami pipelines, Kushina content)", tech: "Managed Agent Opus 4.7", cost: "~30€/mois" },
  { layer: "Soldats niveau 1 (Kakashi scan, Kurama images, Akame gate)", tech: "tsx + Gemini Flash gratuit", cost: "0€" },
  { layer: "Content 3.0 (Itachi, Hancock, Rock Lee)", tech: "Cascade 10 providers — free tier d'abord, OpenAI fallback", cost: "~5€/mois" },
  { layer: "Réflexes (Dokho crons, Neji monitoring)", tech: "PM2 + bash", cost: "0€" },
  { layer: "POC minimal (Minato seul, 1-2 runs/jour)", tech: "Managed Agent Opus 4.7", cost: "~10-15€/mois" },
  { layer: "Infinite Tsukuyomi (agents never-idle 24/7)", tech: "Cumul stack complet", cost: "~150€/mois max (plafond NEJI)" },
];

const GAINS = [
  { axe: "Tokens consommés / tâche", maSeul: "Baseline (100%)", minatoMa: "−40 à −60%", why: "KAKASHI évite la re-discovery des briques (FTG/OFA/CC). Skills chargés à la demande au lieu de tout en system prompt." },
  { axe: "Coût $ / tâche complète", maSeul: "Baseline", minatoMa: "−35 à −50%", why: "Cumul tokens system réduits + soldats locaux gratuits (Gemini Flash) gardent les jobs lourds hors Opus." },
  { axe: "Latence end-to-end", maSeul: "Séquentiel par défaut", minatoMa: "÷3 à ÷5 sur batch", why: "KAIOKEN custom tool = Promise.all(N agents) en 1 call. MA seul appellerait N tools séquentiellement." },
  { axe: "Context window utilisé (system)", maSeul: "Tout chargé upfront", minatoMa: "−60 à −70%", why: "Skills (kakashi-bricks, personas, objectifs) chargés progressivement. System prompt minimal." },
  { axe: "Profondeur d'expertise métier", maSeul: "Générique", minatoMa: "Spécialisé par domaine", why: "Personas FTG/OFA + Deep Typology + Product Taxonomy = expertise verticale qu'un agent vanilla doit redécouvrir." },
  { axe: "Résilience / reprise sur erreur", maSeul: "Reschedule auto natif", minatoMa: "Reschedule + KAIOKEN partiel + cascade", why: "Si 2/10 agents échouent, KAIOKEN continue les 8 autres, NAMI repart au stade scout. MA seul retry tout depuis le début." },
  { axe: "Reproductibilité runs", maSeul: "~70% (drift modèle)", minatoMa: "≈100%", why: "Agent versioning + Skills versionnées + custom tools déterministes = run identique à n+1." },
  { axe: "Erreurs / tâtonnements", maSeul: "Modèle improvise", minatoMa: "−40 à −60%", why: "NAMI = pipeline pré-cadré (scout→build→pitch). GENKIDAMA = cibles explicites. Pas de réinvention." },
  { axe: "Compounding gains (auto-improve)", maSeul: "Aucun (sessions isolées)", minatoMa: "Cumul à chaque run", why: "SUK met à jour les Skills avec ce qui marche. Chaque session enrichit les suivantes (mémoire collective)." },
  { axe: "Coverage projets multi-business", maSeul: "1 agent générique", minatoMa: "5 projets simultanés", why: "1 Minato Orchestrator + Skills par projet (FTG/OFA/Estate/Shift/CC). Sessions parallèles, isolation propre." },
  { axe: "Observabilité métier (V/R, KPI)", maSeul: "Logs techniques", minatoMa: "Insights CC auto-update", why: "Hook update_cc_insights après chaque batch = dashboard métier toujours à jour. MA seul s'arrête au technique." },
  { axe: "Onboarding d'un nouveau projet", maSeul: "Repartir de zéro", minatoMa: "Hériter Personas+Skills", why: "Bibliothèque de Personas métier × région mutualisée. Nouveau projet = Skill custom + héritage commun." },
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

function LaunchPanel() {
  const [project, setProject] = useState("ofa");
  const [message, setMessage] = useState("Lance Minato sur OFA : status_check puis KAIOKEN sur refresh-demos + recover-incomplete. Update Insights CC à la fin.");
  const [launching, setLaunching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const launch = async () => {
    setLaunching(true);
    setErr(null);
    try {
      const r = await fetch("/api/minato/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, project }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "launch failed");
      window.location.href = `/admin/minato/session/${j.session_id}`;
    } catch (e) {
      setErr(String(e));
      setLaunching(false);
    }
  };

  return (
    <div style={{ background: C.card, padding: 16, borderRadius: 8, border: `1px solid ${C.gold}`, marginBottom: 32 }}>
      <div style={{ color: C.gold, fontWeight: 600, marginBottom: 10, fontSize: 16 }}>🚀 Lancer une session Minato</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        {["ofa", "ftg", "estate", "shift", "cc"].map((p) => (
          <button key={p} onClick={() => setProject(p)} style={{ padding: "6px 14px", background: project === p ? C.gold : "transparent", color: project === p ? C.bg : C.muted, border: `1px solid ${project === p ? C.gold : "rgba(255,255,255,.1)"}`, borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ width: "100%", background: "rgba(0,0,0,.3)", color: C.text, border: `1px solid rgba(255,255,255,.1)`, borderRadius: 6, padding: 10, fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <div style={{ color: C.muted, fontSize: 12 }}>💰 ~$0.20-3.00 par session · Stream live sur page dédiée</div>
        <button onClick={launch} disabled={launching} style={{ padding: "8px 20px", background: launching ? C.muted : C.gold, color: C.bg, border: "none", borderRadius: 6, cursor: launching ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14 }}>
          {launching ? "Démarrage..." : "⚡ Lancer"}
        </button>
      </div>
      {err && <div style={{ color: "#FF6B6B", marginTop: 8, fontSize: 12 }}>❌ {err}</div>}
    </div>
  );
}

export default function MinatoDocPage() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "32px 24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <LaunchPanel />
        <CapacitySection />
        <header style={{ marginBottom: 32, borderBottom: C.border, paddingBottom: 16 }}>
          <h1 style={{ fontSize: 32, color: C.gold, margin: 0, letterSpacing: ".02em" }}>
            ⚡ MINATO × MANAGED AGENTS — v2 (Shaka 2026-04-21)
          </h1>
          <p style={{ color: C.muted, marginTop: 8, fontSize: 14 }}>
            Architecture hybride — Méthodologie Shonen Ultimate Skill couplée à Opus 4.7 (1M context).
            <strong style={{ color: C.gold }}> Arsenal étendu — 7 niveaux + ∞</strong>, cascade LLM 10 providers, mode SHAKA autonome.
            Orchestration multi-projets (FTG · OFA · Estate · Shift · CC).
          </p>
          <div style={{ marginTop: 12, padding: 10, background: `${C.gold}10`, border: `1px dashed ${C.gold}40`, borderRadius: 6, fontSize: 12, color: C.muted }}>
            <strong style={{ color: C.gold }}>⚡ Nouveautés 2026-04-20→21 :</strong>
            {' '}Cascade LLM 10 providers débloquée (OpenAI fallback gratuit quand Gemini/Groq saturé){' · '}
            Content-gen FTG (Shisui + Shikamaru/Itachi/Hancock/RockLee){' · '}
            Marketplace fee tiered fixe + PPP (anti-fraude 2.5%){' · '}
            Store single-site-per-seller B2B/B2C adaptatif{' · '}
            CRM unifié (pipeline matches + deal rooms + warm network).
          </div>
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
          <h2 style={{ color: C.gold, fontSize: 20, marginBottom: 12 }}>📈 Plus-value Minato × MA vs Managed Agents seul</h2>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12, fontStyle: "italic" }}>
            % estimés en ordre de grandeur (méthodologie : comparaison runs équivalents avec/sans Skills+custom tools+pipelines pré-cadrés).
            Affinés au fil des sessions réelles via Insights CC.
          </div>
          <div style={{ background: C.card, borderRadius: 8, border: C.border, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.cardAlt }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: C.gold, borderBottom: C.border, width: "22%" }}>Axe</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: C.muted, borderBottom: C.border, width: "20%" }}>MA seul</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: C.gold, borderBottom: C.border, width: "20%" }}>Minato × MA</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: C.muted, borderBottom: C.border }}>Pourquoi</th>
                </tr>
              </thead>
              <tbody>
                {GAINS.map((g, i) => (
                  <tr key={i} style={{ borderBottom: i < GAINS.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                    <td style={{ padding: "10px 12px", color: C.text, fontWeight: 500 }}>{g.axe}</td>
                    <td style={{ padding: "10px 12px", color: C.muted }}>{g.maSeul}</td>
                    <td style={{ padding: "10px 12px", color: C.gold, fontWeight: 600 }}>{g.minatoMa}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, fontSize: 11 }}>{g.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background: C.cardAlt, padding: 14, borderRadius: 8, marginTop: 12, border: C.border }}>
            <div style={{ color: C.gold, fontWeight: 600, marginBottom: 6, fontSize: 14 }}>💡 Le vrai différenciateur</div>
            <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>
              Managed Agents donne une <b>infra</b> (loop hébergée, container, SSE, vault). Minato apporte la <b>méthodologie</b>
              (KAKASHI évite la duplication, SUK auto-améliore, KAIOKEN parallélise, NAMI structure le pipeline, GENKIDAMA cible).
              <br/><br/>
              Sans Minato, MA est un <i>moteur sans pilote</i> : puissant mais réinvente à chaque run, consomme plus de tokens,
              improvise sans context métier. Avec Minato, MA devient un <b>système d'agents auto-améliorants</b> qui capitalise
              sur chaque exécution et exploite ton infra existante (briques FTG/OFA/CC) au lieu de la dupliquer.
              <br/><br/>
              <b style={{ color: C.gold }}>Résultat global estimé : 2 à 4× plus de valeur produite par € dépensé</b> vs MA vanilla,
              avec compounding gains qui s'accentuent à chaque session (Skills enrichies, Personas affinées, briques mutualisées).
            </div>
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
          Doc Minato × Managed Agents · v2 · 2026-04-21 (Shaka) · Command Center Admin
        </footer>
      </div>
    </div>
  );
}
