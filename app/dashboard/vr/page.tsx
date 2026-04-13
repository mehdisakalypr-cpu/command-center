"use client";

import { useState, useEffect } from "react";
import HumanTodoPanel from "@/components/HumanTodoPanel";

/* ── Types ───────────────────────────────────────────────── */
type VRData = Record<string, number>;
type Revenue = { mrrOfa: number; mrrFtg: number; mrrSeo: number; totalMrr: number; totalCustomers: number; stripeActive: boolean; };

/* ── Objectifs 30 avril 2026 (Vision) ─────────────────── */
const TARGETS_APRIL_30: Record<string, { label: string; target: number; category: string }> = {
  // OFA
  generatedSites:     { label: "OFA Sites generees",           target: 111573, category: "ofa" },
  publishedSites:     { label: "OFA Sites publies",            target: 100000, category: "ofa" },
  commerceLeads:      { label: "OFA Commerce Leads",           target: 588819, category: "ofa" },
  pitchedLeads:       { label: "OFA Pitches envoyes",          target: 33472,  category: "ofa" },
  onboardedLeads:     { label: "OFA Onboardes",                target: 1674,   category: "ofa" },
  // FTG Data
  opportunities:      { label: "Opportunites FTG",             target: 518923, category: "ftg_data" },
  businessPlans:      { label: "Business Plans enrichis",      target: 22045,  category: "ftg_data" },
  productionCosts:    { label: "Benchmarks couts production",  target: 366423, category: "ftg_data" },
  logistics:          { label: "Corridors logistiques",        target: 5000,   category: "ftg_data" },
  regulations:        { label: "Reglementations pays",         target: 800,    category: "ftg_data" },
  products:           { label: "Produits catalogue",           target: 24871,  category: "ftg_data" },
  // FTG Acquisition
  entrepreneurDemos:  { label: "Demos Scout generees",         target: 23130,  category: "ftg_reach" },
  viewedDemos:        { label: "Demos vues",                   target: 4915,   category: "ftg_reach" },
  convertedDemos:     { label: "Demos converties",             target: 1573,   category: "ftg_reach" },
  seoPages:           { label: "Pages SEO indexees",           target: 2700,   category: "ftg_reach" },
  profiles:           { label: "Utilisateurs inscrits",        target: 4543,   category: "ftg_reach" },
  // Content
  socialPosts:        { label: "Posts sociaux generes",        target: 5000,   category: "content" },
  youtubeInsights:    { label: "Insights YouTube",             target: 500,    category: "content" },
  marketTrends:       { label: "Tendances marche",             target: 500,    category: "content" },
  influencerProfiles: { label: "Profils influenceurs",         target: 1000,   category: "content" },
  dealFlows:          { label: "Deal flows generes",           target: 2000,   category: "content" },
};

const REVENUE_TARGETS = [
  { key: "mrrOfa",  label: "MRR One For All (14,98€/site moy.)",  target: 25077  },
  { key: "mrrFtg",  label: "MRR Feel The Gap (abonnements)", target: 70785 },
  { key: "mrrSeo",  label: "MRR SEO organique",              target: 37584 },
  { key: "totalMrr", label: "TOTAL MRR",                     target: 116573 },
];

const CATEGORIES = [
  { key: "all", label: "Tout" },
  { key: "ofa", label: "One For All" },
  { key: "ftg_data", label: "FTG Donnees" },
  { key: "ftg_reach", label: "FTG Reach" },
  { key: "content", label: "Contenu" },
  { key: "revenue", label: "Revenus" },
];

const C = {
  bg: "#040D1C", card: "#0A1A2E", gold: "#C9A84C", text: "#E8E0D0",
  muted: "#9BA8B8", dim: "#5A6A7A", green: "#10B981", red: "#EF4444",
  purple: "#A78BFA", blue: "#3B82F6",
  border: "1px solid rgba(201,168,76,.15)",
};

/* HumanTodoPanel extracted to /components/HumanTodoPanel.tsx */

