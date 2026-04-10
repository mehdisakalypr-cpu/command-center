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
  badge: (color: string) => ({ fontSize: ".58rem", padding: "2px 8px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block" } as React.CSSProperties),
  stat: { display: "inline-block", padding: "6px 14px", background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", marginRight: 8, marginBottom: 12 } as React.CSSProperties,
  statVal: { fontSize: "1.1rem", fontWeight: 700, color: "#C9A84C" },
  statLabel: { fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase" as const, letterSpacing: ".08em" },
};

export default function CrmPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, tier, ai_credits, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (err) throw err;
        setProfiles(data ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search
    ? profiles.filter(p => p.email?.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.title}>CRM</span>
        <span style={S.sub}>Feel The Gap - Utilisateurs</span>
        <span style={{ ...S.sub, marginLeft: "auto" }}>{profiles.length} profils</span>
      </div>

      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement des profils...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={S.stat}>
                <div style={S.statVal}>{profiles.length}</div>
                <div style={S.statLabel}>Total</div>
              </div>
              {Object.entries(TIER_COLORS).map(([tier, color]) => (
                <div key={tier} style={S.stat}>
                  <div style={{ ...S.statVal, color }}>{profiles.filter(p => p.tier === tier).length}</div>
                  <div style={S.statLabel}>{tier}</div>
                </div>
              ))}
            </div>

            <input
              type="text"
              placeholder="Rechercher par email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={S.search}
            />

            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Full Name</th>
                  <th style={S.th}>Role</th>
                  <th style={S.th}>Tier</th>
                  <th style={S.th}>AI Credits</th>
                  <th style={S.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, color: "#E8E0D0" }}>{p.email}</td>
                    <td style={S.td}>{p.full_name || "-"}</td>
                    <td style={S.td}>{p.role || "-"}</td>
                    <td style={S.td}>
                      {p.tier ? (
                        <span style={S.badge(TIER_COLORS[p.tier] || "#5A6A7A")}>{p.tier}</span>
                      ) : "-"}
                    </td>
                    <td style={S.td}>{p.ai_credits ?? 0}</td>
                    <td style={{ ...S.td, fontSize: ".62rem" }}>
                      {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#5A6A7A" }}>
                      {search ? "Aucun profil correspondant" : "Aucun profil"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
