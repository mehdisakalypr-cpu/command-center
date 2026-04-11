"use client";

import { useState, useEffect } from "react";

/* ── Types ───────────────────────────────────────────────── */
type Campaign = {
  id: string; name: string; channel: string; target_type: string;
  country_iso: string | null; sector: string | null;
  target_sent: number; expected_open_rate: number; expected_click_rate: number;
  expected_reply_rate: number; expected_signup_rate: number; expected_convert_rate: number;
  status: string; started_at: string | null; notes: string | null;
};
type Funnel = {
  campaignId: string;
  counts: Record<string, number>;
  rates: Record<string, number>;
  dailyMetrics: any[];
};

const C = {
  bg: "#040D1C", card: "#0A1A2E", gold: "#C9A84C", text: "#E8E0D0",
  muted: "#9BA8B8", dim: "#5A6A7A", green: "#10B981", red: "#EF4444",
  purple: "#A78BFA", blue: "#3B82F6", orange: "#F59E0B",
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "#3B82F6", linkedin: "#0A66C2", whatsapp: "#25D366",
  sms: "#F59E0B", seo: "#10B981", social: "#A78BFA", ads: "#EF4444", referral: "#C9A84C",
};

const TARGET_COLORS: Record<string, string> = {
  entrepreneur: "#C9A84C", commerce: "#10B981", investor: "#3B82F6",
  influencer: "#A78BFA", buyer: "#F59E0B",
};

const FUNNEL_STAGES = [
  { key: "sent", label: "Envoyes", icon: "📤" },
  { key: "opened", label: "Ouverts", icon: "📬" },
  { key: "clicked", label: "Cliques", icon: "👆" },
  { key: "replied", label: "Repondus", icon: "💬" },
  { key: "visited", label: "Visites", icon: "👁" },
  { key: "signup", label: "Inscrits", icon: "✍" },
  { key: "converted", label: "Convertis", icon: "💰" },
];

const RATE_KEYS: Record<string, string> = {
  sent: "", opened: "open_rate", clicked: "click_rate", replied: "reply_rate",
  visited: "visit_rate", signup: "signup_rate", converted: "convert_rate",
};

const EXPECTED_KEYS: Record<string, string> = {
  opened: "expected_open_rate", clicked: "expected_click_rate",
  replied: "expected_reply_rate", visited: "expected_visit_rate",
  signup: "expected_signup_rate", converted: "expected_convert_rate",
};

