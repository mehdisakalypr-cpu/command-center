"use client";

import { useState, useEffect } from "react";

type TierStat = { tier: string; count: number };
type CountryStat = { name: string; opportunities: number };

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
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: ".68rem", fontWeight: 600, color: "#E8E0D0", marginBottom: 12, letterSpacing: ".04em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  card: { background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", padding: "16px 18px" } as React.CSSProperties,
  cardVal: (color: string) => ({ fontSize: "1.4rem", fontWeight: 700, color } as React.CSSProperties),
  cardLabel: { fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase" as const, letterSpacing: ".1em", marginTop: 4 },
  bar: (pct: number, color: string) => ({
    height: 24,
    background: `${color}30`,
    border: `1px solid ${color}50`,
    width: `${Math.max(pct, 2)}%`,
    display: "flex",
    alignItems: "center",
    paddingLeft: 8,
    marginBottom: 4,
    transition: "width .3s",
  } as React.CSSProperties),
  barLabel: { fontSize: ".6rem", color: "#E8E0D0", whiteSpace: "nowrap" as const },
  countryRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.03)" } as React.CSSProperties,
  muted: { color: "#5A6A7A", fontSize: ".72rem" },
};

export default function AnalyticsPage() {
  const [tierStats, setTierStats] = useState<TierStat[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsers7d, setNewUsers7d] = useState(0);
  const [usersWithCredits, setUsersWithCredits] = useState(0);
  const [topCountries, setTopCountries] = useState<CountryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Fetch stats from API
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error(await res.text());
        const stats = await res.json();

        setTotalUsers(stats.total);
        setNewUsers7d(stats.newLast7d);
        setUsersWithCredits(stats.withCredits);

        // Build tier stats from tiers object
        const tierEntries = Object.entries(stats.tiers as Record<string, number>)
          .map(([tier, count]) => ({ tier, count }))
          .sort((a, b) => b.count - a.count);
        setTierStats(tierEntries);

        // Fetch profiles to compute top countries (profiles have no country, but we can get from the stats)
        // The stats endpoint doesn't provide per-country breakdown, so we fetch profiles for country data
        // For now, top countries are not available via the stats endpoint — skip gracefully
        try {
          const profilesRes = await fetch("/api/admin/profiles?limit=1000");
          if (profilesRes.ok) {
            const profiles = await profilesRes.json();
            // Compute country stats from profiles if country field exists
            const countryMap: Record<string, number> = {};
            for (const p of profiles) {
              if (p.country) {
                countryMap[p.country] = (countryMap[p.country] || 0) + 1;
              }
            }
            const sorted = Object.entries(countryMap)
              .map(([name, opportunities]) => ({ name, opportunities }))
              .sort((a, b) => b.opportunities - a.opportunities)
              .slice(0, 10);
            if (sorted.length > 0) setTopCountries(sorted);
          }
        } catch {
          // country data not available, ignore
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxTier = Math.max(...tierStats.map(t => t.count), 1);
  const maxCountry = Math.max(...topCountries.map(c => c.opportunities), 1);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>Analytics</span>
        <span style={S.sub}>Vue d&apos;ensemble Feel The Gap</span>
      </div>

      <div style={S.body}>
        {loading && <div style={S.muted}>Chargement des analytics...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* KPI Cards */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Indicateurs cles</div>
              <div style={S.grid}>
                <div style={S.card}>
                  <div style={S.cardVal("#C9A84C")}>{totalUsers}</div>
                  <div style={S.cardLabel}>Total utilisateurs</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#10B981")}>{newUsers7d}</div>
                  <div style={S.cardLabel}>Nouveaux (7j)</div>
                </div>
                <div style={S.card}>
                  <div style={S.cardVal("#3B82F6")}>{usersWithCredits}</div>
                  <div style={S.cardLabel}>Avec credits IA</div>
                </div>
              </div>
            </div>

            {/* Tier Distribution */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Distribution par tier</div>
              {tierStats.map(t => (
                <div key={t.tier} style={{ marginBottom: 6 }}>
                  <div style={S.bar((t.count / maxTier) * 100, TIER_COLORS[t.tier] || "#5A6A7A")}>
                    <span style={S.barLabel}>
                      {t.tier} - {t.count} ({totalUsers > 0 ? Math.round((t.count / totalUsers) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
              {tierStats.length === 0 && (
                <div style={S.muted}>Aucune donnee</div>
              )}
            </div>

            {/* Top Countries */}
            {topCountries.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Top pays (par opportunites)</div>
                {topCountries.map((c, i) => (
                  <div key={c.name} style={S.countryRow}>
                    <span style={{ fontSize: ".6rem", color: "#5A6A7A", width: 20, textAlign: "right" as const }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: ".72rem", color: "#E8E0D0" }}>{c.name}</span>
                        <span style={{ fontSize: ".58rem", color: "#C9A84C" }}>{c.opportunities}</span>
                      </div>
                      <div style={{
                        height: 3,
                        background: `rgba(201,168,76,${0.15 + (c.opportunities / maxCountry) * 0.5})`,
                        width: `${(c.opportunities / maxCountry) * 100}%`,
                        marginTop: 3,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
