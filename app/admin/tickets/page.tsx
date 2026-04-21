"use client";

import { useState, useEffect } from "react";

type Ticket = {
  id: string;
  user_email: string | null;
  user_id: string | null;
  amount: number | null;
  reason: string | null;
  status: string;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
  completed: "#3B82F6",
};

const STATUSES = ["pending", "approved", "rejected", "completed"];

const S = {
  page: { display: "flex", flexDirection: "column" as const, height: "100%", color: "#E8E0D0", fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" },
  header: { background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties,
  title: { fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#C9A84C", fontWeight: 600 },
  sub: { fontSize: ".6rem", color: "#5A6A7A" },
  body: { flex: 1, overflow: "auto", padding: "20px 24px" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: ".72rem" },
  th: { textAlign: "left" as const, padding: "8px 12px", color: "#5A6A7A", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(255,255,255,.06)" },
  td: { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#9BA8B8" },
  badge: (color: string) => ({ fontSize: ".58rem", padding: "2px 8px", background: `${color}20`, color, letterSpacing: ".06em", borderRadius: 3, display: "inline-block", cursor: "pointer" } as React.CSSProperties),
  dropdown: { position: "absolute" as const, top: "100%", left: 0, zIndex: 50, background: "#071425", border: "1px solid rgba(201,168,76,.2)", boxShadow: "0 4px 16px rgba(0,0,0,.5)", minWidth: 130 } as React.CSSProperties,
  dropItem: (color: string) => ({
    display: "block", width: "100%", padding: "6px 12px", fontSize: ".62rem", color,
    background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const,
  } as React.CSSProperties),
  stat: { display: "inline-block", padding: "6px 14px", background: "#0A1A2E", border: "1px solid rgba(255,255,255,.06)", marginRight: 8, marginBottom: 12 } as React.CSSProperties,
  statVal: (color: string) => ({ fontSize: "1.1rem", fontWeight: 700, color } as React.CSSProperties),
  statLabel: { fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase" as const, letterSpacing: ".08em" },
  toast: { position: "fixed" as const, top: 16, right: 24, zIndex: 100, background: "#071425", border: "1px solid rgba(201,168,76,.4)", padding: "10px 18px", fontSize: ".72rem", color: "#C9A84C", boxShadow: "0 4px 24px rgba(0,0,0,.4)" },
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  async function fetchTickets() {
    try {
      const res = await fetch("/api/admin/tickets");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTickets(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTickets(); }, []);

  async function updateStatus(ticketId: string, newStatus: string) {
    setSaving(true);
    setOpenDropdown(null);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticketId, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast("Erreur: " + (err.error || "Unknown error"));
      } else {
        showToast(`Ticket mis a jour: ${newStatus}`);
        await fetchTickets();
      }
    } catch (e: unknown) {
      showToast("Erreur: " + (e instanceof Error ? e.message : "Unknown error"));
    }
    setSaving(false);
  }

  const statusCounts = STATUSES.reduce((acc, s) => {
    acc[s] = tickets.filter(t => t.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.header}>
        <span style={S.title}>Tickets</span>
        <span style={S.sub}>Refund tickets</span>
        <span style={{ ...S.sub, marginLeft: "auto" }}>{tickets.length} tickets</span>
      </div>

      <div style={S.body}>
        {loading && <div style={{ color: "#5A6A7A", fontSize: ".72rem" }}>Chargement des tickets...</div>}
        {error && <div style={{ color: "#EF4444", fontSize: ".72rem" }}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Status counts */}
            <div style={{ marginBottom: 16 }}>
              {STATUSES.map(s => (
                <div key={s} style={S.stat}>
                  <div style={S.statVal(STATUS_COLORS[s])}>{statusCounts[s]}</div>
                  <div style={S.statLabel}>{s}</div>
                </div>
              ))}
            </div>

            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Reason</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ ...S.td, color: "#E8E0D0" }}>{t.user_email || t.user_id || "-"}</td>
                    <td style={S.td}>{t.amount != null ? `$${t.amount.toFixed(2)}` : "-"}</td>
                    <td style={{ ...S.td, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.reason || "-"}
                    </td>
                    <td style={{ ...S.td, position: "relative" }}>
                      <span
                        style={S.badge(STATUS_COLORS[t.status] || "#5A6A7A")}
                        onClick={() => setOpenDropdown(openDropdown === t.id ? null : t.id)}
                      >
                        {t.status} ▾
                      </span>
                      {openDropdown === t.id && (
                        <div style={S.dropdown}>
                          {STATUSES.filter(s => s !== t.status).map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(t.id, s)}
                              disabled={saving}
                              style={S.dropItem(STATUS_COLORS[s])}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, fontSize: ".62rem" }}>
                      {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#5A6A7A" }}>
                      Aucun ticket
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
