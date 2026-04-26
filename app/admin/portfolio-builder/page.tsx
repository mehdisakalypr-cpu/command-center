"use client";

import { useEffect, useState, useCallback } from "react";

type Product = {
  slug: string;
  name: string;
  tagline: string;
  colorPrimary: string;
  colorAccent: string;
  baseUrl: string;
  repoOwner: string;
  repoName: string;
};

type Job = {
  id: number;
  product_slug: string;
  page_type: string;
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  last_error: string | null;
  generated_path: string | null;
  html_url: string | null;
  provider: string | null;
  cost_usd: number | null;
  created_at: string;
  finished_at: string | null;
};

type Data = {
  products: Product[];
  pageTypes: string[];
  jobs: Job[];
  error: string | null;
};

const STATUS_COLOR: Record<Job["status"], string> = {
  pending: "#6B7280",
  processing: "#3B82F6",
  done: "#10B981",
  failed: "#EF4444",
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { hour12: false });
}

export default function PortfolioBuilderPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portfolio-builder", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch (e) {
      setMsg("Erreur chargement: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function enqueueAll(productSlug: string) {
    setBusy(`enqueue-${productSlug}`);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/portfolio-builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "enqueue", product_slug: productSlug }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "enqueue failed");
      setMsg(`✓ ${json.enqueued} jobs enqueued for ${productSlug}`);
      load();
    } catch (e) {
      setMsg("✗ " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function retry(jobId: number) {
    setBusy(`retry-${jobId}`);
    try {
      const res = await fetch("/api/admin/portfolio-builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "retry", job_id: jobId }),
      });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (e) {
      setMsg("✗ " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(jobId: number) {
    if (!confirm(`Supprimer le job #${jobId} ?`)) return;
    setBusy(`cancel-${jobId}`);
    try {
      await fetch("/api/admin/portfolio-builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel", job_id: jobId }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  async function tick() {
    setBusy("tick");
    setMsg("⏳ Tick en cours, peut prendre 30-90s…");
    try {
      const res = await fetch("/api/admin/portfolio-builder/tick", { method: "POST" });
      const json = await res.json();
      setMsg(`Tick: processed=${json.processed ?? 0} ${json.error ? "· error: " + json.error : ""}`);
      load();
    } catch (e) {
      setMsg("✗ " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const counts = data
    ? data.jobs.reduce<Record<string, number>>((acc, j) => {
        acc[j.status] = (acc[j.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div style={{ paddingTop: 64, padding: "64px 24px 32px", color: "#E8E8E8", background: "#050B14", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", color: "#C9A84C", letterSpacing: ".05em" }}>Portfolio Builder</h1>
          <p style={{ margin: "4px 0 0", color: "#8B95A4", fontSize: ".85rem" }}>
            Enqueue · Vercel cron drains every 10 min via VPS tick · /admin/cron-health for status
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={tick} disabled={!!busy} style={btnGold}>
            {busy === "tick" ? "Ticking…" : "Tick now"}
          </button>
          <button onClick={load} disabled={loading} style={btnGhost}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", background: "#0A1A2E", border: "1px solid rgba(201,168,76,.3)", marginBottom: 16, fontSize: ".85rem" }}>
          {msg}
        </div>
      )}
      {data?.error && (
        <div style={{ padding: "10px 14px", background: "#1A0A0A", border: "1px solid #EF4444", marginBottom: 16, fontSize: ".85rem", color: "#EF4444" }}>
          ⚠ DB error: {data.error}
        </div>
      )}

      {/* Counts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {(["pending", "processing", "done", "failed"] as const).map((s) => (
          <div key={s} style={{ background: "#0A1A2E", border: `1px solid ${STATUS_COLOR[s]}40`, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", color: STATUS_COLOR[s], fontWeight: 600 }}>{counts[s] ?? 0}</div>
            <div style={{ fontSize: ".65rem", letterSpacing: ".15em", textTransform: "uppercase", color: "#8B95A4" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Products */}
      <h2 style={hdr}>Produits — sites live</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 32 }}>
        {data?.products.map((p) => (
          <div key={p.slug} style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: `linear-gradient(135deg, ${p.colorPrimary}, ${p.colorAccent})` }} />
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#E8E8E8" }}>{p.name}</h3>
              <code style={{ marginLeft: "auto", fontSize: ".65rem", color: "#6B7280" }}>{p.slug}</code>
            </div>
            <p style={{ margin: "0 0 12px", color: "#8B95A4", fontSize: ".85rem" }}>{p.tagline}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem", marginBottom: 8, padding: "6px 10px", background: "#06101F", border: "1px solid rgba(201,168,76,.1)", fontFamily: "monospace" }}>
              <span style={{ color: "#10B981" }}>●</span>
              <a href={p.baseUrl} target="_blank" rel="noopener" style={{ color: "#C9A84C", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.baseUrl}>
                {p.baseUrl.replace(/^https?:\/\//, "")}
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(p.baseUrl); setMsg(`URL ${p.slug} copiée`); }}
                title="Copier l'URL"
                style={{ background: "none", border: "1px solid rgba(201,168,76,.2)", color: "#8B95A4", padding: "1px 6px", cursor: "pointer", fontSize: ".7rem" }}
              >
                ⧉
              </button>
            </div>
            <div style={{ fontSize: ".7rem", color: "#6B7280", marginBottom: 12 }}>
              repo: <a href={`https://github.com/${p.repoOwner}/${p.repoName}`} target="_blank" rel="noopener" style={{ color: "#8B95A4" }}>{p.repoOwner}/{p.repoName}</a>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <a href={p.baseUrl} target="_blank" rel="noopener" style={{ ...btnGhost, flex: 1, textAlign: "center", textDecoration: "none", display: "inline-block" }}>
                Visit live →
              </a>
              <button
                onClick={() => enqueueAll(p.slug)}
                disabled={busy === `enqueue-${p.slug}`}
                style={{ ...btnGold, flex: 1 }}
              >
                {busy === `enqueue-${p.slug}` ? "…" : `Build ${data.pageTypes.length}`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Jobs */}
      <h2 style={hdr}>Jobs (last 200)</h2>
      <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)", overflow: "auto" }}>
        <table style={{ width: "100%", fontSize: ".8rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(201,168,76,.05)", borderBottom: "1px solid rgba(201,168,76,.15)" }}>
              <th style={th}>#</th>
              <th style={th}>Product</th>
              <th style={th}>Page</th>
              <th style={th}>Status</th>
              <th style={th}>Attempts</th>
              <th style={th}>Created</th>
              <th style={th}>Finished</th>
              <th style={th}>Provider · cost</th>
              <th style={th}>Output</th>
              <th style={th}>Error</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.jobs.map((j) => (
              <tr key={j.id} style={{ borderBottom: "1px solid rgba(201,168,76,.08)" }}>
                <td style={td}>{j.id}</td>
                <td style={td}>{j.product_slug}</td>
                <td style={td}>{j.page_type}</td>
                <td style={td}>
                  <span style={{
                    padding: "2px 8px",
                    background: `${STATUS_COLOR[j.status]}20`,
                    border: `1px solid ${STATUS_COLOR[j.status]}60`,
                    color: STATUS_COLOR[j.status],
                    fontSize: ".7rem",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                  }}>
                    {j.status}
                  </span>
                </td>
                <td style={td}>{j.attempts}</td>
                <td style={td}>{fmt(j.created_at)}</td>
                <td style={td}>{fmt(j.finished_at)}</td>
                <td style={td}>
                  {j.provider ? (
                    <>
                      {j.provider}
                      {j.cost_usd != null && <span style={{ color: "#8B95A4" }}> · ${j.cost_usd.toFixed(4)}</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={td}>
                  {j.html_url ? (
                    <a href={j.html_url} target="_blank" rel="noopener" style={{ color: "#C9A84C" }}>
                      view commit
                    </a>
                  ) : j.generated_path ? (
                    <code style={{ fontSize: ".7rem", color: "#8B95A4" }}>{j.generated_path}</code>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ ...td, color: "#EF4444", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {j.last_error ?? ""}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {(j.status === "failed" || j.status === "done") && (
                    <button onClick={() => retry(j.id)} disabled={busy === `retry-${j.id}`} style={btnXs}>
                      {busy === `retry-${j.id}` ? "…" : "retry"}
                    </button>
                  )}
                  {j.status === "pending" && (
                    <button onClick={() => cancel(j.id)} disabled={busy === `cancel-${j.id}`} style={{ ...btnXs, marginLeft: 4, color: "#EF4444" }}>
                      {busy === `cancel-${j.id}` ? "…" : "cancel"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!data?.jobs.length && (
              <tr>
                <td colSpan={11} style={{ ...td, textAlign: "center", color: "#8B95A4", padding: "32px 16px" }}>
                  {loading ? "Loading…" : "No jobs yet — enqueue from a product card above"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const hdr: React.CSSProperties = {
  fontSize: ".7rem",
  letterSpacing: ".18em",
  textTransform: "uppercase",
  color: "#C9A84C",
  marginBottom: 12,
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: ".65rem",
  letterSpacing: ".15em",
  textTransform: "uppercase",
  color: "#C9A84C",
  fontWeight: 500,
};
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "top" };

const btnGold: React.CSSProperties = {
  padding: "8px 16px",
  background: "#C9A84C",
  color: "#050B14",
  border: 0,
  cursor: "pointer",
  fontSize: ".75rem",
  letterSpacing: ".15em",
  textTransform: "uppercase",
};
const btnGhost: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  color: "#C9A84C",
  border: "1px solid rgba(201,168,76,.4)",
  cursor: "pointer",
  fontSize: ".75rem",
  letterSpacing: ".15em",
  textTransform: "uppercase",
};
const btnXs: React.CSSProperties = {
  padding: "3px 8px",
  background: "transparent",
  color: "#C9A84C",
  border: "1px solid rgba(201,168,76,.3)",
  cursor: "pointer",
  fontSize: ".7rem",
};
