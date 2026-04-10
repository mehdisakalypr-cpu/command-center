"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  tier: string | null;
  ai_credits: number | null;
  is_billed: boolean | null;
  stripe_customer_id: string | null;
  created_at: string;
};

const TIERS = ["explorer", "data", "strategy", "premium"];
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
  body: { flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", gap: 20 } as React.CSSProperties,
  left: { flex: 1, minWidth: 0 } as React.CSSProperties,
  right: { width: 340, flexShrink: 0 } as React.CSSProperties,
  search: { padding: "8px 12px", background: "#071425", border: "1px solid rgba(255,255,255,.08)", color: "#E8E0D0", fontSize: ".72rem", fontFamily: "inherit", outline: "none", width: "100%", marginBottom: 12 } as React.CSSProperties,
  row: (active: boolean) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
    background: active ? "rgba(201,168,76,.08)" : "transparent",
    border: active ? "1px solid rgba(201,168,76,.2)" : "1px solid transparent",
    cursor: "pointer", marginBottom: 2,
  } as React.CSSProperties),
  badge: (color: string) => ({ fontSize: ".58rem", padding: "2px 8px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block" } as React.CSSProperties),
  card: { background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", padding: "20px" } as React.CSSProperties,
  cardRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.03)", fontSize: ".72rem" } as React.CSSProperties,
  label: { color: "#5A6A7A", fontSize: ".6rem", textTransform: "uppercase" as const, letterSpacing: ".08em" },
  value: { color: "#E8E0D0" },
  btn: (color: string) => ({
    padding: "6px 12px", background: `${color}15`, border: `1px solid ${color}40`, color,
    fontSize: ".62rem", letterSpacing: ".06em", cursor: "pointer", fontFamily: "inherit",
  } as React.CSSProperties),
  goldBtn: { padding: "6px 14px", background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.35)", color: "#C9A84C", fontSize: ".62rem", letterSpacing: ".08em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  toast: { position: "fixed" as const, top: 16, right: 24, zIndex: 100, background: "#071425", border: "1px solid rgba(201,168,76,.4)", padding: "10px 18px", fontSize: ".72rem", color: "#C9A84C", boxShadow: "0 4px 24px rgba(0,0,0,.4)" },
};

export default function PlansPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  async function fetchProfiles() {
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, tier, ai_credits, is_billed, stripe_customer_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) throw err;
      setProfiles(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProfiles(); }, []);

  async function changeTier(profileId: string, newTier: string) {
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ tier: newTier })
      .eq("id", profileId);
    if (err) { showToast("Erreur: " + err.message); }
    else {
      showToast(`Tier mis a jour: ${newTier}`);
      await fetchProfiles();
      if (selected && selected.id === profileId) {
        setSelected(prev => prev ? { ...prev, tier: newTier } : null);
      }
    }
    setSaving(false);
  }

  async function addCredits(profileId: string) {
    const amount = parseInt(creditsToAdd);
    if (isNaN(amount) || amount <= 0) { showToast("Montant invalide"); return; }
    setSaving(true);
    const current = selected?.ai_credits ?? 0;
    const { error: err } = await supabase
      .from("profiles")
      .update({ ai_credits: current + amount })
      .eq("id", profileId);
    if (err) { showToast("Erreur: " + err.message); }
    else {
      showToast(`+${amount} credits IA ajoutes`);
      await fetchProfiles();
      if (selected && selected.id === profileId) {
        setSelected(prev => prev ? { ...prev, ai_credits: current + amount } : null);
      }
    }
    setSaving(false);
  }

  const filtered = search
    ? profiles.filter(p => p.email?.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.header}>
        <span style={S.title}>Plans</span>
        <span style={S.sub}>Gestion des tiers & billing</span>
      </div>

      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Left: user list */}
            <div style={S.left}>
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={S.search}
              />
              <div style={{ maxHeight: "calc(100vh - 180px)", overflow: "auto" }}>
                {filtered.map(p => (
                  <div key={p.id} style={S.row(selected?.id === p.id)} onClick={() => setSelected(p)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: ".72rem", color: "#E8E0D0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>
                      <div style={{ fontSize: ".58rem", color: "#5A6A7A" }}>{p.full_name || "-"}</div>
                    </div>
                    <span style={S.badge(TIER_COLORS[p.tier || "explorer"] || "#5A6A7A")}>{p.tier || "explorer"}</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ color: "#5A6A7A", fontSize: ".72rem", padding: 12 }}>Aucun profil</div>
                )}
              </div>
            </div>

            {/* Right: detail card */}
            <div style={S.right}>
              {selected ? (
                <div style={S.card}>
                  <div style={{ fontSize: ".8rem", fontWeight: 700, color: "#E8E0D0", marginBottom: 16 }}>
                    {selected.email}
                  </div>

                  <div style={S.cardRow}>
                    <span style={S.label}>Email</span>
                    <span style={S.value}>{selected.email}</span>
                  </div>
                  <div style={S.cardRow}>
                    <span style={S.label}>Tier</span>
                    <span style={S.badge(TIER_COLORS[selected.tier || "explorer"] || "#5A6A7A")}>{selected.tier || "explorer"}</span>
                  </div>
                  <div style={S.cardRow}>
                    <span style={S.label}>Role</span>
                    <span style={S.value}>{selected.role || "-"}</span>
                  </div>
                  <div style={S.cardRow}>
                    <span style={S.label}>AI Credits</span>
                    <span style={S.value}>{selected.ai_credits ?? 0}</span>
                  </div>
                  <div style={S.cardRow}>
                    <span style={S.label}>Billed</span>
                    <span style={{ color: selected.is_billed ? "#10B981" : "#5A6A7A" }}>
                      {selected.is_billed ? "Oui" : "Non"}
                    </span>
                  </div>
                  <div style={{ ...S.cardRow, borderBottom: "none" }}>
                    <span style={S.label}>Stripe ID</span>
                    <span style={{ ...S.value, fontSize: ".6rem" }}>{selected.stripe_customer_id || "-"}</span>
                  </div>

                  {/* Change tier */}
                  <div style={{ marginTop: 20, marginBottom: 16 }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>Changer le tier</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {TIERS.map(t => (
                        <button
                          key={t}
                          onClick={() => changeTier(selected.id, t)}
                          disabled={saving || selected.tier === t}
                          style={{
                            ...S.btn(TIER_COLORS[t]),
                            opacity: selected.tier === t ? 0.4 : 1,
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add credits */}
                  <div>
                    <div style={{ ...S.label, marginBottom: 8 }}>Ajouter des credits IA</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        value={creditsToAdd}
                        onChange={e => setCreditsToAdd(e.target.value)}
                        style={{ ...S.search, width: 80, marginBottom: 0 }}
                        min="1"
                      />
                      <button
                        onClick={() => addCredits(selected.id)}
                        disabled={saving}
                        style={S.goldBtn}
                      >
                        {saving ? "..." : "Ajouter"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                  <span style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Selectionnez un utilisateur</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
