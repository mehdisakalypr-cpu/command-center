"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────── */
interface RepoMeta { files: number; nodes: number; edges: number; communities: number; processes: number; }
interface MarkdownTable { markdown: string; row_count: number; }
interface RepoData {
  id: string; name: string; path: string; color: string; icon: string;
  meta: { stats: RepoMeta } | null;
  nodeTypes: MarkdownTable;
  relTypes: MarkdownTable;
  topFiles: MarkdownTable;
  imports: MarkdownTable;
  clusters: MarkdownTable;
  routes: MarkdownTable;
}

interface GraphNode { id: string; label: string; group: string; color: string; x: number; y: number; vx: number; vy: number; size: number; }
interface GraphEdge { source: string; target: string; }

/* ── Markdown table parser ───────────────────────────────── */
function parseTable(md: string): Record<string, string>[] {
  if (!md) return [];
  const lines = md.split("\n").filter(l => l.trim().startsWith("|"));
  if (lines.length < 3) return [];
  const headers = lines[0].split("|").map(s => s.trim()).filter(Boolean);
  return lines.slice(2).map(line => {
    const cells = line.split("|").map(s => s.trim()).filter(Boolean);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });
}

/* ── Force simulation ────────────────────────────────────── */
function useForceSimulation(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const nodesRef = useRef<GraphNode[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (nodes.length === 0) return;
    nodesRef.current = nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0, vy: 0,
    }));

    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
    let running = true;
    let frame = 0;

    function step() {
      if (!running) return;
      const ns = nodesRef.current;
      const alpha = Math.max(0.001, 0.3 * Math.pow(0.99, frame));

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = 800 / (dist * dist);
          ns[i].vx -= dx / dist * force * alpha;
          ns[i].vy -= dy / dist * force * alpha;
          ns[j].vx += dx / dist * force * alpha;
          ns[j].vy += dy / dist * force * alpha;
        }
      }

      // Attraction (edges)
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        let dx = t.x - s.x;
        let dy = t.y - s.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - 80) * 0.01 * alpha;
        s.vx += dx / dist * force;
        s.vy += dy / dist * force;
        t.vx -= dx / dist * force;
        t.vy -= dy / dist * force;
      }

      // Center gravity
      for (const n of ns) {
        n.vx += (width / 2 - n.x) * 0.001 * alpha;
        n.vy += (height / 2 - n.y) * 0.001 * alpha;
        n.vx *= 0.9; n.vy *= 0.9;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(20, Math.min(width - 20, n.x));
        n.y = Math.max(20, Math.min(height - 20, n.y));
      }

      frame++;
      if (frame % 3 === 0) setTick(t => t + 1);
      if (frame < 300) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return () => { running = false; };
  }, [nodes.length, edges.length, width, height]);

  return nodesRef.current;
}

