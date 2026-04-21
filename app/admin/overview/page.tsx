"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type RecentProfile = {
  id: string;
  email: string;
  full_name: string | null;
  tier: string | null;
  created_at: string;
};

type TierStat = { tier: string; count: number; pct: number };

const TIER_COLORS: Record<string, string> = {
  explorer: "#5A6A7A",
  data: "#3B82F6",
  strategy: "#8B5CF6",
  premium: "#C9A84C",
};

const QUICK_LINKS = [
  { href: "/admin/crm-hub", label: "CRM Hub", icon: "👥" },
  { href: "/admin/cms", label: "CMS", icon: "✏️" },
  { href: "/admin/plans", label: "Plans", icon: "💳" },
  { href: "/admin/simulator", label: "Simulateur", icon: "🧮" },
  { href: "/admin/data", label: "Data", icon: "🗄️" },
];

const S = {
  page: { display: "flex", flexDirection: "column" as const, height: "100%", color: "#E8E0D0", fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" },
  header: { background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
  title: { fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#C9A84C", fontWeight: 600 },
  sub: { fontSize: ".6rem", color: "#5A6A7A" },
  body: { flex: 1, overflow: "auto", padding: "20px 24px" } as React.CSSProperties,
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: ".68rem", fontWeight: 600, color: "#E8E0D0", marginBottom: 12, letterSpacing: ".04em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 },
  card: { background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", padding: "16px 18px" } as React.CSSProperties,
  cardVal: (color: string) => ({ fontSize: "1.4rem", fontWeight: 700, color } as React.CSSProperties),
  cardLabel: { fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase" as const, letterSpacing: ".1em", marginTop: 4 },
  progressContainer: { marginBottom: 14 } as React.CSSProperties,
  progressLabel: { display: "flex", justifyContent: "space-between", fontSize: ".64rem", marginBottom: 4 } as React.CSSProperties,
  progressTrack: { height: 8, background: "#071425", border: "1px solid rgba(255,255,255,.04)", position: "relative" as const, overflow: "hidden" } as React.CSSProperties,
  progressFill: (pct: number, color: string) => ({
    height: "100%",
    width: `${pct}%`,
    background: color,
    transition: "width .4s ease",
  } as React.CSSProperties),
  tierRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.03)" } as React.CSSProperties,
  tierDot: (color: string) => ({ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 } as React.CSSProperties),
  tierBar: (pct: number, color: string) => ({
    height: 18,
    background: `${color}25`,
    border: `1px solid ${color}40`,
    width: `${Math.max(pct, 3)}%`,
    transition: "width .3s",
  } as React.CSSProperties),
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: ".68rem" },
  th: { textAlign: "left" as const, padding: "8px 10px", color: "#5A6A7A", fontSize: ".56rem", letterSpacing: ".1em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(255,255,255,.06)" },
  td: { padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#9BA8B8" },
  badge: (color: string) => ({ fontSize: ".55rem", padding: "2px 7px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block" } as React.CSSProperties),
  linkCard: { display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "14px 12px", background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", textDecoration: "none", cursor: "pointer", transition: "border-color .15s" } as React.CSSProperties,
  muted: { color: "#5A6A7A", fontSize: ".72rem" },
};

export default function OverviewPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCountries, setTotalCountries] = useState(0);
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [totalBPs, setTotalBPs] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [newLast7d, setNewLast7d] = useState(0);
  const [withCredits, setWithCredits] = useState(0);

  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>([]);
  const [tierStats, setTierStats] = useState<TierStat[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Fetch stats and recent profiles in parallel
        const [statsRes, profilesRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/profiles?limit=10"),
        ]);

        if (!statsRes.ok) throw new Error(await statsRes.text());
        if (!profilesRes.ok) throw new Error(await profilesRes.text());

        const stats = await statsRes.json();
        const profiles: RecentProfile[] = await profilesRes.json();

        setTotalUsers(stats.total);
        setTotalCountries(stats.countries);
        setTotalOpportunities(stats.opportunities);
        setTotalBPs(stats.businessPlans);
        setTotalReports(stats.reports);
        setNewLast7d(stats.newLast7d ?? 0);
        setWithCredits(stats.withCredits ?? 0);
        setRecentProfiles(profiles);

        // Build tier stats from tiers object
        const total = stats.total || 1;
        const tierEntries = Object.entries(stats.tiers as Record<string, number>)
          .map(([tier, count]) => ({ tier, count, pct: Math.round((count / total) * 100) }))
          .sort((a, b) => b.count - a.count);
        setTierStats(tierEntries);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load overview");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxTier = Math.max(...tierStats.map(t => t.count), 1);
  const countryTotal = totalCountries || 115;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>Overview</span>
        <span style={S.sub}>Vue d&apos;ensemble business - Feel The Gap</span>
      </div>

      <div style={S.body}>
        {loading && <div style={S.muted}>Chargement...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* KPI Cards */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Indicateurs cles</div>
              <div style={S.grid}>
                <div style={S.card}>
                  <div style={S.cardVal("#C9A84C")}>{totalUsers}</div>
                  <div style={S.cardLabel}>Utilisateurs FTG</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#10B981")}>{newLast7d}</div>
                  <div style={S.cardLabel}>Nouveaux 7j</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#60A5FA")}>{withCredits}</div>
                  <div style={S.cardLabel}>Avec credits IA</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#3B82F6")}>{totalCountries}</div>
                  <div style={S.cardLabel}>Pays</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#10B981")}>{totalOpportunities}</div>
                  <div style={S.cardLabel}>Opportunites</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#8B5CF6")}>{totalBPs}</div>
                  <div style={S.cardLabel}>Business plans</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#F59E0B")}>{totalReports}</div>
                  <div style={S.cardLabel}>Rapports</div>
                </div>
              </div>
            </div>

            {/* AI Coverage */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Couverture IA</div>
              <div style={S.progressContainer}>
                <div style={S.progressLabel}>
                  <span style={{ color: "#E8E0D0" }}>Pays avec rapports</span>
                  <span style={{ color: "#C9A84C" }}>{totalReports > 0 ? "oui" : "0"}/{countryTotal}</span>
                </div>
                <div style={S.progressTrack}>
                  <div style={S.progressFill(totalReports > 0 ? Math.min((totalReports / countryTotal) * 100, 100) : 0, "#F59E0B")} />
                </div>
              </div>
              <div style={S.progressContainer}>
                <div style={S.progressLabel}>
                  <span style={{ color: "#E8E0D0" }}>Pays avec business plans</span>
                  <span style={{ color: "#C9A84C" }}>{totalBPs > 0 ? "oui" : "0"}/{countryTotal}</span>
                </div>
                <div style={S.progressTrack}>
                  <div style={S.progressFill(totalBPs > 0 ? Math.min((totalBPs / countryTotal) * 100, 100) : 0, "#8B5CF6")} />
                </div>
              </div>
              <div style={S.progressContainer}>
                <div style={S.progressLabel}>
                  <span style={{ color: "#E8E0D0" }}>Pays avec opportunites</span>
                  <span style={{ color: "#C9A84C" }}>{totalOpportunities > 0 ? "oui" : "0"}/{countryTotal}</span>
                </div>
                <div style={S.progressTrack}>
                  <div style={S.progressFill(totalOpportunities > 0 ? Math.min((totalOpportunities / countryTotal) * 100, 100) : 0, "#10B981")} />
                </div>
              </div>
            </div>

            {/* Two-column: Tier Breakdown + Recent Activity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Tier Breakdown */}
              <div style={S.section}>
                <div style={S.sectionTitle}>Repartition par tier</div>
                {tierStats.map(t => (
                  <div key={t.tier} style={S.tierRow}>
                    <div style={S.tierDot(TIER_COLORS[t.tier] || "#5A6A7A")} />
                    <span style={{ fontSize: ".68rem", color: "#E8E0D0", width: 70 }}>{t.tier}</span>
                    <div style={{ flex: 1 }}>
                      <div style={S.tierBar((t.count / maxTier) * 100, TIER_COLORS[t.tier] || "#5A6A7A")} />
                    </div>
                    <span style={{ fontSize: ".68rem", color: "#C9A84C", width: 30, textAlign: "right" }}>{t.count}</span>
                    <span style={{ fontSize: ".56rem", color: "#5A6A7A", width: 35, textAlign: "right" }}>{t.pct}%</span>
                  </div>
                ))}
                {tierStats.length === 0 && <div style={S.muted}>Aucune donnee</div>}
              </div>

              {/* Recent Activity */}
              <div style={S.section}>
                <div style={S.sectionTitle}>Activite recente</div>
                {recentProfiles.length > 0 ? (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Utilisateur</th>
                        <th style={S.th}>Tier</th>
                        <th style={S.th}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProfiles.map(p => (
                        <tr key={p.id}>
                          <td style={S.td}>
                            <div style={{ fontSize: ".68rem", color: "#E8E0D0" }}>{p.full_name || "-"}</div>
                            <div style={{ fontSize: ".56rem", color: "#5A6A7A" }}>{p.email}</div>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(TIER_COLORS[p.tier || "explorer"] || "#5A6A7A")}>{p.tier || "explorer"}</span>
                          </td>
                          <td style={{ ...S.td, fontSize: ".6rem" }}>
                            {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={S.muted}>Aucun profil</div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Acces rapide</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {QUICK_LINKS.map(link => (
                  <Link key={link.href} href={link.href} style={S.linkCard}>
                    <span style={{ fontSize: 22 }}>{link.icon}</span>
                    <span style={{ fontSize: ".68rem", color: "#E8E0D0", fontWeight: 500 }}>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
