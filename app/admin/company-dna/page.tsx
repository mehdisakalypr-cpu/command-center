import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Company DNA · Command Center",
  description: "Canonical 15-stage lifecycle for spinning up a 100% AI SaaS in the gapup.io portfolio. Single source of truth for the founder + the create-saas-company skill.",
};

type Stage = {
  num: string;
  name: string;
  intent: string;
  entry: string;
  actions: string[];
  exit: string;
  gate?: string;
  reference?: { url: string; label: string };
};

const STAGES: Stage[] = [
  {
    num: "0",
    name: "Validation marché",
    intent: "Vérifier qu'il existe une demande payante avant d'écrire une ligne de code.",
    entry: "Idée brute + cible candidate.",
    actions: [
      "signal-hunter (skill) → buying intent (funding, hires, RFPs, jobs hinting at problem)",
      "trend-watcher (skill) → vertical heat",
      "lead-hunter (skill) → enumerate addressable accounts",
      "research-scout (skill) → competitive landscape",
    ],
    exit: "≥3 buying-intent signals AND ≥10k addressable accounts. Sinon : kill.",
  },
  {
    num: "1",
    name: "Idée SaaS + brand",
    intent: "Réserver le slug, le domain, créer les brand assets.",
    entry: "Validation passed.",
    actions: [
      "Slug ≤30 chars kebab-case",
      "Domain <slug>.gapup.io (Cloudflare API + Vercel attach)",
      "Brand assets : logo / favicon / OG image 1200×630 / palette",
      "Tagline ≤80 chars + value prop 1-line",
      "ICP table : persona × pain × current solution × budget",
    ],
    exit: "Domain DNS resolves + brand committed + ICP en MEMORY.",
  },
  {
    num: "2",
    name: "Site web",
    intent: "Pages canon (Home/Services/Offres/FAQ/Contact + footer + chatbot).",
    entry: "Brand validé.",
    actions: [
      "Kakashi-first : copy /var/www/aici/* → /var/www/<slug>/",
      "Adapt copy to slug (h1/h2, ICPs, screenshots)",
      "Footer 4 cols FR (Services / Ressources / Mentions / Entreprise)",
      "Chatbot route bespoke system prompt (3 tiers + 100% IA + no-trial)",
      "Hero CTA 3 stacked buttons (démo animé / offres / générer)",
      "IP watermark via /root/tools/inject-watermark.ts --apply",
    ],
    exit: "Site live, type-check OK, footer FR, chatbot live.",
    reference: { url: "https://aici.gapup.io", label: "ref AICI" },
  },
  {
    num: "3",
    name: "Démo S-tier (bespoke)",
    intent: "Démo self-contained avec données plausibles + Pollinations + dogfood.",
    entry: "Site live.",
    actions: [
      "Hero Pollinations https://image.pollinations.ai/prompt/<bespoke> — vérifier HEAD 200 + ≥5KB",
      "6 KPIs domain-real",
      "6 detail sections tag/title/body/metric",
      "Comparaison vs 4 concurrents bespoke + price",
      "Dogfood callout 'preuve de valeur ultime' (référence AICI commit 7f9aad7)",
      "Locale FR · boutons inline-style hex",
    ],
    exit: "/demo live, no Notion/Coda stale refs, type-check 0 erreur.",
    reference: { url: "https://aici.gapup.io/demo", label: "ref AICI /demo" },
  },
  {
    num: "3.5",
    name: "Standardize on AICI Section* model",
    intent: "Re-écrire en architecture AICI Section* + data.ts pour que le service réel ait un contrat clair.",
    entry: "Bespoke démo live.",
    actions: [
      "12 Section* dans l'ordre canonique",
      "data.ts ~25 typed exports → contrat pour le service backend",
      "Charts (TrafficChart/RadarChartAici/JobsChart) lisent de data.ts (pas hardcoded)",
      "Dogfood callout dans SectionCompetitors",
    ],
    exit: "/demo standardisé, data.ts complet typé, dogfood présent.",
    reference: { url: "/var/www/aici/app/demo/_components/", label: "12 Section* canon" },
  },
  {
    num: "4",
    name: "Codage du service réel",
    intent: "Backend qui livre ce que la démo promet — pipeline rapport (Générer + SSE % + persistence).",
    entry: "Démo standardisée.",
    actions: [
      "lib/<slug>-report-generator.ts (modèle AICI)",
      "lib/<slug>-report-export.ts (CSV / Markdown / Print HTML)",
      "/api/<entity>/[id]/snapshot route SSE",
      "/api/<entity>/[id]/reports/[snapshotId]/{route,csv,markdown,print}",
      "<ReportView> shared component",
      "/dashboard/<entity>/[id]/page.tsx avec historique",
      "Migration SQL : column report_data jsonb",
    ],
    exit: "Bouton Générer → progress 0→100% → rapport rendu → 3 downloads OK.",
    reference: { url: "https://github.com/mehdisakalypr-cpu/aici/commit/9e6dea4", label: "AICI commit 9e6dea4" },
  },
  {
    num: "5",
    name: "Tests E2E",
    intent: "Playwright sur le golden path payant.",
    entry: "Service backend.",
    actions: [
      "playwright signup → checkout → setup → première génération → email → download",
      "Adversarial : rate-limit, CSRF, magic-link bypass",
    ],
    exit: "Tests verts en local + CI.",
  },
  {
    num: "5.5",
    name: "Beta / waitlist",
    intent: "Valider sur 5-20 early users avant ouverture publique.",
    entry: "E2E green.",
    actions: [
      "Page /beta avec waitlist form",
      "Admin impersonate pour grant access",
      "Collecter feedback 1-2 sem",
    ],
    exit: "≥5 beta users ont fait leur première génération + feedback synthé.",
  },
  {
    num: "6",
    name: "i18n 7 langues",
    intent: "Site dispo en FR/EN/DE/ES/IT/PT/NL.",
    entry: "Beta validée.",
    actions: [
      "Install next-intl",
      "i18n/locales/<lang>/{common,home,offres,demo,faq,contact,legal,emails}.json",
      "Traduction batch via Claude (system prompt strict)",
      "Routing /<locale>/... + middleware Accept-Language + Vercel geo",
      "Cookie NEXT_LOCALE persiste choix",
      "RÈGLE 100% une langue à la fois (pas de mix)",
    ],
    exit: "7 langues rendent intégralement, zéro fuite cross-langue.",
  },
  {
    num: "7",
    name: "Offres + légal",
    intent: "Pricing 3 tiers × 4 durées + CGU/CGV/Privacy/Mentions par juridiction.",
    entry: "i18n done.",
    actions: [
      "3 tiers (Pro €99 / Business €299 / Enterprise €999) × 4 durées",
      "Réutiliser tier-limits.ts pattern AICI",
      "CGU/CGV/Privacy/Mentions per juridiction depuis /root/portfolio-config/legal-texts/",
      "Aucun essai gratuit, annulation soft (période entamée = accès jusqu'au prochain prélèvement)",
      "DPO email + 6 droits RGPD listés",
    ],
    exit: "/offres + /legal/* live FR, type-check clean.",
  },
  {
    num: "7.5",
    name: "Onboarding flow",
    intent: "Premier login d'un client payant = magic moment <10 min.",
    entry: "Offres live.",
    actions: [
      "Setup wizard /service/setup en 3-5 steps",
      "Sample data pré-remplie",
      "First report < 10 min après subscription",
    ],
    exit: "Time-to-first-value ≤ 10 min pour 80% des testeurs.",
  },
  {
    num: "8",
    name: "Branchement société + Stripe live",
    intent: "Bascule company.json LLC + Stripe live + DPA + sub-processors.",
    entry: "Onboarding validé.",
    gate: "🚫 GATE LLC — pas avant expatriation effective Portugal/Maroc",
    actions: [
      "Remplir /root/portfolio-config/company.json (legal_name, EIN, address, stripe.live_account_id)",
      "Set LLC_FORMED=true + LLC_FORMED_DATE",
      "bash /root/portfolio-config/scripts/sync-portfolio.sh --apply",
      "Vercel env vars LLC_* updated par slug + git commit + push",
      "Stripe webhook endpoint registered",
      "/security page + DPA template + sub-processor list",
    ],
    exit: "Stripe production live, premier €1 paying client confirmé.",
  },
  {
    num: "9",
    name: "Préparation campagnes leads",
    intent: "Listes ciblées + outreach templates + affiliate.",
    entry: "Stripe live.",
    actions: [
      "lead-hunter (skill) : 1k-10k targeted account list",
      "signal-hunter (skill) : per-account buying signal",
      "comment-engine (skill) : drafts reply queue",
      "Templates outreach FR par ICP (sales playbook v1)",
      "Affiliate / referral 10-15% commission",
    ],
    exit: "200 cold-touch ready + affiliate live.",
  },
  {
    num: "10",
    name: "Communication massive",
    intent: "Multi-canal scheduling + SEO + Product Hunt.",
    entry: "Campagnes prêtes.",
    actions: [
      "Postiz scheduling (LinkedIn / Reddit / X / IH / Mastodon / Bluesky)",
      "Backlinks via guest posts + PH launch",
      "SEO : schema markup + sitemap.xml + Search Console",
    ],
    exit: "30-day cumulative impressions ≥ 100k.",
  },
  {
    num: "11",
    name: "Encaissement",
    intent: "Stripe webhook seed + factures + analytics produit instrumentés.",
    entry: "Communication live.",
    actions: [
      "Webhook customer.subscription.created → seed clients.plan + subscriptions row",
      "Factures PDF + archive DB invoices, cron daily reconciliation Stripe ↔ Mercury",
      "Plausible/PostHog events : signup / checkout_started / first_report / weekly_active",
    ],
    exit: "Premier €100 MRR confirmé, dashboards live.",
  },
  {
    num: "12",
    name: "Monitoring SAV / CRM auto",
    intent: "Argus chatbot tier 1, customer messages pipeline, CRM reactivation.",
    entry: "Encaissement OK.",
    actions: [
      "Argus chatbot 24/7 tier 1 support",
      "customer_messages pipeline /admin/customer-messages avec bulk approve",
      "CRM reactivation 5 emails / 21j pour non-converters",
      "Pricing A/B après 100 paying clients",
    ],
    exit: "NPS ≥ 40, churn < 5%/mo, support < 24h.",
  },
  {
    num: "13",
    name: "Cross-sell hub portfolio",
    intent: "hub.gapup.io expose le bundle multi-SaaS.",
    entry: "≥2 SaaS au stade 12.",
    actions: [
      "Mosaïque hub avec tous SaaS",
      "1 signup / 1 carte / 1 facture multi-lignes",
      "All-Access tier débloqué (€999 → tous SaaS actuels + futurs)",
    ],
    exit: "≥10% des nouveaux paying achètent 2+ SaaS.",
  },
];

