"use client";

import { useEffect, useState, useCallback } from "react";

interface CronHealth {
  cron_name: string;
  schedule: string | null;
  expected_interval_s: number;
  alert_after_s: number;
  host: string;
  repo: string | null;
  description: string | null;
  active: boolean;
  last_run_at: string | null;
  last_finished_at: string | null;
  last_success: boolean | null;
  last_error: string | null;
  last_duration_ms: number | null;
  runs_24h: number;
  success_24h: number;
  fail_24h: number;
  success_rate_pct_24h: number | null;
  avg_duration_ms_24h: number;
  silent_for_s: number | null;
  status: "healthy" | "last_failed" | "failing" | "silent" | "never_ran";
}

interface CronRun {
  cron_name: string;
  started_at: string;
  finished_at: string | null;
  success: boolean | null;
  duration_ms: number | null;
  items_processed: number | null;
  error_msg: string | null;
}

const POLL_INTERVAL = 30_000;

const STATUS_COLOR: Record<CronHealth["status"], string> = {
  healthy: "#10B981",
  last_failed: "#F59E0B",
  failing: "#F59E0B",
  silent: "#EF4444",
  never_ran: "#6B7280",
};
const STATUS_LABEL: Record<CronHealth["status"], string> = {
  healthy: "Healthy",
  last_failed: "Last failed",
  failing: "Failing",
  silent: "Silent",
  never_ran: "Never ran",
};

