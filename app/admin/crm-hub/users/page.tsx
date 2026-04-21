"use client";

import { useState, useEffect } from "react";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  tier: string | null;
  ai_credits: number | null;
  is_billed: boolean | null;
  is_admin: boolean | null;
  is_delegate_admin: boolean | null;
  is_demo: boolean | null;
  demo_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

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
  search: { padding: "8px 12px", background: "#071425", border: "1px solid rgba(255,255,255,.08)", color: "#E8E0D0", fontSize: ".72rem", fontFamily: "inherit", outline: "none", width: 300, marginBottom: 16 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: ".72rem" },
  th: { textAlign: "left" as const, padding: "8px 12px", color: "#5A6A7A", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(255,255,255,.06)" },
  td: { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#9BA8B8" },
  badge: (color: string) => ({ fontSize: ".55rem", padding: "2px 7px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block", marginRight: 4 } as React.CSSProperties),
  stat: { display: "inline-block", padding: "6px 14px", background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", marginRight: 8, marginBottom: 12 } as React.CSSProperties,
  statVal: { fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C" },
  statLabel: { fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase" as const, letterSpacing: ".08em" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: ".68rem", fontWeight: 600, color: "#E8E0D0", marginBottom: 12, letterSpacing: ".04em" },
  detailPanel: { background: "#0A1A2E", border: "1px solid rgba(201,168,76,.2)", padding: "20px", marginBottom: 20 } as React.CSSProperties,
  detailRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.03)", fontSize: ".72rem" } as React.CSSProperties,
  detailLabel: { color: "#5A6A7A", fontSize: ".6rem", textTransform: "uppercase" as const, letterSpacing: ".08em" },
  detailValue: { color: "#E8E0D0" },
  closeBtn: { padding: "4px 10px", background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.25)", color: "#C9A84C", fontSize: ".6rem", cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  clickableRow: (isActive: boolean) => ({
    cursor: "pointer",
    background: isActive ? "rgba(201,168,76,.06)" : "transparent",
    transition: "background .15s",
  }),
};

type ViewFilter = "all" | "churn" | "upgrade" | "billed";

/** Seuil en jours pour considérer un user churn-risk. */
const CHURN_DAYS_THRESHOLD = 30;

function isChurnRisk(p: Profile): boolean {
  if (p.is_billed || p.is_demo || p.is_admin || p.is_delegate_admin) return false;
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  if (ageDays < CHURN_DAYS_THRESHOLD) return false;
  if ((p.ai_credits ?? 0) > 0) return false;
  if (p.tier && p.tier !== "explorer") return false;
  return true;
}

function isUpgradeIntent(p: Profile): boolean {
  return (p.tier === "explorer" || !p.tier) && (p.ai_credits ?? 0) > 0 && !p.is_billed;
}

export default function CrmPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/profiles?limit=200");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProfiles(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const viewed = view === "churn"
    ? profiles.filter(isChurnRisk)
    : view === "upgrade"
      ? profiles.filter(isUpgradeIntent)
      : view === "billed"
        ? profiles.filter(p => p.is_billed)
        : profiles;

  const filtered = search
    ? viewed.filter(p =>
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : viewed;

  const totalUsers = profiles.length;
  const billedUsers = profiles.filter(p => p.is_billed).length;
  const demoUsers = profiles.filter(p => p.is_demo).length;
  const adminUsers = profiles.filter(p => p.is_admin || p.is_delegate_admin).length;
  const churnCount = profiles.filter(isChurnRisk).length;
  const upgradeIntents = profiles.filter(isUpgradeIntent);
  const upgradeCount = upgradeIntents.length;

  function exportCsv(rows: Profile[]) {
    const headers = ["email", "full_name", "tier", "ai_credits", "is_billed", "is_demo", "created_at"];
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => {
        const v = (r as Record<string, unknown>)[h];
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-users-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={S.page}>
      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement des profils...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Stats Row (cliquable : filtre view) */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => setView("all")}
                style={{ ...S.stat, cursor: "pointer", border: view === "all" ? "1px solid #C9A84C" : "1px solid rgba(255,255,255,.06)", fontFamily: "inherit" }}
              >
                <div style={S.statVal}>{totalUsers}</div>
                <div style={S.statLabel}>Total</div>
              </button>
              <button
                onClick={() => setView("billed")}
                style={{ ...S.stat, cursor: "pointer", border: view === "billed" ? "1px solid #10B981" : "1px solid rgba(255,255,255,.06)", fontFamily: "inherit" }}
              >
                <div style={{ ...S.statVal, color: "#10B981" }}>{billedUsers}</div>
                <div style={S.statLabel}>Factures</div>
              </button>
              <button
                onClick={() => setView("upgrade")}
                style={{ ...S.stat, cursor: "pointer", border: view === "upgrade" ? "1px solid #F59E0B" : "1px solid rgba(255,255,255,.06)", fontFamily: "inherit" }}
                title="Free tier avec credits consommés → candidat upgrade"
              >
                <div style={{ ...S.statVal, color: "#F59E0B" }}>{upgradeCount}</div>
                <div style={S.statLabel}>🎯 Upgrade intent</div>
              </button>
              <button
                onClick={() => setView("churn")}
                style={{ ...S.stat, cursor: "pointer", border: view === "churn" ? "1px solid #EF4444" : "1px solid rgba(255,255,255,.06)", fontFamily: "inherit" }}
                title={`Inscrits depuis ≥${CHURN_DAYS_THRESHOLD}j · free tier · 0 crédit · jamais payé`}
              >
                <div style={{ ...S.statVal, color: "#EF4444" }}>{churnCount}</div>
                <div style={S.statLabel}>⚠️ Churn risk</div>
              </button>
              <div style={S.stat}>
                <div style={{ ...S.statVal, color: "#8B5CF6" }}>{demoUsers}</div>
                <div style={S.statLabel}>Demo</div>
              </div>
              <div style={S.stat}>
                <div style={{ ...S.statVal, color: "#EF4444" }}>{adminUsers}</div>
                <div style={S.statLabel}>Admins</div>
              </div>
              {Object.entries(TIER_COLORS).map(([tier, color]) => (
                <div key={tier} style={S.stat}>
                  <div style={{ ...S.statVal, color }}>{profiles.filter(p => (p.tier || "explorer") === tier).length}</div>
                  <div style={S.statLabel}>{tier}</div>
                </div>
              ))}
              {filtered.length > 0 && view !== "all" && (
                <button
                  onClick={() => exportCsv(filtered)}
                  style={{ marginLeft: "auto", padding: "8px 14px", background: "rgba(201,168,76,.08)", border: "1px solid #C9A84C", color: "#C9A84C", fontSize: ".7rem", cursor: "pointer", fontFamily: "inherit" }}
                  title={`Export ${filtered.length} users en CSV pour campagne`}
                >
                  📥 Export CSV ({filtered.length})
                </button>
              )}
            </div>

            {/* Detail Panel */}
            {selected && (
              <div style={S.detailPanel}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: ".8rem", fontWeight: 700, color: "#E8E0D0" }}>{selected.email}</span>
                  <button onClick={() => setSelected(null)} style={S.closeBtn}>Fermer</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Nom</span>
                    <span style={S.detailValue}>{selected.full_name || "-"}</span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Role</span>
                    <span style={S.detailValue}>{selected.role || "-"}</span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Tier</span>
                    <span style={S.badge(TIER_COLORS[selected.tier || "explorer"] || "#5A6A7A")}>{selected.tier || "explorer"}</span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Credits IA</span>
                    <span style={S.detailValue}>{selected.ai_credits ?? 0}</span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Facture</span>
                    <span style={{ color: selected.is_billed ? "#10B981" : "#5A6A7A" }}>
                      {selected.is_billed ? "Oui" : "Non"}
                    </span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Admin</span>
                    <span style={{ color: selected.is_admin ? "#EF4444" : "#5A6A7A" }}>
                      {selected.is_admin ? "Oui" : "Non"}
                      {selected.is_delegate_admin && <span style={{ color: "#F59E0B", marginLeft: 6 }}>(delegue)</span>}
                    </span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Demo</span>
                    <span style={{ color: selected.is_demo ? "#8B5CF6" : "#5A6A7A" }}>
                      {selected.is_demo ? "Oui" : "Non"}
                    </span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Demo expire</span>
                    <span style={S.detailValue}>
                      {selected.demo_expires_at
                        ? new Date(selected.demo_expires_at).toLocaleDateString("fr-FR")
                        : "-"}
                    </span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Stripe Customer</span>
                    <span style={{ ...S.detailValue, fontSize: ".58rem", fontFamily: "monospace" }}>
                      {selected.stripe_customer_id ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${selected.stripe_customer_id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#60A5FA", textDecoration: "none" }}
                          title="Ouvrir sur Stripe Dashboard"
                        >
                          {selected.stripe_customer_id} ↗
                        </a>
                      ) : "-"}
                    </span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Stripe Sub</span>
                    <span style={{ ...S.detailValue, fontSize: ".58rem", fontFamily: "monospace" }}>
                      {selected.stripe_subscription_id ? (
                        <a
                          href={`https://dashboard.stripe.com/subscriptions/${selected.stripe_subscription_id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#60A5FA", textDecoration: "none" }}
                          title="Ouvrir sur Stripe Dashboard"
                        >
                          {selected.stripe_subscription_id} ↗
                        </a>
                      ) : "-"}
                    </span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>Inscription</span>
                    <span style={S.detailValue}>
                      {new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {" · "}
                      <span style={{ color: "#5A6A7A" }}>
                        ({Math.floor((Date.now() - new Date(selected.created_at).getTime()) / 86_400_000)}j)
                      </span>
                    </span>
                  </div>
                </div>

                {/* Quick actions : Stripe + Resend + Flags */}
                <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)", flexWrap: "wrap" }}>
                  {selected.stripe_customer_id && (
                    <a
                      href={`https://dashboard.stripe.com/customers/${selected.stripe_customer_id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: "6px 12px", background: "rgba(96,165,250,.1)", border: "1px solid rgba(96,165,250,.3)", color: "#60A5FA", fontSize: ".68rem", textDecoration: "none", borderRadius: 3 }}
                    >
                      🔗 Stripe customer
                    </a>
                  )}
                  <a
                    href={`https://resend.com/emails?q=${encodeURIComponent(selected.email)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "6px 12px", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "#F59E0B", fontSize: ".68rem", textDecoration: "none", borderRadius: 3 }}
                  >
                    📧 Resend emails
                  </a>
                  <a
                    href={`mailto:${selected.email}`}
                    style={{ padding: "6px 12px", background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", color: "#C9A84C", fontSize: ".68rem", textDecoration: "none", borderRadius: 3 }}
                  >
                    ✉️ Email direct
                  </a>
                  {isChurnRisk(selected) && (
                    <span style={{ padding: "6px 12px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#EF4444", fontSize: ".68rem", borderRadius: 3 }}>
                      ⚠️ Churn risk
                    </span>
                  )}
                  {isUpgradeIntent(selected) && (
                    <span style={{ padding: "6px 12px", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "#F59E0B", fontSize: ".68rem", borderRadius: 3 }}>
                      🎯 Upgrade intent
                    </span>
                  )}
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Rechercher par email ou nom..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={S.search}
            />

            {/* User Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Nom</th>
                    <th style={S.th}>Tier</th>
                    <th style={S.th}>Statut</th>
                    <th style={S.th}>Credits IA</th>
                    <th style={S.th}>Demo expire</th>
                    <th style={S.th}>Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      style={S.clickableRow(selected?.id === p.id)}
                    >
                      <td style={{ ...S.td, color: "#E8E0D0", cursor: "pointer" }}>{p.email}</td>
                      <td style={S.td}>{p.full_name || "-"}</td>
                      <td style={S.td}>
                        <span style={S.badge(TIER_COLORS[p.tier || "explorer"] || "#5A6A7A")}>{p.tier || "explorer"}</span>
                      </td>
                      <td style={S.td}>
                        {p.is_billed && <span style={S.badge("#10B981")}>facture</span>}
                        {p.is_admin && <span style={S.badge("#EF4444")}>admin</span>}
                        {p.is_delegate_admin && <span style={S.badge("#F59E0B")}>delegue</span>}
                        {p.is_demo && <span style={S.badge("#8B5CF6")}>demo</span>}
                        {!p.is_billed && !p.is_admin && !p.is_delegate_admin && !p.is_demo && (
                          <span style={{ color: "#5A6A7A", fontSize: ".56rem" }}>-</span>
                        )}
                      </td>
                      <td style={S.td}>{p.ai_credits ?? 0}</td>
                      <td style={{ ...S.td, fontSize: ".62rem" }}>
                        {p.demo_expires_at
                          ? new Date(p.demo_expires_at).toLocaleDateString("fr-FR")
                          : "-"}
                      </td>
                      <td style={{ ...S.td, fontSize: ".62rem" }}>
                        {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#5A6A7A" }}>
                        {search ? "Aucun profil correspondant" : "Aucun profil"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Upgrade Intent */}
            {upgradeIntents.length > 0 && (
              <div style={{ ...S.section, marginTop: 28 }}>
                <div style={S.sectionTitle}>
                  Intention d&apos;upgrade ({upgradeIntents.length})
                  <span style={{ fontWeight: 400, color: "#5A6A7A", fontSize: ".58rem", marginLeft: 8 }}>
                    Explorers avec credits IA &gt; 0
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {upgradeIntents.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelected(p)}
                      style={{
                        padding: "8px 14px",
                        background: "#071425",
                        border: "1px solid rgba(201,168,76,.15)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: ".68rem", color: "#E8E0D0" }}>{p.email}</div>
                      <div style={{ fontSize: ".56rem", color: "#C9A84C" }}>{p.ai_credits} credits</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
