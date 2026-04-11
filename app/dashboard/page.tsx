"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/* ── Types ──────────────────────────────────────────────────── */
interface Pm2Process { name: string; status: string; memory: number; restarts: number; }
interface ServiceStatus { url: string; up: boolean; latencyMs: number; }
interface Metrics {
  ts: string;
  isVps: boolean;
  vps: {
    ram: { total: number; used: number; available: number; pct: number };
    disk: { total: string; used: string; free: string; pct: string };
    pm2: Pm2Process[];
  } | null;
  ftg: {
    total: number;
    tiers: Record<string, number>;
    newLast7d: number;
    withCredits: number;
  } | null;
  ftgData: { countries: number; opportunities: number } | null;
  estate: {
    hotels: number;
    vouchers: { total: number; active: number };
    alerts: { total: number; unread: number };
    members: number;
  } | null;
  reportsProgress: {
    reports: number;
    businessPlans: number;
    countriesWithOpps: number;
  } | null;
  shiftDynamics: {
    cmsEntries: number;
    leads: number;
  } | null;
  services: {
    theEstate: ServiceStatus;
    shiftDynamics: ServiceStatus;
    feelTheGap: ServiceStatus;
    commandCenter: ServiceStatus;
  };
  lastHealthLog: string | null;
}

/* ── Constants ──────────────────────────────────────────────── */
const POLL_INTERVAL = 30_000;
const TIER_COLORS: Record<string, string> = {
  explorer:  "#5A6A7A",
  data:      "#3B82F6",
  strategy:  "#8B5CF6",
  premium:   "#C9A84C",
  enterprise:"#10B981",
};
const TIER_LABELS: Record<string, string> = {
  explorer: "Explorer", data: "Data", strategy: "Strategy",
  premium: "Premium", enterprise: "Enterprise",
};

/* ── Helpers ────────────────────────────────────────────────── */
function StatusDot({ up }: { up: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: up ? "#10B981" : "#EF4444",
      boxShadow: up ? "0 0 6px rgba(16,185,129,.6)" : "0 0 6px rgba(239,68,68,.6)",
      flexShrink: 0,
    }} />
  );
}