function fmtAge(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
function fmtDuration(ms: number | null): string {
  if (ms == null || ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
}
function fmtAbsoluteTs(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { hour12: false });
}

export default function CronHealthPage() {
  const [data, setData] = useState<{ health: CronHealth[]; recentRuns: CronRun[]; ts: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cron-health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({ health: json.health ?? [], recentRuns: json.recentRuns ?? [], ts: json.ts });
      setError(json.healthError ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const counts = data
    ? data.health.reduce<Record<string, number>>((acc, h) => {
        acc[h.status] = (acc[h.status] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div style={{ paddingTop: 64, padding: "64px 24px 32px", color: "#E8E8E8", background: "#050B14", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", color: "#C9A84C", letterSpacing: ".05em" }}>Cron Health</h1>
          <p style={{ margin: "4px 0 0", color: "#8B95A4", fontSize: ".85rem" }}>
            VPS + Vercel crons · heartbeat into <code>public.cron_runs</code> · refresh 30s
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#C9A84C",
            color: "#050B14",
            border: 0,
            cursor: loading ? "wait" : "pointer",
            fontSize: ".75rem",
            letterSpacing: ".15em",
            textTransform: "uppercase",
          }}
        >
          {loading ? "Refresh…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", border: "1px solid #EF4444", marginBottom: 16, color: "#EF4444", fontSize: ".85rem" }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {(["healthy", "failing", "last_failed", "silent", "never_ran"] as const).map((s) => (
          <div
            key={s}
            style={{
              background: "#0A1A2E",
              border: `1px solid ${STATUS_COLOR[s]}40`,
              padding: "12px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.6rem", color: STATUS_COLOR[s], fontWeight: 600 }}>{counts[s] ?? 0}</div>
            <div style={{ fontSize: ".65rem", letterSpacing: ".15em", textTransform: "uppercase", color: "#8B95A4" }}>
              {STATUS_LABEL[s]}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: ".7rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 12 }}>
        Registered crons
      </h2>
      <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)", overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", fontSize: ".8rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(201,168,76,.05)", borderBottom: "1px solid rgba(201,168,76,.15)" }}>
              <th style={th}>Cron</th>
              <th style={th}>Status</th>
              <th style={th}>Last run</th>
              <th style={th}>Silent for</th>
              <th style={th}>Last duration</th>
              <th style={th}>24h runs · ✓ / ✗</th>
              <th style={th}>Success rate</th>
              <th style={th}>Host · Repo</th>
              <th style={th}>Last error</th>
            </tr>
          </thead>
          <tbody>
            {data?.health.map((h) => (
              <tr key={h.cron_name} style={{ borderBottom: "1px solid rgba(201,168,76,.08)" }}>
                <td style={td}>
                  <div style={{ fontWeight: 500, color: "#E8E8E8" }}>{h.cron_name}</div>
                  <div style={{ fontSize: ".7rem", color: "#8B95A4" }}>{h.description ?? ""}</div>
                </td>
                <td style={td}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 8px",
                      background: `${STATUS_COLOR[h.status]}20`,
                      border: `1px solid ${STATUS_COLOR[h.status]}60`,
                      color: STATUS_COLOR[h.status],
                      fontSize: ".7rem",
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[h.status] }} />
                    {STATUS_LABEL[h.status]}
                  </span>
                </td>
                <td style={td}>{fmtAbsoluteTs(h.last_run_at)}</td>
                <td style={td}>
                  <span style={{ color: h.status === "silent" ? "#EF4444" : "#E8E8E8" }}>
                    {fmtAge(h.silent_for_s)}
                  </span>
                  <div style={{ fontSize: ".7rem", color: "#8B95A4" }}>
                    alert &gt; {fmtAge(h.alert_after_s)}
                  </div>
                </td>
                <td style={td}>{fmtDuration(h.last_duration_ms)}</td>
                <td style={td}>
                  {h.runs_24h > 0 ? (
                    <span>
                      <strong>{h.runs_24h}</strong>
                      <span style={{ color: "#10B981" }}> · {h.success_24h}</span>
                      {h.fail_24h > 0 && <span style={{ color: "#EF4444" }}> / {h.fail_24h}</span>}
                    </span>
                  ) : (
                    <span style={{ color: "#6B7280" }}>—</span>
                  )}
                </td>
                <td style={td}>
                  {h.success_rate_pct_24h != null ? (
                    <span style={{ color: h.success_rate_pct_24h >= 75 ? "#10B981" : h.success_rate_pct_24h >= 50 ? "#F59E0B" : "#EF4444" }}>
                      {h.success_rate_pct_24h}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ ...td, fontSize: ".7rem", color: "#8B95A4" }}>
                  {h.host}
                  {h.repo && <div>{h.repo}</div>}
                </td>
                <td style={{ ...td, fontSize: ".7rem", color: "#EF4444", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.last_error ?? ""}
                </td>
              </tr>
            ))}
            {!data?.health.length && (
              <tr>
                <td colSpan={9} style={{ ...td, textAlign: "center", color: "#8B95A4", padding: "32px 16px" }}>
                  {loading ? "Loading…" : "No crons registered yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: ".7rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 12 }}>
        Recent runs (last 50)
      </h2>
      <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)", overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: ".75rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(201,168,76,.05)", borderBottom: "1px solid rgba(201,168,76,.15)" }}>
              <th style={th}>Cron</th>
              <th style={th}>Started</th>
              <th style={th}>Duration</th>
              <th style={th}>Items</th>
              <th style={th}>Success</th>
              <th style={th}>Error</th>
            </tr>
          </thead>
          <tbody>
            {data?.recentRuns.map((r, idx) => (
              <tr key={`${r.cron_name}-${r.started_at}-${idx}`} style={{ borderBottom: "1px solid rgba(201,168,76,.08)" }}>
                <td style={td}>{r.cron_name}</td>
                <td style={td}>{fmtAbsoluteTs(r.started_at)}</td>
                <td style={td}>{fmtDuration(r.duration_ms)}</td>
                <td style={td}>{r.items_processed ?? 0}</td>
                <td style={td}>
                  {r.success === true ? (
                    <span style={{ color: "#10B981" }}>✓</span>
                  ) : r.success === false ? (
                    <span style={{ color: "#EF4444" }}>✗</span>
                  ) : (
                    <span style={{ color: "#6B7280" }}>…</span>
                  )}
                </td>
                <td style={{ ...td, color: "#EF4444", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.error_msg ?? ""}
                </td>
              </tr>
            ))}
            {!data?.recentRuns.length && (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#8B95A4", padding: "32px 16px" }}>
                  No recent runs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, fontSize: ".7rem", color: "#6B7280" }}>
        Last refresh: {data?.ts ? fmtAbsoluteTs(data.ts) : "—"}
      </div>
    </div>
  );
}

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