/* ── Page ────────────────────────────────────────────────── */
export default function VRPage() {
  const [data, setData] = useState<VRData | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [lastRefresh, setLastRefresh] = useState("");
  const [reinvestPct, setReinvestPct] = useState(70);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/vr-data");
      const json = await res.json();
      setData(json.data);
      setRevenue(json.revenue);
      setLastRefresh(new Date().toLocaleTimeString("fr-FR"));
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold }}>
      Chargement V/R...
    </div>
  );

  const entries = Object.entries(TARGETS_APRIL_30)
    .filter(([, v]) => category === "all" || v.category === category);

  // Global progress
  let totalTarget = 0, totalReal = 0;
  Object.entries(TARGETS_APRIL_30).forEach(([k, v]) => {
    totalTarget += v.target;
    totalReal += (data?.[k] || 0);
  });
  const globalPct = totalTarget > 0 ? (totalReal / totalTarget) * 100 : 0;

  return (
    <div style={{ padding: 24, color: C.text }}>
      <HumanTodoPanel />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>V/R — Vision vs Realise</h1>
          <p style={{ fontSize: ".7rem", color: C.dim, marginTop: 4 }}>
            Objectifs 30 avril 2026 vs donnees reelles en temps reel — Refresh auto 30s
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: globalPct >= 100 ? C.green : globalPct > 50 ? C.gold : C.red }}>
            {globalPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: ".6rem", color: C.dim }}>progression globale — {lastRefresh}</div>
        </div>
      </div>

      {/* Global progress bar */}
      <div style={{ marginBottom: 20, padding: 12, background: C.card, border: C.border }}>
        <div style={{ height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.gold}, ${C.green})`, width: `${Math.min(100, globalPct)}%`, transition: "width .5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: ".55rem", color: C.dim }}>
          <span>{totalReal.toLocaleString("fr-FR")} realise</span>
          <span>{totalTarget.toLocaleString("fr-FR")} objectif</span>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)} style={{
            padding: "5px 12px", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".08em",
            background: category === c.key ? "rgba(201,168,76,.2)" : "rgba(255,255,255,.05)",
            border: `1px solid ${category === c.key ? "rgba(201,168,76,.4)" : "rgba(255,255,255,.1)"}`,
            color: category === c.key ? C.gold : C.muted, cursor: "pointer", fontFamily: "inherit",
          }}>{c.label}</button>
        ))}
      </div>

      {/* Data V/R table */}
      {category !== "revenue" && (
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(201,168,76,.2)" }}>
                <th style={{ ...th(), textAlign: "left" }}>Metrique</th>
                <th style={{ ...th(), textAlign: "right", color: C.purple }}>Vision (30/04)</th>
                <th style={{ ...th(), textAlign: "right", color: C.green }}>Realise</th>
                <th style={{ ...th(), textAlign: "right" }}>% Atteint</th>
                <th style={{ ...th(), textAlign: "right" }}>Delta</th>
                <th style={{ ...th(), textAlign: "left", width: 200 }}>Progression</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, { label, target }]) => {
                const real = data?.[key] || 0;
                const pct = target > 0 ? (real / target) * 100 : 0;
                const delta = real - target;
                const barColor = pct >= 100 ? C.green : pct > 60 ? C.gold : pct > 25 ? "#F59E0B" : C.red;
                return (
                  <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "8px 10px", color: C.text, fontWeight: 500 }}>{label}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: C.purple }}>{target.toLocaleString("fr-FR")}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: C.green }}>{real.toLocaleString("fr-FR")}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: barColor }}>
                      {pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: delta >= 0 ? C.green : C.dim }}>
                      {delta >= 0 ? "+" : ""}{delta.toLocaleString("fr-FR")}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: barColor, width: `${Math.min(100, pct)}%`, transition: "width .3s" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Revenue V/R */}
      {(category === "all" || category === "revenue") && (
        <div style={{ background: C.card, border: C.border, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: ".65rem", color: C.gold, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 16 }}>
            Revenus — Vision vs Realise (MRR mensuel)
          </div>

          {!revenue?.stripeActive && (
            <div style={{ padding: "8px 12px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", marginBottom: 16, fontSize: ".65rem", color: "#FCA5A5" }}>
              Stripe live keys non actives — revenus reels a 0 jusqu'a fin avril (societe US en cours)
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th colSpan={4} />
                <th style={{ textAlign: "center", padding: "4px 10px" }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={reinvestPct}
                    onChange={e => { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)); setReinvestPct(v); }}
                    style={{ width: 52, background: "rgba(167,139,250,.12)", border: "1px solid rgba(167,139,250,.3)", borderRadius: 4, color: "#A78BFA", textAlign: "center", padding: "3px 4px", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                  />
                  <span style={{ color: "#A78BFA", fontSize: 10, marginLeft: 2 }}>%</span>
                </th>
                <th style={{ textAlign: "center", padding: "4px 10px" }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={100 - reinvestPct}
                    onChange={e => { const v = Math.max(0, Math.min(100, Number(e.target.value) || 0)); setReinvestPct(100 - v); }}
                    style={{ width: 52, background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.3)", borderRadius: 4, color: C.green, textAlign: "center", padding: "3px 4px", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                  />
                  <span style={{ color: C.green, fontSize: 10, marginLeft: 2 }}>%</span>
                </th>
                <th />
              </tr>
              <tr style={{ borderBottom: "2px solid rgba(201,168,76,.2)" }}>
                <th style={{ ...th(), textAlign: "left" }}>Source revenu</th>
                <th style={{ ...th(), textAlign: "right", color: C.purple }}>Vision MRR</th>
                <th style={{ ...th(), textAlign: "right", color: C.green }}>Realise MRR</th>
                <th style={{ ...th(), textAlign: "right" }}>% Atteint</th>
                <th style={{ ...th(), textAlign: "right", color: "#A78BFA" }}>Reinvest</th>
                <th style={{ ...th(), textAlign: "right", color: C.green }}>Profit</th>
                <th style={{ ...th(), textAlign: "left", width: 160 }}>Progression</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE_TARGETS.map(rt => {
                const real = (revenue as any)?.[rt.key] || 0;
                const pct = rt.target > 0 ? (real / rt.target) * 100 : 0;
                const isTotal = rt.key === "totalMrr";
                const barColor = pct >= 100 ? C.green : pct > 50 ? C.gold : C.red;
                return (
                  <tr key={rt.key} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: isTotal ? "rgba(201,168,76,.06)" : undefined }}>
                    <td style={{ padding: "8px 10px", color: C.text, fontWeight: isTotal ? 700 : 500 }}>{rt.label}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: C.purple }}>{rt.target.toLocaleString("fr-FR")} EUR</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: real > 0 ? C.green : C.dim }}>{real.toLocaleString("fr-FR")} EUR</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: barColor }}>{pct.toFixed(1)}%</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#A78BFA" }}>{Math.round(real * reinvestPct / 100).toLocaleString("fr-FR")} EUR</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: C.green }}>{Math.round(real * (100 - reinvestPct) / 100).toLocaleString("fr-FR")} EUR</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: barColor, width: `${Math.min(100, pct)}%`, transition: "width .3s" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <SummaryCard label="OFA Sites" real={data?.generatedSites || 0} target={111573} color={C.gold} />
        <SummaryCard label="FTG Opportunites" real={data?.opportunities || 0} target={518923} color={C.blue} />
        <SummaryCard label="Scout Demos" real={data?.entrepreneurDemos || 0} target={23130} color={C.purple} />
        <SummaryCard label="Business Plans" real={data?.businessPlans || 0} target={22045} color={C.green} />
        <SummaryCard label="Total MRR" real={revenue?.totalMrr || 0} target={116573} color={C.gold} suffix=" EUR" />
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */
function th(): React.CSSProperties {
  return { padding: "8px 10px", color: "#C9A84C", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em" };
}

function SummaryCard({ label, real, target, color, suffix = "" }: { label: string; real: number; target: number; color: string; suffix?: string }) {
  const pct = target > 0 ? (real / target) * 100 : 0;
  return (
    <div style={{ background: "#0A1A2E", border: `1px solid ${color}33`, padding: "14px 16px" }}>
      <div style={{ fontSize: ".6rem", color: "#5A6A7A", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: "1.3rem", fontWeight: 800, color }}>{real.toLocaleString("fr-FR")}{suffix}</span>
        <span style={{ fontSize: ".6rem", color: "#5A6A7A" }}>/ {target.toLocaleString("fr-FR")}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
        <div style={{ height: "100%", borderRadius: 2, background: color, width: `${Math.min(100, pct)}%` }} />
      </div>
      <div style={{ fontSize: ".55rem", color: pct >= 100 ? "#10B981" : "#5A6A7A", marginTop: 3 }}>{pct.toFixed(1)}%</div>
    </div>
  );
}
