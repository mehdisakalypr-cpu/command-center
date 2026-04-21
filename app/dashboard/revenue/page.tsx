"use client";

import { useState, useEffect } from "react";

const C = { gold: "#C9A84C", green: "#10B981", purple: "#A78BFA", red: "#EF4444", blue: "#3B82F6" };

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/vr-data").then(r => r.json()).then(setData);
  }, []);

  const d = data?.data || {};
  const rev = data?.revenue || {};

  // OFA revenue calc
  const ofaSites = d.generatedSites || 0;
  const ofaOnboarded = d.onboardedLeads || 0;
  const avgMrrOfa = 4.99;
  const potentialMrrOfa = Math.round(ofaSites * 0.05 * avgMrrOfa);
  const realMrrOfa = rev.mrrOfa || 0;

  // FTG revenue calc
  const ftgUsers = d.profiles || 0;
  const ftgConverted = d.convertedDemos || 0;
  const avgMrrFtg = 45;
  const potentialMrrFtg = Math.round(ftgConverted * avgMrrFtg);
  const realMrrFtg = rev.mrrFtg || 0;

  // Total
  const totalPotential = potentialMrrOfa + potentialMrrFtg;
  const totalReal = realMrrOfa + realMrrFtg;
  const reinvest = Math.round(totalReal * 0.7);
  const profit = Math.round(totalReal * 0.3);

  return (
    <div style={{ padding: 24, color: "#E8E0D0", fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 4 }}>Revenue Centralise — Nami 70/30</h1>
      <p style={{ fontSize: ".7rem", color: "#5A6A7A", marginBottom: 24 }}>
        FTG + OFA cumule — AAM autofinancement — Reinvest 70% / Profit 30%
      </p>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPI label="MRR Potentiel Total" value={`${totalPotential.toLocaleString()} EUR`} color={C.gold} />
        <KPI label="MRR Reel" value={`${totalReal.toLocaleString()} EUR`} color={totalReal > 0 ? C.green : C.red} />
        <KPI label="70% Reinvest" value={`${reinvest.toLocaleString()} EUR`} color={C.purple} />
        <KPI label="30% Profit" value={`${profit.toLocaleString()} EUR`} color={C.green} />
      </div>

      {/* Per project */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* OFA */}
        <div style={{ background: "#0A1A2E", border: "1px solid rgba(34,197,94,.2)", padding: 20 }}>
          <div style={{ fontSize: ".65rem", color: C.green, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 12 }}>
            ONE FOR ALL
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Stat label="Sites generes" value={ofaSites.toLocaleString()} />
            <Stat label="Onboardes" value={ofaOnboarded.toLocaleString()} />
            <Stat label="MRR potentiel" value={`${potentialMrrOfa.toLocaleString()} EUR`} color={C.gold} />
            <Stat label="MRR reel" value={`${realMrrOfa.toLocaleString()} EUR`} color={realMrrOfa > 0 ? C.green : "#5A6A7A"} />
          </div>
          <div style={{ marginTop: 12, fontSize: ".6rem", color: "#5A6A7A" }}>
            Avg MRR/site: {avgMrrOfa} EUR | Conv rate target: 5%
          </div>
        </div>

        {/* FTG */}
        <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.2)", padding: 20 }}>
          <div style={{ fontSize: ".65rem", color: C.gold, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 12 }}>
            FEEL THE GAP
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Stat label="Demos Scout" value={(d.entrepreneurDemos || 0).toLocaleString()} />
            <Stat label="Convertis" value={ftgConverted.toLocaleString()} />
            <Stat label="MRR potentiel" value={`${potentialMrrFtg.toLocaleString()} EUR`} color={C.gold} />
            <Stat label="MRR reel" value={`${realMrrFtg.toLocaleString()} EUR`} color={realMrrFtg > 0 ? C.green : "#5A6A7A"} />
          </div>
          <div style={{ marginTop: 12, fontSize: ".6rem", color: "#5A6A7A" }}>
            Avg MRR/user: {avgMrrFtg} EUR | Scout conv: 8%
          </div>
        </div>
      </div>

      {/* Stripe status */}
      <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.2)", padding: 16, fontSize: ".7rem", color: "#FCA5A5" }}>
        Stripe live keys non actives — revenus reels a 0 EUR jusqu'a activation societe US (fin avril).
        Des activation → outreach automatique sur {(d.commerceLeads || 0).toLocaleString()} leads + {(d.entrepreneurDemos || 0).toLocaleString()} demos.
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.1)", padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: ".55rem", color: "#5A6A7A", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: ".9rem", fontWeight: 700, color: color || "#E8E0D0" }}>{value}</div>
      <div style={{ fontSize: ".5rem", color: "#5A6A7A" }}>{label}</div>
    </div>
  );
}