const PROTOCOLS = [
  { name: "Sentinel", desc: "Tout cron lit /var/run/cc-resource-state et adapte concurrency", rule: "feedback_sentinel_gate_pattern" },
  { name: "Commit-continu", desc: "Commit toutes les 15-20 min, jamais perdre travail", rule: "feedback_commit_continu" },
  { name: "Pre-push 3-layer", desc: "import-check + tsc + next build avant push", rule: "feedback_minato_install_deps" },
  { name: "Vercel committer email", desc: "mehdi.sakalypr@gmail.com global, jamais override", rule: "feedback_vercel_github_committer_lookup" },
  { name: "Watermark IP", desc: "SPDX header + zero-width fingerprint sur chaque release (M-SAKALY ownership)", rule: "/root/tools/inject-watermark.ts" },
  { name: "Senku adversarial", desc: "« définitivement résolu » exige test adversarial + audit + future-proof", rule: "feedback_senku_definitively_resolved" },
  { name: "No --no-verify", desc: "Pre-push fail = root cause + NEW commit, jamais --amend ni --no-verify", rule: "feedback_minato_install_deps" },
  { name: "Locale 100% strict", desc: "Une langue à la fois, jamais de mix (UI + LLM + DB-cache + emails)", rule: "feedback_locale_consistency_rule" },
];

