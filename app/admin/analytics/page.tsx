"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
        // Fetch all profiles
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("id, tier, ai_credits, created_at");
        if (pErr) throw pErr;

        const all = profiles ?? [];
        setTotalUsers(all.length);

        // New users in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        setNewUsers7d(all.filter(p => new Date(p.created_at) > sevenDaysAgo).length);

        // Users with AI credits
        setUsersWithCredits(all.filter(p => (p.ai_credits ?? 0) > 0).length);

        // Group by tier
        const tierMap: Record<string, number> = {};
        all.forEach(p => {
          const t = p.tier || "explorer";
          tierMap[t] = (tierMap[t] || 0) + 1;
        });
        setTierStats(Object.entries(tierMap).map(([tier, count]) => ({ tier, count })).sort((a, b) => b.count - a.count));

        // Top countries by opportunity count
        try {
          const { data: countries } = await supabase
            .from("countries")
            .select("id, name");
          const { data: opps } = await supabase
            .from("opportunities")
            .select("country_id");

          if (countries && opps) {
            const countMap: Record<string, number> = {};
            opps.forEach(o => { countMap[o.country_id] = (countMap[o.country_id] || 0) + 1; });
            const sorted = countries
              .map(c => ({ name: c.name, opportunities: countMap[c.id] || 0 }))
              .filter(c => c.opportunities > 0)
              .sort((a, b) => b.opportunities - a.opportunities)
              .slice(0, 10);
            setTopCountries(sorted);
          }
        } catch {
          // countries/opportunities tables may not exist
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
        <span style={S.sub}>Vue d'ensemble Feel The Gap</span>
      </div>

      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement des analytics...</div>}
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
                <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Aucune donnee</div>
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
