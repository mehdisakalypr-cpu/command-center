"use client";

import { useState, useEffect } from "react";

type TableCount = { table: string; count: number; color: string; icon: string };

const TABLES: { name: string; color: string; icon: string; statsKey?: string }[] = [
  { name: "countries", color: "#3B82F6", icon: "🌍", statsKey: "countries" },
  { name: "products", color: "#8B5CF6", icon: "📦" },
  { name: "opportunities", color: "#C9A84C", icon: "💡", statsKey: "opportunities" },
  { name: "business_plans", color: "#10B981", icon: "📋", statsKey: "businessPlans" },
  { name: "trade_flows", color: "#F59E0B", icon: "🔄" },
  { name: "reports", color: "#EF4444", icon: "📊", statsKey: "reports" },
];

const S = {
  page: { display: "flex", flexDirection: "column" as const, height: "100%", color: "#E8E0D0", fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" },
  header: { background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
  title: { fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#C9A84C", fontWeight: 600 },
  sub: { fontSize: ".6rem", color: "#5A6A7A" },
  body: { flex: 1, overflow: "auto", padding: "20px 24px" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 },
  card: (color: string) => ({
    background: "#0A1A2E", border: `1px solid ${color}30`, padding: "20px",
    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6,
  } as React.CSSProperties),
  cardIcon: { fontSize: "1.4rem" },
  cardVal: (color: string) => ({ fontSize: "1.6rem", fontWeight: 700, color } as React.CSSProperties),
  cardLabel: { fontSize: ".6rem", color: "#5A6A7A", textTransform: "uppercase" as const, letterSpacing: ".1em" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: ".68rem", fontWeight: 600, color: "#E8E0D0", marginBottom: 12, letterSpacing: ".04em" },
};

export default function DataPage() {
  const [counts, setCounts] = useState<TableCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error(await res.text());
        const stats = await res.json();

        const results: TableCount[] = TABLES.map(t => {
          const count = t.statsKey && stats[t.statsKey] != null ? stats[t.statsKey] : -1;
          return { table: t.name, count, color: t.color, icon: t.icon };
        });

        setCounts(results);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalRecords = counts.reduce((sum, c) => sum + (c.count > 0 ? c.count : 0), 0);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>Data</span>
        <span style={S.sub}>Sources de donnees Feel The Gap</span>
        {!loading && <span style={{ ...S.sub, marginLeft: "auto" }}>{totalRecords.toLocaleString()} enregistrements</span>}
      </div>

      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement des donnees...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Table counts */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Tables</div>
              <div style={S.grid}>
                {counts.map(c => (
                  <div key={c.table} style={S.card(c.color)}>
                    <span style={S.cardIcon}>{c.icon}</span>
                    <div style={S.cardVal(c.color)}>
                      {c.count >= 0 ? c.count.toLocaleString() : "N/A"}
                    </div>
                    <div style={S.cardLabel}>{c.table.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
