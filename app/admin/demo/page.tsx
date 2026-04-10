"use client";

import { useState, useEffect } from "react";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  tier: string | null;
  ai_credits: number | null;
};

const DEMO_ACCOUNTS = [
  { email: "demo.entrepreneur@feelthegap.app", payingTier: "strategy" },
  { email: "demo.influenceur@feelthegap.app", payingTier: "strategy" },
  { email: "demo.financeur@feelthegap.app", payingTier: "premium" },
  { email: "demo.investisseur@feelthegap.app", payingTier: "premium" },
];

const DEMO_PASSWORD = "DemoFTG2026!";

const TIER_COLORS: Record<string, string> = {
  explorer: "#5A6A7A",
  data: "#3B82F6",
  strategy: "#8B5CF6",
  premium: "#C9A84C",
};

const S = {
  page: { display: "flex", flexDirection: "column" as const, height: "100%", color: "#E8E0D0", fontFamily: "Inter, sans-serif" },
  header: { background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
  title: { fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#C9A84C", fontWeight: 600 },
  sub: { fontSize: ".6rem", color: "#5A6A7A" },
  body: { flex: 1, overflow: "auto", padding: "20px 24px" } as React.CSSProperties,
  card: { background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", padding: "18px 20px", marginBottom: 12 } as React.CSSProperties,
  badge: (color: string) => ({ fontSize: ".58rem", padding: "2px 8px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block" } as React.CSSProperties),
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: ".72rem" } as React.CSSProperties,
  label: { color: "#5A6A7A", fontSize: ".6rem", textTransform: "uppercase" as const, letterSpacing: ".08em" },
  btn: (color: string, active: boolean) => ({
    padding: "6px 14px", background: active ? `${color}30` : `${color}10`,
    border: `1px solid ${active ? color : `${color}40`}`, color,
    fontSize: ".62rem", letterSpacing: ".06em", cursor: "pointer", fontFamily: "inherit",
    fontWeight: active ? 700 : 400,
  } as React.CSSProperties),
  passBox: {
    background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)",
    padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
  } as React.CSSProperties,
  toast: { position: "fixed" as const, top: 16, right: 24, zIndex: 100, background: "#071425", border: "1px solid rgba(201,168,76,.4)", padding: "10px 18px", fontSize: ".72rem", color: "#C9A84C", boxShadow: "0 4px 24px rgba(0,0,0,.4)" },
};

export default function DemoPage() {
  const [profiles, setProfiles] = useState<(Profile & { payingTier: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  async function fetchDemoProfiles() {
    try {
      // Fetch demo profiles by searching for "demo." prefix
      const res = await fetch("/api/admin/profiles?search=demo.&limit=20");
      if (!res.ok) throw new Error(await res.text());
      const data: Profile[] = await res.json();

      const result = DEMO_ACCOUNTS.map(acct => {
        const profile = data.find(p => p.email === acct.email);
        return profile
          ? { ...profile, payingTier: acct.payingTier }
          : { id: "", email: acct.email, full_name: null, role: null, tier: null, ai_credits: null, payingTier: acct.payingTier };
      });
      setProfiles(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load demo profiles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDemoProfiles(); }, []);

  async function toggleTier(profileId: string, currentTier: string | null, payingTier: string) {
    if (!profileId) { showToast("Profil non trouve en base"); return; }
    const isExplorer = !currentTier || currentTier === "explorer";
    const newTier = isExplorer ? payingTier : "explorer";
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, tier: newTier }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast("Erreur: " + (err.error || "Unknown error"));
      } else {
        showToast(`Tier mis a jour: ${newTier}`);
        await fetchDemoProfiles();
      }
    } catch (e: unknown) {
      showToast("Erreur: " + (e instanceof Error ? e.message : "Unknown error"));
    }
    setSaving(false);
  }

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.header}>
        <span style={S.title}>Demo</span>
        <span style={S.sub}>Comptes de demonstration Feel The Gap</span>
      </div>

      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Password box */}
            <div style={S.passBox}>
              <span style={{ fontSize: ".6rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em" }}>
                Mot de passe commun
              </span>
              <span style={{ fontSize: ".82rem", color: "#C9A84C", fontWeight: 600, fontFamily: "monospace" }}>
                {DEMO_PASSWORD}
              </span>
            </div>

            {/* Demo account cards */}
            {profiles.map(p => {
              const tierColor = TIER_COLORS[p.tier || "explorer"] || "#5A6A7A";
              const isExplorer = !p.tier || p.tier === "explorer";
              return (
                <div key={p.email} style={S.card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: ".82rem", fontWeight: 600, color: "#E8E0D0" }}>{p.email}</span>
                    <span style={S.badge(tierColor)}>{p.tier || "explorer"}</span>
                    {!p.id && <span style={S.badge("#EF4444")}>non trouve</span>}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div>
                      <div style={S.label}>Full Name</div>
                      <div style={{ fontSize: ".72rem", color: "#9BA8B8" }}>{p.full_name || "-"}</div>
                    </div>
                    <div>
                      <div style={S.label}>Role</div>
                      <div style={{ fontSize: ".72rem", color: "#9BA8B8" }}>{p.role || "-"}</div>
                    </div>
                    <div>
                      <div style={S.label}>Tier</div>
                      <div style={{ fontSize: ".72rem", color: tierColor }}>{p.tier || "explorer"}</div>
                    </div>
                    <div>
                      <div style={S.label}>AI Credits</div>
                      <div style={{ fontSize: ".72rem", color: "#9BA8B8" }}>{p.ai_credits ?? 0}</div>
                    </div>
                  </div>

                  {p.id && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: ".6rem", color: "#5A6A7A", marginRight: 4 }}>Toggle:</span>
                      <button
                        onClick={() => toggleTier(p.id, p.tier, p.payingTier)}
                        disabled={saving}
                        style={S.btn(isExplorer ? TIER_COLORS[p.payingTier] : "#5A6A7A", true)}
                      >
                        {isExplorer ? `Activer ${p.payingTier}` : "Revenir explorer"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
