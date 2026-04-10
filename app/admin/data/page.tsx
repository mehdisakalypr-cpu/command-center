"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TableCount = { table: string; count: number; color: string; icon: string };
type ResearchRun = { id: string; status: string; query: string | null; created_at: string };

const TABLES: { name: string; color: string; icon: string }[] = [
  { name: "countries", color: "#3B82F6", icon: "🌍" },
  { name: "products", color: "#8B5CF6", icon: "📦" },
  { name: "opportunities", color: "#C9A84C", icon: "💡" },
  { name: "business_plans", color: "#10B981", icon: "📋" },
  { name: "trade_flows", color: "#F59E0B", icon: "🔄" },
  { name: "reports", color: "#EF4444", icon: "📊" },
];

const S = {
  page: { display: "flex", flexDirection: "column" as const, height: "100%", color: "#E8E0D0", fontFamily: "Inter, sans-serif" },
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
  runRow: { background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
  badge: (color: string) => ({ fontSize: ".58rem", padding: "2px 8px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block" } as React.CSSProperties),
};

export default function DataPage() {
  const [counts, setCounts] = useState<TableCount[]>([]);
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const results: TableCount[] = [];

        for (const t of TABLES) {
          try {
            const { count, error: err } = await supabase
              .from(t.name)
              .select("*", { count: "exact", head: true });
            if (!err) {
              results.push({ table: t.name, count: count ?? 0, color: t.color, icon: t.icon });
            } else {
              results.push({ table: t.name, count: -1, color: t.color, icon: t.icon });
            }
          } catch {
            results.push({ table: t.name, count: -1, color: t.color, icon: t.icon });
          }
        }

        setCounts(results);

        // Try to fetch research_runs (may not exist)
        try {
          const { data } = await supabase
            .from("research_runs")
            .select("id, status, query, created_at")
            .order("created_at", { ascending: false })
            .limit(5);
          if (data) setRuns(data);
        } catch {
          // table may not exist, ignore
        }
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

            {/* Research runs */}
            {runs.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Derniers research runs</div>
                {runs.map(r => {
                  const statusColor = r.status === "completed" ? "#10B981" : r.status === "running" ? "#3B82F6" : r.status === "failed" ? "#EF4444" : "#F59E0B";
                  return (
                    <div key={r.id} style={S.runRow}>
                      <span style={S.badge(statusColor)}>{r.status}</span>
                      <span style={{ fontSize: ".72rem", color: "#E8E0D0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.query || "-"}
                      </span>
                      <span style={{ fontSize: ".58rem", color: "#5A6A7A" }}>
                        {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