/* ── Main Page ───────────────────────────────────────────── */
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");

  useEffect(() => {
    fetch("/api/admin/campaigns")
      .then(r => r.json())
      .then(d => { setCampaigns(d.campaigns || []); setFunnels(d.funnels || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold }}>
      Chargement campagnes...
    </div>
  );

  const filtered = campaigns.filter(c =>
    (filterType === "all" || c.target_type === filterType) &&
    (filterChannel === "all" || c.channel === filterChannel)
  );

  const funnelMap = new Map(funnels.map(f => [f.campaignId, f]));
  const selected = selectedCampaign ? campaigns.find(c => c.id === selectedCampaign) : null;
  const selectedFunnel = selectedCampaign ? funnelMap.get(selectedCampaign) : null;

  // Aggregated totals
  const totals = { sent: 0, opened: 0, clicked: 0, replied: 0, visited: 0, signup: 0, converted: 0 };
  const expectedTotals = { sent: 0, opened: 0, clicked: 0, replied: 0, visited: 0, signup: 0, converted: 0 };
  filtered.forEach(c => {
    const f = funnelMap.get(c.id);
    const s = c.target_sent || 0;
    totals.sent += f?.counts.sent || f?.counts.total || 0;
    totals.opened += f?.counts.opened || 0;
    totals.clicked += f?.counts.clicked || 0;
    totals.replied += f?.counts.replied || 0;
    totals.visited += f?.counts.visited || 0;
    totals.signup += f?.counts.signup || 0;
    totals.converted += f?.counts.converted || 0;
    expectedTotals.sent += s;
    expectedTotals.opened += Math.round(s * (c.expected_open_rate || 0) / 100);
    expectedTotals.clicked += Math.round(s * (c.expected_open_rate || 0) / 100 * (c.expected_click_rate || 0) / 100);
    expectedTotals.replied += Math.round(s * (c.expected_reply_rate || 0) / 100);
    expectedTotals.signup += Math.round(s * (c.expected_signup_rate || 0) / 100);
    expectedTotals.converted += Math.round(s * (c.expected_convert_rate || 0) / 100);
  });

  return (
    <div style={{ padding: 24, color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>Campagnes & Funnels</h1>
        <p style={{ fontSize: ".7rem", color: C.dim, marginTop: 4 }}>
          {campaigns.length} campagnes — V/R par canal, typologie, taux de conversion
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontSize: ".6rem", color: C.dim, alignSelf: "center", marginRight: 4 }}>TYPE:</span>
          {["all", "entrepreneur", "commerce", "investor", "influencer", "buyer"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: "4px 10px", fontSize: ".58rem", textTransform: "uppercase",
              background: filterType === t ? (TARGET_COLORS[t] || C.gold) + "22" : "rgba(255,255,255,.05)",
              border: `1px solid ${filterType === t ? (TARGET_COLORS[t] || C.gold) + "66" : "rgba(255,255,255,.1)"}`,
              color: filterType === t ? (TARGET_COLORS[t] || C.gold) : C.muted, cursor: "pointer", fontFamily: "inherit",
            }}>{t === "all" ? "Tous" : t}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ fontSize: ".6rem", color: C.dim, alignSelf: "center", marginRight: 4 }}>CANAL:</span>
          {["all", "email", "linkedin", "whatsapp", "seo", "social"].map(ch => (
            <button key={ch} onClick={() => setFilterChannel(ch)} style={{
              padding: "4px 10px", fontSize: ".58rem", textTransform: "uppercase",
              background: filterChannel === ch ? (CHANNEL_COLORS[ch] || C.gold) + "22" : "rgba(255,255,255,.05)",
              border: `1px solid ${filterChannel === ch ? (CHANNEL_COLORS[ch] || C.gold) + "66" : "rgba(255,255,255,.1)"}`,
              color: filterChannel === ch ? (CHANNEL_COLORS[ch] || C.gold) : C.muted, cursor: "pointer", fontFamily: "inherit",
            }}>{ch === "all" ? "Tous" : ch}</button>
          ))}
        </div>
      </div>

      {/* Aggregated funnel V/R */}
      <div style={{ background: C.card, border: "1px solid rgba(201,168,76,.15)", padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: ".65rem", color: C.gold, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 16 }}>
          Funnel agrege — Vision vs Realise ({filtered.length} campagnes)
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "end" }}>
          {FUNNEL_STAGES.map((stage, i) => {
            const expected = (expectedTotals as any)[stage.key] || 0;
            const real = (totals as any)[stage.key] || 0;
            const maxVal = Math.max(expectedTotals.sent, 1);
            const expectedH = Math.max(8, (expected / maxVal) * 180);
            const realH = Math.max(4, (real / maxVal) * 180);
            const pct = expected > 0 ? ((real / expected) * 100) : 0;
            return (
              <div key={stage.key} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: ".5rem", color: C.dim, marginBottom: 4 }}>{stage.icon}</div>
                <div style={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "end", height: 180 }}>
                  <div style={{ width: 16, height: expectedH, background: C.purple + "40", borderRadius: "3px 3px 0 0" }} title={`Vision: ${expected}`} />
                  <div style={{ width: 16, height: realH, background: real > 0 ? C.green : C.dim + "40", borderRadius: "3px 3px 0 0" }} title={`Realise: ${real}`} />
                </div>
                <div style={{ fontSize: ".5rem", color: C.muted, marginTop: 4 }}>{stage.label}</div>
                <div style={{ fontSize: ".55rem", color: C.purple }}>{expected.toLocaleString("fr-FR")}</div>
                <div style={{ fontSize: ".55rem", fontWeight: 700, color: real > 0 ? C.green : C.dim }}>{real.toLocaleString("fr-FR")}</div>
                <div style={{ fontSize: ".5rem", color: pct >= 100 ? C.green : pct > 0 ? C.orange : C.dim }}>{pct.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10, fontSize: ".55rem" }}>
          <span style={{ color: C.purple }}>■ Vision</span>
          <span style={{ color: C.green }}>■ Realise</span>
        </div>
      </div>

      {/* Campaign cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
        {filtered.map(c => {
          const f = funnelMap.get(c.id);
          const chColor = CHANNEL_COLORS[c.channel] || C.gold;
          const tColor = TARGET_COLORS[c.target_type] || C.gold;
          const isSelected = selectedCampaign === c.id;

          return (
            <div key={c.id} onClick={() => setSelectedCampaign(isSelected ? null : c.id)} style={{
              background: isSelected ? "rgba(201,168,76,.08)" : C.card,
              border: `1px solid ${isSelected ? C.gold + "66" : "rgba(255,255,255,.08)"}`,
              padding: 16, cursor: "pointer", transition: "all .15s",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: ".5rem", padding: "2px 6px", background: chColor + "22", border: `1px solid ${chColor}44`, color: chColor, textTransform: "uppercase", fontWeight: 700 }}>
                  {c.channel}
                </span>
                <span style={{ fontSize: ".5rem", padding: "2px 6px", background: tColor + "22", border: `1px solid ${tColor}44`, color: tColor, textTransform: "uppercase" }}>
                  {c.target_type}
                </span>
                <span style={{ fontSize: ".5rem", padding: "2px 6px", background: c.status === "active" ? C.green + "22" : "rgba(255,255,255,.05)", color: c.status === "active" ? C.green : C.dim }}>
                  {c.status}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: ".8rem", marginBottom: 8 }}>{c.name}</div>

              {/* Mini funnel */}
              <div style={{ display: "flex", gap: 2 }}>
                {FUNNEL_STAGES.map(stage => {
                  const expected = stage.key === "sent" ? c.target_sent :
                    Math.round(c.target_sent * ((c as any)[EXPECTED_KEYS[stage.key]] || 0) / 100);
                  const real = f?.counts[stage.key] || 0;
                  const pct = expected > 0 ? Math.min(100, (real / expected) * 100) : 0;
                  return (
                    <div key={stage.key} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden", marginBottom: 2 }}>
                        <div style={{ height: "100%", background: pct >= 100 ? C.green : pct > 0 ? C.orange : "transparent", width: `${pct}%` }} />
                      </div>
                      <div style={{ fontSize: ".4rem", color: C.dim }}>{stage.label.slice(0, 4)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ ...ths(), textAlign: "left" }}>Etape</th>
                        <th style={{ ...ths(), textAlign: "right", color: C.purple }}>Vision</th>
                        <th style={{ ...ths(), textAlign: "right", color: C.purple }}>Taux esp.</th>
                        <th style={{ ...ths(), textAlign: "right", color: C.green }}>Realise</th>
                        <th style={{ ...ths(), textAlign: "right", color: C.green }}>Taux reel</th>
                        <th style={{ ...ths(), textAlign: "right" }}>% V/R</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FUNNEL_STAGES.map(stage => {
                        const rateKey = RATE_KEYS[stage.key];
                        const expKey = EXPECTED_KEYS[stage.key];
                        const expectedRate = expKey ? ((c as any)[expKey] || 0) : 100;
                        const expectedCount = stage.key === "sent" ? c.target_sent :
                          Math.round(c.target_sent * expectedRate / 100);
                        const realCount = f?.counts[stage.key] || 0;
                        const realRate = rateKey ? (f?.rates[rateKey] || 0) : 0;
                        const vrPct = expectedCount > 0 ? (realCount / expectedCount) * 100 : 0;

                        return (
                          <tr key={stage.key} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                            <td style={{ padding: "4px 6px", fontSize: 11 }}>{stage.icon} {stage.label}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", color: C.purple }}>{expectedCount.toLocaleString("fr-FR")}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", color: C.purple }}>{expectedRate > 0 && stage.key !== "sent" ? expectedRate + "%" : "-"}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: realCount > 0 ? C.green : C.dim }}>{realCount.toLocaleString("fr-FR")}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", color: realRate > 0 ? C.green : C.dim }}>{realRate > 0 ? realRate.toFixed(1) + "%" : "-"}</td>
                            <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: vrPct >= 100 ? C.green : vrPct > 0 ? C.orange : C.dim }}>{vrPct.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: C.dim }}>
          Aucune campagne. Les agents creeront les campagnes automatiquement au lancement.
        </div>
      )}
    </div>
  );
}

function ths(): React.CSSProperties {
  return { padding: "4px 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", color: "#5A6A7A", fontWeight: 600 };
}
