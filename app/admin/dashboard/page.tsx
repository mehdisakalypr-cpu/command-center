"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────── */
interface Pm2Process { name: string; status: string; memory: number; restarts: number; }
interface ServiceStatus { url: string; up: boolean; latencyMs: number; }
interface Metrics {
  ts: string;
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
  services: {
    theEstate: ServiceStatus;
    shiftDynamics: ServiceStatus;
    feelTheGap: ServiceStatus;
    commandCenter: ServiceStatus;
  };
  lastHealthLog: string | null;
}

const POLL_INTERVAL = 30_000;
const TIER_COLORS: Record<string, string> = { explorer: "#5A6A7A", data: "#3B82F6", strategy: "#8B5CF6", premium: "#C9A84C", enterprise: "#10B981" };
const TIER_LABELS: Record<string, string> = { explorer: "Explorer", data: "Data", strategy: "Strategy", premium: "Premium", enterprise: "Enterprise" };

function StatusDot({ up }: { up: boolean }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: up ? "#10B981" : "#EF4444", boxShadow: up ? "0 0 6px rgba(16,185,129,.6)" : "0 0 6px rgba(239,68,68,.6)", flexShrink: 0 }} />;
}
function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.15)", padding: "20px 22px" }}>
      <div style={{ fontSize: ".6rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}><span>{icon}</span>{title}</div>
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
  const n = typeof pct === "number" ? pct : parseInt(pct as unknown as string);
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${Math.min(n, 100)}%`, background: n > 80 ? "#EF4444" : color, borderRadius: 2, transition: "width .5s" }} />
    </div>
  );
}
function ActionBtn({ label, action, onDone }: { label: string; action: string; onDone: (msg: string) => void }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json();
      onDone(data.ok ? `✓ ${label}` : `✗ ${data.error}`);
    } catch { onDone(`✗ Erreur réseau`); } finally { setLoading(false); }
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
    } catch { /* retry */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#C9A84C", fontSize: ".8rem", letterSpacing: ".1em" }}>
      Chargement des métriques…
    </div>
  );

  const { vps, ftg, ftgData, estate, services } = metrics ?? {};
  const serviceList = services ? [
    { key: "theEstate", label: "The Estate", icon: "🏨", color: "#C9A84C", s: services.theEstate },
    { key: "shiftDynamics", label: "Shift Dynamics", icon: "⚡", color: "#8B5CF6", s: services.shiftDynamics },
    { key: "feelTheGap", label: "Feel The Gap", icon: "🌍", color: "#3B82F6", s: services.feelTheGap },
    { key: "commandCenter", label: "Command Center", icon: "🎙️", color: "#10B981", s: services.commandCenter },
  ] : [];
  const totalTierUsers = Object.values(ftg?.tiers ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div style={{ color: "#E8E0D0", fontFamily: "Inter, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header bar */}
      <div style={{ background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase", color: "#C9A84C", fontWeight: 600 }}>Dashboard</span>
        <span style={{ fontSize: ".6rem", color: "#5A6A7A" }}>Monitoring & Infrastructure</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdate && <span style={{ fontSize: ".62rem", color: "#5A6A7A" }}>Mis à jour {lastUpdate}</span>}
          <button onClick={fetchMetrics} style={{ background: "transparent", border: "1px solid rgba(201,168,76,.25)", color: "#C9A84C", padding: "5px 12px", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>↻ Rafraîchir</button>
        </div>
      </div>

      {toast && <div style={{ position: "fixed", top: 16, right: 24, zIndex: 100, background: "#071425", border: "1px solid rgba(201,168,76,.4)", padding: "10px 18px", fontSize: ".72rem", color: "#C9A84C", animation: "fadeIn .25s ease", boxShadow: "0 4px 24px rgba(0,0,0,.4)" }}>{toast}</div>}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Services */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {serviceList.map(({ key, label, icon, color, s }) => (
            <div key={key} style={{ background: "#0A1A2E", border: `1px solid ${s.up ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.25)"}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1rem" }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".72rem", fontWeight: 600, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 2 }}>{s.up ? `${s.latencyMs}ms` : "Hors ligne"}</div>
              </div>
              <StatusDot up={s.up} />
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Feel The Gap" icon="🌍">
            {ftg ? (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
                <Stat label="Utilisateurs" value={ftg.total} />
                <Stat label="Nouveaux (7j)" value={ftg.newLast7d} color="#10B981" />
                <Stat label="Avec crédits IA" value={ftg.withCredits} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 8 }}>Répartition par tier</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(ftg.tiers).sort((a, b) => b[1] - a[1]).map(([tier, count]) => (
                  <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: TIER_COLORS[tier] ?? "#5A6A7A", flexShrink: 0 }} />
                    <div style={{ fontSize: ".68rem", color: "#9BA8B8", width: 65 }}>{TIER_LABELS[tier] ?? tier}</div>
                    <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.05)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: totalTierUsers > 0 ? `${(count / totalTierUsers) * 100}%` : "0%", background: TIER_COLORS[tier] ?? "#5A6A7A", borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: ".68rem", fontWeight: 600, color: "#E8E0D0", width: 20, textAlign: "right" }}>{count}</div>
                  </div>
                ))}
              </div>
              {ftgData && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.04)" }}>
                  <Stat label="Pays en base" value={ftgData.countries} />
                  <Stat label="Opportunités" value={ftgData.opportunities} color="#C9A84C" />
                </div>
              )}
            </>) : <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Données non disponibles</div>}
          </Card>

          <Card title="Infrastructure VPS" icon="🖥️">
            {vps ? (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 6 }}>RAM</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: vps.ram.pct > 80 ? "#EF4444" : "#E8E0D0" }}>{vps.ram.used} <span style={{ fontSize: ".7rem", fontWeight: 400, color: "#5A6A7A" }}>/ {vps.ram.total} MB</span></div>
                  <ProgressBar pct={vps.ram.pct} color="#C9A84C" />
                  <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 4 }}>{vps.ram.pct}% utilisé · {vps.ram.available} MB dispo</div>
                </div>
                <div>
                  <div style={{ fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 6 }}>Disque</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: parseInt(vps.disk.pct) > 80 ? "#EF4444" : "#E8E0D0" }}>{vps.disk.used} <span style={{ fontSize: ".7rem", fontWeight: 400, color: "#5A6A7A" }}>/ {vps.disk.total}</span></div>
                  <ProgressBar pct={parseInt(vps.disk.pct)} color="#3B82F6" />
                  <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 4 }}>{vps.disk.pct} utilisé · {vps.disk.free} libre</div>
                </div>
              </div>
              <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 8 }}>Processus PM2</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {vps.pm2.map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)" }}>
                    <StatusDot up={p.status === "online"} />
                    <div style={{ flex: 1, fontSize: ".7rem", color: "#E8E0D0" }}>{p.name}</div>
                    <div style={{ fontSize: ".6rem", color: "#5A6A7A" }}>{p.memory} MB</div>
                    {p.restarts > 0 && <div style={{ fontSize: ".56rem", color: "#F59E0B", background: "rgba(245,158,11,.1)", padding: "1px 6px" }}>↺ {p.restarts}</div>}
                  </div>
                ))}
              </div>
            </>) : <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Données VPS non disponibles</div>}
          </Card>

          <Card title="The Estate" icon="🏨">
            {estate ? (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                <Stat label="Hôtels" value={estate.hotels} />
                <Stat label="Membres" value={estate.members} />
                <Stat label="Vouchers actifs" value={estate.vouchers.active} color="#10B981" sub={`/ ${estate.vouchers.total}`} />
                <Stat label="Alertes" value={estate.alerts.unread} color={estate.alerts.unread > 0 ? "#F59E0B" : "#10B981"} sub={`/ ${estate.alerts.total}`} />
              </div>
            </>) : <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Données non disponibles</div>}
          </Card>

          <Card title="Actions Rapides" icon="⚡">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 8 }}>PM2</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <ActionBtn label="Restart FTG" action="restart-ftg" onDone={showToast} />
                  <ActionBtn label="Restart CC" action="restart-cc" onDone={showToast} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 8 }}>Maintenance</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <ActionBtn label="Keepalive Supabase" action="keepalive-supabase" onDone={showToast} />
                  <ActionBtn label="Health Check" action="health-check" onDone={showToast} />
                </div>
              </div>
              {metrics?.lastHealthLog && (
                <div>
                  <div style={{ fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#5A6A7A", marginBottom: 6 }}>Dernier rapport santé</div>
                  <pre style={{ fontSize: ".6rem", color: "#9BA8B8", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)", padding: "8px 10px", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0, fontFamily: "monospace", maxHeight: 120, overflow: "auto" }}>{metrics.lastHealthLog}</pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
