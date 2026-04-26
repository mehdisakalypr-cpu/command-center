"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type Msg = {
  id: string;
  product_slug: string;
  type: string;
  customer_id: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown>;
  received_at: string;
  ai_draft: string | null;
  ai_classification: string | null;
  ai_confidence: number | null;
  draft_status: string;
  sent_at: string | null;
  thread_id: string;
};

type Counts = Record<string, Record<string, number>>;

const STATUS_COLOR: Record<string, string> = {
  pending: "#6B7280",
  draft_ready: "#3B82F6",
  approved: "#FBBF24",
  sent: "#10B981",
  discarded: "#9CA3AF",
  failed: "#EF4444",
};

const PRODUCTS = [
  { slug: "all", name: "Tous", color: "#C9A84C" },
  { slug: "aici", name: "AICI", color: "#7C3AED" },
  { slug: "aiplb", name: "AIPLB", color: "#10B981" },
  { slug: "ancf", name: "ANCF", color: "#F43F5E" },
  { slug: "ftg", name: "Feel The Gap", color: "#06B6D4" },
  { slug: "ofa", name: "One For All", color: "#FBBF24" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { hour12: false });
}

export default function CustomerMessagesPage() {
  const [data, setData] = useState<{ messages: Msg[]; counts: Counts } | null>(null);
  const [loading, setLoading] = useState(false);
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (productFilter !== "all") params.set("product", productFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/customer-messages?${params}`, { cache: "no-store" });
      const json = await res.json();
      setData({ messages: json.messages ?? [], counts: json.counts ?? {} });
    } catch (e) {
      setMsg("Erreur chargement: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productFilter, statusFilter]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data.messages;
    const s = search.toLowerCase();
    return data.messages.filter((m) =>
      [m.name, m.email, m.company, m.subject, m.message, m.ai_draft]
        .join(" ").toLowerCase().includes(s)
    );
  }, [data, search]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function callAction(action: string, payload: Record<string, unknown>) {
    setBusy(action + (payload.id || ""));
    try {
      const res = await fetch("/api/admin/customer-messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || action + " failed");
      return json;
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft(id: string) {
    const draft = draftEdits[id];
    if (!draft) return;
    try {
      await callAction("save_draft", { id, ai_draft: draft });
      setMsg("Brouillon sauvé");
      load();
    } catch (e) { setMsg("✗ " + (e as Error).message); }
  }

  async function send(id: string) {
    if (!confirm("Envoyer ce mail au client maintenant ?")) return;
    try {
      const r = await callAction("send", { id });
      setMsg(`Envoyé · ${JSON.stringify(r.results)}`);
      load();
    } catch (e) { setMsg("✗ " + (e as Error).message); }
  }

  async function bulkSend() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Envoyer ${ids.length} brouillons en bulk ?`)) return;
    try {
      const r = await callAction("send_bulk", { ids });
      setMsg(`Bulk envoyé · ${r.results.filter((x: { ok: boolean }) => x.ok).length}/${ids.length} OK`);
      setSelected(new Set());
      load();
    } catch (e) { setMsg("✗ " + (e as Error).message); }
  }

  async function discard(id: string) {
    if (!confirm("Jeter ce message ?")) return;
    try { await callAction("discard", { id }); load(); }
    catch (e) { setMsg("✗ " + (e as Error).message); }
  }

  async function redraft(id: string) {
    try { await callAction("redraft", { id }); setMsg("Re-draft demandé · cron 5min"); load(); }
    catch (e) { setMsg("✗ " + (e as Error).message); }
  }

  return (
    <div style={{ paddingTop: 64, padding: "64px 24px 32px", color: "#E8E8E8", background: "#050B14", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 24 }}>
        {/* SIDEBAR */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          <h2 style={{ fontSize: ".7rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 12 }}>Folders</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {PRODUCTS.map((p) => {
              const c = data?.counts[p.slug] ?? {};
              const total = p.slug === "all"
                ? Object.values(data?.counts ?? {}).reduce((s, v) => s + Object.values(v).reduce((a, b) => a + b, 0), 0)
                : Object.values(c).reduce((a, b) => a + b, 0);
              const ready = p.slug === "all"
                ? Object.values(data?.counts ?? {}).reduce((s, v) => s + (v.draft_ready ?? 0), 0)
                : c.draft_ready ?? 0;
              const isActive = productFilter === p.slug;
              return (
                <button key={p.slug} onClick={() => setProductFilter(p.slug)}
                  style={{
                    textAlign: "left", padding: "10px 12px",
                    background: isActive ? "rgba(201,168,76,.12)" : "transparent",
                    border: "1px solid " + (isActive ? "rgba(201,168,76,.4)" : "transparent"),
                    color: isActive ? "#C9A84C" : "#cbd5e1",
                    cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderLeft: `3px solid ${p.color}`,
                  }}>
                  <span>{p.name}</span>
                  <span style={{ fontSize: ".75rem", color: "#9ca3af" }}>
                    {ready > 0 && <span style={{ color: "#3B82F6", marginRight: 4 }}>● {ready}</span>}
                    {total}
                  </span>
                </button>
              );
            })}
          </div>

          <h2 style={{ fontSize: ".7rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A84C", margin: "24px 0 12px" }}>Status</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => setStatusFilter("")} style={{ textAlign: "left", padding: "6px 12px", background: !statusFilter ? "rgba(201,168,76,.08)" : "transparent", border: 0, color: !statusFilter ? "#C9A84C" : "#cbd5e1", cursor: "pointer", fontSize: ".85rem" }}>Tous</button>
            {["pending", "draft_ready", "approved", "sent", "discarded", "failed"].map((st) => (
              <button key={st} onClick={() => setStatusFilter(st)}
                style={{ textAlign: "left", padding: "6px 12px", background: statusFilter === st ? "rgba(201,168,76,.08)" : "transparent", border: 0, cursor: "pointer", fontSize: ".85rem", color: statusFilter === st ? "#C9A84C" : "#cbd5e1" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[st], marginRight: 8 }} />
                {st}
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.6rem", color: "#C9A84C" }}>Customer Messages</h1>
              <p style={{ margin: "4px 0 0", color: "#8B95A4", fontSize: ".85rem" }}>
                {filtered.length} message{filtered.length > 1 ? "s" : ""} · refresh 30s
                {selected.size > 0 && ` · ${selected.size} sélectionnés`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="🔍 Recherche…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "8px 12px", background: "#0A1A2E", border: "1px solid rgba(201,168,76,.2)", color: "#e8e8e8", fontSize: ".85rem", width: 240 }}
              />
              {selected.size > 0 && (
                <button onClick={bulkSend} disabled={!!busy}
                  style={{ padding: "8px 18px", background: "#10B981", color: "#000", border: 0, fontSize: ".75rem", letterSpacing: ".15em", textTransform: "uppercase", cursor: "pointer", fontWeight: 600 }}>
                  📤 Envoyer ({selected.size})
                </button>
              )}
              <button onClick={load} disabled={loading} style={{ padding: "8px 16px", background: "transparent", color: "#C9A84C", border: "1px solid rgba(201,168,76,.4)", cursor: "pointer", fontSize: ".75rem", letterSpacing: ".15em", textTransform: "uppercase" }}>
                {loading ? "…" : "Refresh"}
              </button>
            </div>
          </div>

          {msg && (
            <div style={{ padding: "10px 14px", background: "#0A1A2E", border: "1px solid rgba(201,168,76,.3)", marginBottom: 16, fontSize: ".85rem" }}>{msg}</div>
          )}

          <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)" }}>
            {filtered.map((m) => {
              const isExpanded = expanded === m.id;
              const draft = draftEdits[m.id] ?? m.ai_draft ?? "";
              return (
                <div key={m.id} style={{ borderBottom: "1px solid rgba(201,168,76,.1)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "32px 100px 1fr 80px 110px 130px 110px", gap: 12, padding: "12px 16px", alignItems: "center", cursor: "pointer", background: isExpanded ? "rgba(201,168,76,.04)" : "transparent" }}
                    onClick={() => setExpanded(isExpanded ? null : m.id)}>
                    <input type="checkbox" checked={selected.has(m.id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelected(m.id); }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={m.draft_status !== "draft_ready" && m.draft_status !== "approved"} />
                    <span style={{ fontSize: ".7rem", color: "#C9A84C", textTransform: "uppercase", letterSpacing: ".1em" }}>{m.product_slug}</span>
                    <div>
                      <div style={{ color: "#fafafa", fontSize: ".9rem", fontWeight: 500 }}>{m.name ?? m.email}</div>
                      <div style={{ color: "#9ca3af", fontSize: ".8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 460 }}>
                        {m.subject ?? m.message.slice(0, 80)}
                      </div>
                    </div>
                    <span style={{ fontSize: ".7rem", color: "var(--accent-gold)", textTransform: "uppercase" }}>{m.type}</span>
                    <span style={{ padding: "2px 8px", background: STATUS_COLOR[m.draft_status] + "20", border: `1px solid ${STATUS_COLOR[m.draft_status]}60`, color: STATUS_COLOR[m.draft_status], fontSize: ".7rem", letterSpacing: ".05em", textTransform: "uppercase", textAlign: "center" }}>
                      {m.draft_status}
                    </span>
                    <span style={{ fontSize: ".75rem", color: m.ai_classification ? "#7C3AED" : "#6B7280" }}>
                      {m.ai_classification ?? "—"}
                      {m.ai_confidence != null && <span style={{ color: "#9ca3af" }}> · {(m.ai_confidence * 100).toFixed(0)}%</span>}
                    </span>
                    <span style={{ fontSize: ".75rem", color: "#9ca3af", textAlign: "right" }}>{fmt(m.received_at).slice(0, 16)}</span>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "16px 24px 24px", background: "rgba(0,0,0,0.2)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* ORIGINAL */}
                        <div>
                          <div style={{ fontSize: ".7rem", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Message reçu</div>
                          <div style={{ padding: 12, background: "#06101F", border: "1px solid rgba(201,168,76,.15)", fontSize: ".85rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.message}</div>
                          <div style={{ marginTop: 8, fontSize: ".75rem", color: "#9ca3af", display: "flex", flexWrap: "wrap", gap: 12 }}>
                            <span>📧 {m.email}</span>
                            {m.phone && <span>📞 {m.phone}</span>}
                            {m.company && <span>🏢 {m.company}</span>}
                            {m.customer_id && <span>👤 {m.customer_id.slice(0, 8)}…</span>}
                          </div>
                        </div>

                        {/* DRAFT */}
                        <div>
                          <div style={{ fontSize: ".7rem", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>Brouillon AI · éditable</div>
                          <textarea
                            value={draft}
                            onChange={(e) => setDraftEdits({ ...draftEdits, [m.id]: e.target.value })}
                            disabled={m.draft_status === "sent" || m.draft_status === "discarded"}
                            placeholder={m.draft_status === "pending" ? "Brouillon en cours de génération…" : "Pas de brouillon"}
                            style={{ width: "100%", minHeight: 200, padding: 12, background: "#06101F", border: "1px solid rgba(201,168,76,.15)", color: "#e8e8e8", fontSize: ".88rem", lineHeight: 1.5, fontFamily: "inherit", resize: "vertical" }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        {m.draft_status === "pending" && (
                          <span style={{ fontSize: ".75rem", color: "#9ca3af" }}>Brouillon en cours · cron 5min…</span>
                        )}
                        {m.draft_status === "failed" && (
                          <button onClick={() => redraft(m.id)} style={btn}>Re-draft</button>
                        )}
                        {(m.draft_status === "draft_ready" || m.draft_status === "approved") && (
                          <>
                            <button onClick={() => discard(m.id)} style={btnGhost}>Jeter</button>
                            <button onClick={() => redraft(m.id)} style={btnGhost}>Re-draft</button>
                            <button onClick={() => saveDraft(m.id)} disabled={!!busy} style={btn}>Save draft</button>
                            <button onClick={() => send(m.id)} disabled={!!busy} style={btnSend}>📤 Envoyer maintenant</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && !loading && (
              <div style={{ padding: 48, textAlign: "center", color: "#8B95A4" }}>
                Aucun message — quand un visiteur soumet un formulaire de contact, il apparaîtra ici.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { padding: "8px 16px", background: "#C9A84C", color: "#050B14", border: 0, fontSize: ".75rem", letterSpacing: ".15em", textTransform: "uppercase", cursor: "pointer", fontWeight: 600 };
const btnSend: React.CSSProperties = { ...btn, background: "#10B981", color: "#000" };
const btnGhost: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#C9A84C", border: "1px solid rgba(201,168,76,.4)", fontSize: ".75rem", letterSpacing: ".15em", textTransform: "uppercase", cursor: "pointer" };