/* ── Main Page ───────────────────────────────────────────── */
export default function CodeMapPage() {
  const [data, setData] = useState<RepoData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "graph" | "clusters" | "routes">("overview");

  useEffect(() => {
    fetch("/api/gitnexus")
      .then(r => r.json())
      .then(d => { setData(d.repos); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#030314", color: "#E8E0D0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚡</div>
        <p style={{ color: "#C9A84C", letterSpacing: ".15em", textTransform: "uppercase", fontSize: ".7rem" }}>Chargement des graphes GitNexus...</p>
      </div>
    </div>
  );

  if (!data) return <div style={{ minHeight: "100vh", background: "#030314", color: "#EF4444", padding: 40 }}>Erreur chargement GitNexus</div>;

  const activeRepo = selectedRepo ? data.find(r => r.id === selectedRepo) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#030314", color: "#E8E0D0" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(201,168,76,.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" style={{ color: "#C9A84C", textDecoration: "none", fontSize: ".7rem" }}>← Dashboard</Link>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Code Architecture Map</h1>
          <span style={{ fontSize: ".6rem", color: "#5A6A7A", background: "rgba(201,168,76,.1)", padding: "2px 8px", borderRadius: 4 }}>GitNexus</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["overview", "graph", "clusters", "routes"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "5px 12px", fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".1em",
              background: view === v ? "rgba(201,168,76,.2)" : "rgba(255,255,255,.05)",
              border: `1px solid ${view === v ? "rgba(201,168,76,.4)" : "rgba(255,255,255,.1)"}`,
              color: view === v ? "#C9A84C" : "#9BA8B8", cursor: "pointer", fontFamily: "inherit",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Repo selector */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setSelectedRepo(null)} style={{
          padding: "6px 14px", fontSize: ".65rem", background: !selectedRepo ? "rgba(201,168,76,.2)" : "rgba(255,255,255,.05)",
          border: `1px solid ${!selectedRepo ? "rgba(201,168,76,.4)" : "rgba(255,255,255,.1)"}`,
          color: !selectedRepo ? "#C9A84C" : "#9BA8B8", cursor: "pointer", fontFamily: "inherit",
        }}>Tous les projets</button>
        {data.map(r => (
          <button key={r.id} onClick={() => setSelectedRepo(r.id)} style={{
            padding: "6px 14px", fontSize: ".65rem",
            background: selectedRepo === r.id ? `${r.color}22` : "rgba(255,255,255,.05)",
            border: `1px solid ${selectedRepo === r.id ? `${r.color}66` : "rgba(255,255,255,.1)"}`,
            color: selectedRepo === r.id ? r.color : "#9BA8B8", cursor: "pointer", fontFamily: "inherit",
          }}>{r.icon} {r.name}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0 24px 40px" }}>
        {view === "overview" && <OverviewView repos={selectedRepo ? data.filter(r => r.id === selectedRepo) : data} />}
        {view === "graph" && <GraphView repo={activeRepo || data[0]} />}
        {view === "clusters" && <ClustersView repos={selectedRepo ? data.filter(r => r.id === selectedRepo) : data} />}
        {view === "routes" && <RoutesView repos={selectedRepo ? data.filter(r => r.id === selectedRepo) : data} />}
      </div>
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────── */
function OverviewView({ repos }: { repos: RepoData[] }) {
  const totalNodes = repos.reduce((s, r) => s + (r.meta?.stats.nodes || 0), 0);
  const totalEdges = repos.reduce((s, r) => s + (r.meta?.stats.edges || 0), 0);
  const totalFiles = repos.reduce((s, r) => s + (r.meta?.stats.files || 0), 0);
  const totalClusters = repos.reduce((s, r) => s + (r.meta?.stats.communities || 0), 0);

  return (
    <div>
      {/* Global stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatBox label="Total Fichiers" value={totalFiles} color="#C9A84C" />
        <StatBox label="Total Symboles" value={totalNodes} color="#60A5FA" />
        <StatBox label="Total Relations" value={totalEdges} color="#A78BFA" />
        <StatBox label="Total Clusters" value={totalClusters} color="#22C55E" />
        <StatBox label="Projets" value={repos.length} color="#F59E0B" />
      </div>

      {/* Per-repo cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {repos.map(r => (
          <div key={r.id} style={{ background: "#0A1A2E", border: `1px solid ${r.color}33`, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: "1.4rem" }}>{r.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: r.color }}>{r.name}</div>
                <div style={{ fontSize: ".6rem", color: "#5A6A7A" }}>{r.path}</div>
              </div>
            </div>

            {r.meta && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                <MiniStat label="Files" value={r.meta.stats.files} />
                <MiniStat label="Symbols" value={r.meta.stats.nodes} />
                <MiniStat label="Edges" value={r.meta.stats.edges} />
                <MiniStat label="Clusters" value={r.meta.stats.communities} />
                <MiniStat label="Flows" value={r.meta.stats.processes} />
              </div>
            )}

            {/* Node types */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: ".6rem", color: "#5A6A7A", textTransform: "uppercase", marginBottom: 6 }}>Node Types</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {parseTable(r.nodeTypes.markdown).map((row, i) => (
                  <span key={i} style={{ fontSize: ".6rem", padding: "2px 6px", background: `${r.color}15`, border: `1px solid ${r.color}33`, color: r.color }}>
                    {row.type} ({row.cnt})
                  </span>
                ))}
              </div>
            </div>

            {/* Relation types */}
            <div>
              <div style={{ fontSize: ".6rem", color: "#5A6A7A", textTransform: "uppercase", marginBottom: 6 }}>Relations</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {parseTable(r.relTypes.markdown).map((row, i) => (
                  <span key={i} style={{ fontSize: ".55rem", padding: "2px 6px", background: "rgba(255,255,255,.05)", color: "#9BA8B8" }}>
                    {row.relType} ({row.cnt})
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Interactive Graph ───────────────────────────────────── */
function GraphView({ repo }: { repo: RepoData }) {
  const W = 900, H = 550;
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build graph from imports
  const imports = parseTable(repo.imports.markdown);
  const nodeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const row of imports) {
    if (row.source && row.target) {
      const s = row.source.split("/").pop() || row.source;
      const t = row.target.split("/").pop() || row.target;
      nodeSet.add(s); nodeSet.add(t);
      edges.push({ source: s, target: t });
    }
  }

  const connectionCount = new Map<string, number>();
  edges.forEach(e => {
    connectionCount.set(e.source, (connectionCount.get(e.source) || 0) + 1);
    connectionCount.set(e.target, (connectionCount.get(e.target) || 0) + 1);
  });

  const initialNodes: GraphNode[] = [...nodeSet].map(id => ({
    id, label: id, group: repo.id, color: repo.color,
    x: W / 2, y: H / 2, vx: 0, vy: 0,
    size: Math.max(4, Math.min(14, (connectionCount.get(id) || 1) * 2)),
  }));

  const simNodes = useForceSimulation(initialNodes, edges, W, H);
  const nodeMap = new Map(simNodes.map(n => [n.id, n]));

  return (
    <div>
      <div style={{ fontSize: ".7rem", color: "#5A6A7A", marginBottom: 8 }}>
        {repo.icon} {repo.name} — Import Graph ({nodeSet.size} files, {edges.length} imports)
      </div>
      <div style={{ background: "#050A15", border: "1px solid rgba(201,168,76,.15)", overflow: "hidden", position: "relative" }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
          {/* Edges */}
          {edges.map((e, i) => {
            const s = nodeMap.get(e.source);
            const t = nodeMap.get(e.target);
            if (!s || !t) return null;
            return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={`${repo.color}30`} strokeWidth={0.5} />;
          })}
          {/* Nodes */}
          {simNodes.map(n => (
            <g key={n.id} onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)}>
              <circle cx={n.x} cy={n.y} r={hoveredNode === n.id ? n.size + 3 : n.size}
                fill={hoveredNode === n.id ? n.color : `${n.color}88`}
                stroke={n.color} strokeWidth={hoveredNode === n.id ? 2 : 0.5} style={{ cursor: "pointer", transition: "r .15s" }} />
              {(hoveredNode === n.id || n.size > 8) && (
                <text x={n.x} y={n.y - n.size - 4} textAnchor="middle" fill="#E8E0D0" fontSize={9} fontFamily="monospace">
                  {n.label}
                </text>
              )}
            </g>
          ))}
        </svg>
        {/* Legend */}
        {hoveredNode && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#0A1A2E", border: `1px solid ${repo.color}44`, padding: "6px 10px", fontSize: ".65rem" }}>
            <span style={{ color: repo.color }}>{hoveredNode}</span>
            <span style={{ color: "#5A6A7A", marginLeft: 8 }}>{connectionCount.get(hoveredNode) || 0} connections</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Clusters ────────────────────────────────────────────── */
function ClustersView({ repos }: { repos: RepoData[] }) {
  return (
    <div>
      <div style={{ fontSize: ".7rem", color: "#5A6A7A", marginBottom: 16 }}>
        Code communities detected by GitNexus (Louvain clustering on dependency graph)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {repos.map(r => {
          const clusters = parseTable(r.clusters.markdown);
          return (
            <div key={r.id} style={{ background: "#0A1A2E", border: `1px solid ${r.color}33`, padding: 20 }}>
              <div style={{ fontSize: ".65rem", color: r.color, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 12 }}>
                {r.icon} {r.name} — {clusters.length} clusters
              </div>
              {clusters.length === 0 ? (
                <div style={{ fontSize: ".65rem", color: "#5A6A7A" }}>No clusters detected</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {clusters.map((c, i) => {
                    const maxSize = Math.max(...clusters.map(cl => parseInt(cl.size) || 1));
                    const size = parseInt(c.size) || 1;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: ".6rem", color: "#9BA8B8", width: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.05)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(size / maxSize) * 100}%`, background: r.color, borderRadius: 3, transition: "width .3s" }} />
                        </div>
                        <span style={{ fontSize: ".55rem", color: "#5A6A7A", width: 24, textAlign: "right" }}>{c.size}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Routes ──────────────────────────────────────────────── */
function RoutesView({ repos }: { repos: RepoData[] }) {
  return (
    <div>
      <div style={{ fontSize: ".7rem", color: "#5A6A7A", marginBottom: 16 }}>
        API routes and page routes detected across all projects
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {repos.map(r => {
          const routes = parseTable(r.routes.markdown);
          return (
            <div key={r.id} style={{ background: "#0A1A2E", border: `1px solid ${r.color}33`, padding: 20 }}>
              <div style={{ fontSize: ".65rem", color: r.color, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 12 }}>
                {r.icon} {r.name} — {routes.length} routes
              </div>
              {routes.length === 0 ? (
                <div style={{ fontSize: ".65rem", color: "#5A6A7A" }}>No routes detected</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 300, overflowY: "auto" }}>
                  {routes.map((rt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                      {rt.method && (
                        <span style={{
                          fontSize: ".5rem", fontWeight: 700, padding: "1px 5px", borderRadius: 2, fontFamily: "monospace",
                          background: rt.method === "GET" ? "#22C55E22" : rt.method === "POST" ? "#3B82F622" : "#F59E0B22",
                          color: rt.method === "GET" ? "#22C55E" : rt.method === "POST" ? "#3B82F6" : "#F59E0B",
                        }}>{rt.method}</span>
                      )}
                      <span style={{ fontSize: ".6rem", color: "#E8E0D0", fontFamily: "monospace" }}>{rt.path}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Shared components ───────────────────────────────────── */
function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#0A1A2E", border: "1px solid rgba(201,168,76,.1)", padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: ".6rem", color: "#5A6A7A", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center", padding: "6px 4px", background: "rgba(255,255,255,.03)", borderRadius: 4 }}>
      <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#E8E0D0" }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: ".5rem", color: "#5A6A7A" }}>{label}</div>
    </div>
  );
}