function Card({ title, icon, children, style }: { title: string; icon: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)",
      padding: "20px 22px", ...style,
    }}>
      <div style={{ fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: color ?? "#E8E0D0", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: ".68rem", color: "#9BA8B8", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const n = typeof pct === "number" ? pct : parseInt(pct);
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(n, 100)}%`, background: n > 80 ? "#EF4444" : color, borderRadius: 2, transition: "width .5s" }} />
    </div>
  );
}

/* ── Action button ──────────────────────────────────────────── */
function ActionBtn({ label, action, onDone }: { label: string; action: string; onDone: (msg: string) => void }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      onDone(data.ok ? `✓ ${label}` : `✗ ${data.error}`);
    } catch { onDone(`✗ Erreur réseau`); }
    finally { setLoading(false); }
  };
  return (
    <button onClick={run} disabled={loading} style={{
      background: loading ? "rgba(201,168,76,.08)" : "rgba(201,168,76,.12)",
      border: "1px solid rgba(201,168,76,.3)", color: loading ? "#5A6A7A" : "#C9A84C",
      padding: "7px 14px", fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase",
      cursor: loading ? "wait" : "pointer", fontFamily: "inherit", transition: "all .2s",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> : null}
      {label}
    </button>
  );
}

/* ── Main ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [toast, setToast] = useState("");

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/metrics");
      const data = await res.json();
      setMetrics(data);
      setLastUpdate(new Date().toLocaleTimeString("fr-FR"));
    } catch { /* silently retry */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#040D1C", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A84C", fontFamily: "Inter, sans-serif", fontSize: ".8rem", letterSpacing: ".1em" }}>
      Chargement des métriques…
    </div>
  );

  const { vps, ftg, ftgData, estate, reportsProgress, shiftDynamics, services } = metrics ?? {};
  const serviceList = services ? [
    { key: "theEstate",    label: "The Estate",     icon: "🏨", color: "#C9A84C", s: services.theEstate },
    { key: "shiftDynamics",label: "Shift Dynamics",  icon: "⚡", color: "#8B5CF6", s: services.shiftDynamics },
    { key: "feelTheGap",   label: "Feel The Gap",    icon: "🌍", color: "#3B82F6", s: services.feelTheGap },
    { key: "commandCenter",label: "Command Center",  icon: "🎙️", color: "#10B981", s: services.commandCenter },
  ] : [];

  const totalTierUsers = Object.values(ftg?.tiers ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#040D1C", color: "#E8E0D0", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,.2); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ color: "#5A6A7A", textDecoration: "none", fontSize: ".8rem" }}>← Aria</Link>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,.1)" }} />
        <div style={{ fontFamily: "serif", fontSize: ".7rem", letterSpacing: ".22em", textTransform: "uppercase", color: "#C9A84C" }}>Command Center</div>
        <span style={{ fontSize: ".6rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A" }}>/ Dashboard</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdate && <span style={{ fontSize: ".62rem", color: "#5A6A7A" }}>Mis à jour {lastUpdate}</span>}
          <button onClick={fetchMetrics} style={{ background: "transparent", border: "1px solid rgba(201,168,76,.25)", color: "#C9A84C", padding: "5px 12px", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
            ↻ Rafraîchir
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", top: 70, right: 24, zIndex: 100, background: "#071425", border: "1px solid rgba(201,168,76,.4)", padding: "10px 18px", fontSize: ".72rem", color: "#C9A84C", animation: "fadeIn .25s ease", boxShadow: "0 4px 24px rgba(0,0,0,.4)" }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Services status row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {serviceList.map(({ key, label, icon, color, s }) => (
            <div key={key} style={{ background: "#0A1A2E", border: `1px solid ${s.up ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.25)"}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.1rem" }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".75rem", fontWeight: 600, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                <div style={{ fontSize: ".62rem", color: "#5A6A7A", marginTop: 2 }}>
                  {s.up ? `${s.latencyMs}ms` : "Hors ligne"}
                </div>
              </div>
              <StatusDot up={s.up} />
            </div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Feel The Gap */}
          <Card title="Feel The Gap" icon="🌍">
            {ftg ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                  <Stat label="Utilisateurs" value={ftg.total} />
                  <Stat label="Nouveaux (7j)" value={ftg.newLast7d} color="#10B981" />
                  <Stat label="Avec crédits IA" value={ftg.withCredits} color="#8B5CF6" />
                </div>
                <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 10 }}>Répartition par tier</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {Object.entries(ftg.tiers).sort((a, b) => b[1] - a[1]).map(([tier, count]) => (
                    <div key={tier} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_COLORS[tier] ?? "#5A6A7A", flexShrink: 0 }} />
                      <div style={{ fontSize: ".7rem", color: "#9BA8B8", width: 70 }}>{TIER_LABELS[tier] ?? tier}</div>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: totalTierUsers > 0 ? `${(count / totalTierUsers) * 100}%` : "0%", background: TIER_COLORS[tier] ?? "#5A6A7A", borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: ".7rem", fontWeight: 600, color: "#E8E0D0", width: 20, textAlign: "right" }}>{count}</div>
                    </div>
                  ))}
                </div>
                {ftgData && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.04)" }}>
                    <Stat label="Pays en base" value={ftgData.countries} />
                    <Stat label="Opportunités" value={ftgData.opportunities} color="#C9A84C" />
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Données non disponibles</div>
            )}
          </Card>

          {/* VPS Infra (shown only when VPS data available) */}
          <Card title={metrics?.isVps ? "Infrastructure VPS" : "Infrastructure"} icon="🖥️">
            {vps ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 6 }}>RAM</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: vps.ram.pct > 80 ? "#EF4444" : "#E8E0D0" }}>
                      {vps.ram.used} <span style={{ fontSize: ".7rem", fontWeight: 400, color: "#5A6A7A" }}>/ {vps.ram.total} MB</span>
                    </div>
                    <ProgressBar pct={vps.ram.pct} color="#C9A84C" />
                    <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 4 }}>{vps.ram.pct}% utilisé · {vps.ram.available} MB dispo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 6 }}>Disque</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: parseInt(vps.disk.pct) > 80 ? "#EF4444" : "#E8E0D0" }}>
                      {vps.disk.used} <span style={{ fontSize: ".7rem", fontWeight: 400, color: "#5A6A7A" }}>/ {vps.disk.total}</span>
                    </div>
                    <ProgressBar pct={parseInt(vps.disk.pct)} color="#3B82F6" />
                    <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 4 }}>{vps.disk.pct} utilisé · {vps.disk.free} libre</div>
                  </div>
                </div>

                <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 10 }}>Processus PM2</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {vps.pm2.map(p => (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)" }}>
                      <StatusDot up={p.status === "online"} />
                      <div style={{ flex: 1, fontSize: ".72rem", color: "#E8E0D0" }}>{p.name}</div>
                      <div style={{ fontSize: ".62rem", color: "#5A6A7A" }}>{p.memory} MB</div>
                      {p.restarts > 0 && <div style={{ fontSize: ".58rem", color: "#F59E0B", background: "rgba(245,158,11,.1)", padding: "1px 6px" }}>↺ {p.restarts}</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "12px 0" }}>
                <div style={{ fontSize: ".72rem", color: "#10B981", marginBottom: 8 }}>Vercel (serverless)</div>
                <div style={{ fontSize: ".65rem", color: "#5A6A7A", lineHeight: 1.6 }}>
                  Pas de serveur VPS — déployé sur Vercel.<br/>
                  Les métriques Supabase et les pings services restent actifs.
                </div>
              </div>
            )}
          </Card>

          {/* The Estate */}
          <Card title="The Estate" icon="🏨">
            {estate ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                  <Stat label="Hôtels" value={estate.hotels} />
                  <Stat label="Membres" value={estate.members} />
                  <Stat label="Vouchers actifs" value={estate.vouchers.active} color="#10B981" sub={`/ ${estate.vouchers.total} total`} />
                  <Stat label="Alertes non lues" value={estate.alerts.unread} color={estate.alerts.unread > 0 ? "#F59E0B" : "#10B981"} sub={`/ ${estate.alerts.total} total`} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(201,168,76,.05)", border: "1px solid rgba(201,168,76,.1)" }}>
                  <StatusDot up={services?.theEstate?.up ?? false} />
                  <span style={{ fontSize: ".65rem", color: "#9BA8B8" }}>Netlify · the-estate-fo.netlify.app</span>
                  {services?.theEstate && <span style={{ marginLeft: "auto", fontSize: ".62rem", color: "#5A6A7A" }}>{services.theEstate.latencyMs}ms</span>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Données non disponibles</div>
            )}
          </Card>

          {/* Reports Progress + Shift Dynamics */}
          <Card title="Rapports & Données" icon="📊">
            {reportsProgress ? (() => {
              const rptPct = reportsProgress.countriesWithOpps > 0
                ? Math.round((reportsProgress.reports / reportsProgress.countriesWithOpps) * 100)
                : 0;
              const bpPct = reportsProgress.countriesWithOpps > 0
                ? Math.round((reportsProgress.businessPlans / reportsProgress.countriesWithOpps) * 100)
                : 0;
              return (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: ".7rem", color: "#9BA8B8" }}>Rapports pays générés</span>
                      <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#C9A84C" }}>{rptPct}%</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#E8E0D0" }}>{reportsProgress.reports}</span>
                      <span style={{ fontSize: ".68rem", color: "#5A6A7A" }}>/ {reportsProgress.countriesWithOpps} pays avec opportunités</span>
                    </div>
                    <ProgressBar pct={rptPct} color="#C9A84C" />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: ".7rem", color: "#9BA8B8" }}>Business plans générés</span>
                      <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#3B82F6" }}>{bpPct}%</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#E8E0D0" }}>{reportsProgress.businessPlans}</span>
                      <span style={{ fontSize: ".68rem", color: "#5A6A7A" }}>/ {reportsProgress.countriesWithOpps} opportunités cibles</span>
                    </div>
                    <ProgressBar pct={bpPct} color="#3B82F6" />
                  </div>
                  {shiftDynamics && (
                    <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 10 }}>Shift Dynamics</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Stat label="Entrées CMS" value={shiftDynamics.cmsEntries} color="#8B5CF6" />
                        <Stat label="Leads capturés" value={shiftDynamics.leads} color="#10B981" />
                      </div>
                    </div>
                  )}
                </>
              );
            })() : (
              <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Données non disponibles</div>
            )}
          </Card>

          {/* Actions rapides */}
          <Card title="Actions Rapides" icon="⚡">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {metrics?.isVps && (
                <div>
                  <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 10 }}>PM2 — Processus</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <ActionBtn label="Restart Feel The Gap" action="restart-ftg" onDone={showToast} />
                    <ActionBtn label="Restart Command Center" action="restart-cc" onDone={showToast} />
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 10 }}>Supabase</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <ActionBtn label="Keepalive Supabase" action="keepalive-supabase" onDone={showToast} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 10 }}>Monitoring</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <ActionBtn label="Health Check" action="health-check" onDone={showToast} />
                </div>
              </div>

              {/* Last health log (VPS only) */}
              {metrics?.lastHealthLog && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 8 }}>Dernier rapport santé</div>
                  <pre style={{ fontSize: ".62rem", color: "#9BA8B8", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)", padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0, fontFamily: "monospace" }}>
                    {metrics.lastHealthLog}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Code Architecture Map ── */}
        <Card title="Code Architecture Map" icon="🗺️" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: ".68rem", color: "#9BA8B8" }}>
              Visualisation interactive des dependances, clusters et flux de tous les projets via GitNexus.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { name: "Feel The Gap", icon: "🌍", color: "#C9A84C", files: 265, symbols: 1797, edges: 3733, clusters: 152, flows: 129 },
                { name: "ONE FOR ALL", icon: "🏭", color: "#22C55E", files: 17, symbols: 58, edges: 77, clusters: 5, flows: 0 },
                { name: "THE ESTATE", icon: "🏨", color: "#60A5FA", files: 44, symbols: 236, edges: 358, clusters: 15, flows: 8 },
                { name: "Command Center", icon: "🎮", color: "#A78BFA", files: 64, symbols: 447, edges: 839, clusters: 32, flows: 35 },
              ].map(p => (
                <div key={p.name} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${p.color}33`, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span>{p.icon}</span>
                    <span style={{ fontSize: ".65rem", fontWeight: 700, color: p.color }}>{p.name}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    <div style={{ fontSize: ".55rem", color: "#5A6A7A" }}>Files: <span style={{ color: "#E8E0D0" }}>{p.files}</span></div>
                    <div style={{ fontSize: ".55rem", color: "#5A6A7A" }}>Symbols: <span style={{ color: "#E8E0D0" }}>{p.symbols.toLocaleString()}</span></div>
                    <div style={{ fontSize: ".55rem", color: "#5A6A7A" }}>Edges: <span style={{ color: "#E8E0D0" }}>{p.edges.toLocaleString()}</span></div>
                    <div style={{ fontSize: ".55rem", color: "#5A6A7A" }}>Clusters: <span style={{ color: "#E8E0D0" }}>{p.clusters}</span></div>
                  </div>
                  {p.flows > 0 && (
                    <div style={{ fontSize: ".55rem", color: "#5A6A7A", marginTop: 4 }}>Flows: <span style={{ color: p.color }}>{p.flows}</span></div>
                  )}
                </div>
              ))}
            </div>
            <Link href="/dashboard/code-map" style={{
              display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
              padding: "8px 18px", background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.3)",
              color: "#C9A84C", fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase",
              textDecoration: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              Explorer les graphes interactifs →
            </Link>
          </div>
        </Card>

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", fontSize: ".58rem", color: "#5A6A7A", letterSpacing: ".08em", paddingBottom: 8 }}>
          Command Center · {metrics?.isVps ? "VPS" : "Vercel"} · Coût 0€ · Refresh auto toutes les 30s
        </div>
      </div>
    </div>
  );
}