const REFERENCES = [
  { name: "AICI", url: "https://aici.gapup.io", note: "canonical reference, étape 7" },
  { name: "ai-resume-optimizer-pro", url: "https://ai-resume-optimizer-pro.gapup.io/demo", note: "étape 3 livrée S-tier" },
  { name: "ainf", url: "https://ainf.gapup.io/demo", note: "étape 3 livrée + watermark" },
  { name: "csrd-sfdr-report-autopilot", url: "https://csrd-sfdr-report-autopilot.gapup.io/demo", note: "étape 3 livrée + watermark" },
  { name: "ai-startup-failure-predictor", url: "https://ai-startup-failure-predictor.gapup.io/demo", note: "étape 3 livrée + watermark" },
  { name: "ai-customer-churn-predictor", url: "https://ai-customer-churn-predictor.gapup.io/demo", note: "étape 3 livrée + watermark" },
];

export default function CompanyDnaPage() {
  return (
    <main style={{ padding: "32px 24px", maxWidth: 1180, margin: "0 auto", color: "#F8FAFC" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ fontSize: 13, color: "#A78BFA", textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>

      <header style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#A78BFA", marginBottom: 8 }}>
          Company DNA · 100% AI SaaS factory
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 12px" }}>
          Le workflow canonique des 15 étapes
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", maxWidth: 800, lineHeight: 1.6 }}>
          Single source of truth pour spinner un nouveau SaaS dans le portfolio gapup.io.
          Chaque idée passe les 15 étapes dans l&apos;ordre, jamais sauter. Objectif north-star permanent : <strong>maximiser CA + MRR</strong>.
          Skill associé : <code style={{ background: "rgba(124,58,237,0.18)", padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>/create-saas-company</code>.
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 48 }}>
        {STAGES.map((s) => (
          <article
            key={s.num}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: s.gate ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: 1.2 }}>
                Étape {s.num}
              </span>
              {s.gate ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#F87171", padding: "3px 8px", borderRadius: 4, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  GATE
                </span>
              ) : null}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>{s.name}</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", margin: "0 0 12px", lineHeight: 1.5 }}>
              {s.intent}
            </p>
            {s.gate ? (
              <div style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 10, padding: "6px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>
                {s.gate}
              </div>
            ) : null}
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Entrée</div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "0 0 10px" }}>{s.entry}</p>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Actions</div>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
              {s.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Sortie</div>
            <p style={{ fontSize: 12, color: "#10B981", margin: "0 0 8px" }}>{s.exit}</p>
            {s.reference ? (
              <div style={{ marginTop: 10, fontSize: 11, color: "#06B6D4" }}>
                {s.reference.url.startsWith("http") ? (
                  <a href={s.reference.url} target="_blank" rel="noreferrer" style={{ color: "#06B6D4", textDecoration: "none" }}>
                    {s.reference.label} ↗
                  </a>
                ) : (
                  <span>{s.reference.label} : <code style={{ fontSize: 11 }}>{s.reference.url}</code></span>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 14px" }}>Cross-cutting protocols</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
          Règles appliquées en continu sur toutes les étapes — pas de déviation acceptable.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {PROTOCOLS.map((p) => (
            <div key={p.name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "#FFFFFF" }}>{p.name}</div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "0 0 6px", lineHeight: 1.5 }}>{p.desc}</p>
              <div style={{ fontSize: 11, color: "#A78BFA", fontFamily: "ui-monospace, monospace" }}>{p.rule}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 14px" }}>Références canoniques (état au {new Date().toISOString().slice(0, 10)})</h2>
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
          {REFERENCES.map((r, i) => (
            <div key={r.name} style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", background: i === 0 ? "rgba(124,58,237,0.05)" : "transparent" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{r.note}</div>
              </div>
              <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#06B6D4", fontSize: 13, textDecoration: "none" }}>
                {r.url} ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.12) 100%)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 14, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#FFFFFF" }}>
          Comment lancer un nouveau SaaS depuis cette page
        </h2>
        <ol style={{ paddingLeft: 18, color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.7 }}>
          <li>
            Dans une session Claude Code, tape : <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 4 }}>/create-saas-company &lt;slug&gt;</code>
          </li>
          <li>
            Le skill <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 4 }}>create-saas-company</code> charge les 15 étapes + protocoles + références canoniques en contexte
          </li>
          <li>
            Tu réponds aux questions de cadrage (slug, pitch, ICP, 3-4 concurrents, domaine)
          </li>
          <li>
            L&apos;IA exécute étape par étape avec commit + push à chaque exit criteria atteint
          </li>
          <li>
            Surveille la progression dans <Link href="/admin/saas-portfolio" style={{ color: "#06B6D4" }}>/admin/saas-portfolio</Link> (deployed_url + landing_rendered_at + autonomy_score)
          </li>
        </ol>
      </section>
    </main>
  );
}
