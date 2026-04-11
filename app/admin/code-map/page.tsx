"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────── */
interface RepoMeta { files: number; nodes: number; edges: number; communities: number; processes: number; }
interface MarkdownTable { markdown: string; row_count: number; }
interface RepoData {
  id: string; name: string; path: string; color: string; icon: string;
  meta: { stats: RepoMeta } | null;
  nodeTypes: MarkdownTable; relTypes: MarkdownTable; topFiles: MarkdownTable;
  imports: MarkdownTable; calls: MarkdownTable; clusters: MarkdownTable;
  routes: MarkdownTable; functions: MarkdownTable;
}

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

/* ── Graph types ─────────────────────────────────────────── */
type GNode = { id: string; label: string; color: string; x: number; y: number; vx: number; vy: number; size: number; repo: string; }
type GEdge = { source: string; target: string; color: string; }

/* ── Force-directed graph on Canvas ──────────────────────── */
function ForceGraph({ nodes: initNodes, edges, width, height, title }: {
  nodes: GNode[]; edges: GEdge[]; width: number; height: number; title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GNode[]>([]);
  const hoverRef = useRef<string | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    if (initNodes.length === 0) return;

    // Initialize positions in a circle layout per repo
    const repoGroups = new Map<string, number>();
    let gi = 0;
    initNodes.forEach(n => { if (!repoGroups.has(n.repo)) repoGroups.set(n.repo, gi++); });
    const groupCount = repoGroups.size;

    nodesRef.current = initNodes.map((n, i) => {
      const groupIdx = repoGroups.get(n.repo) || 0;
      const angle = (groupIdx / groupCount) * Math.PI * 2;
      const groupCx = width / 2 + Math.cos(angle) * (width * 0.25);
      const groupCy = height / 2 + Math.sin(angle) * (height * 0.25);
      return {
        ...n,
        x: groupCx + (Math.random() - 0.5) * 120,
        y: groupCy + (Math.random() - 0.5) * 120,
        vx: 0, vy: 0,
      };
    });

    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
    let running = true;
    frameRef.current = 0;

    function simulate() {
      if (!running) return;
      const ns = nodesRef.current;
      const frame = frameRef.current++;
      const alpha = Math.max(0.001, 0.4 * Math.pow(0.995, frame));

      // Repulsion (Barnes-Hut approximation - just do N^2 for < 500 nodes)
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = 600 / (dist * dist) * alpha;
          ns[i].vx -= dx / dist * force;
          ns[i].vy -= dy / dist * force;
          ns[j].vx += dx / dist * force;
          ns[j].vy += dy / dist * force;
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
        let force = (dist - 60) * 0.008 * alpha;
        s.vx += dx / dist * force;
        s.vy += dy / dist * force;
        t.vx -= dx / dist * force;
        t.vy -= dy / dist * force;
      }

      // Center + damping
      for (const n of ns) {
        n.vx += (width / 2 - n.x) * 0.0008 * alpha;
        n.vy += (height / 2 - n.y) * 0.0008 * alpha;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(15, Math.min(width - 15, n.x));
        n.y = Math.max(15, Math.min(height - 15, n.y));
      }

      draw();
      if (frame < 500) requestAnimationFrame(simulate);
    }

    function draw() {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const ns = nodesRef.current;
      const hov = hoverRef.current;

      ctx.clearRect(0, 0, width, height);

      // Edges
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const isHovered = hov === s.id || hov === t.id;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHovered ? e.color + "AA" : e.color + "25";
        ctx.lineWidth = isHovered ? 1.5 : 0.4;
        ctx.stroke();
      }

      // Nodes
      for (const n of ns) {
        const isHovered = hov === n.id;
        ctx.beginPath();
        ctx.arc(n.x, n.y, isHovered ? n.size + 3 : n.size, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? n.color : n.color + "BB";
        ctx.fill();
        if (isHovered) {
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Labels for hovered or large nodes
        if (isHovered || n.size > 7) {
          ctx.font = `${isHovered ? 11 : 9}px monospace`;
          ctx.fillStyle = "#E8E0D0";
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y - n.size - 5);
        }
      }

      // Title
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.fillStyle = "#5A6A7A";
      ctx.textAlign = "left";
      ctx.fillText(title, 12, 20);

      // Hovered info
      if (hov) {
        const hn = nodeMap.get(hov);
        if (hn) {
          const connCount = edges.filter(e => e.source === hov || e.target === hov).length;
          ctx.font = "11px monospace";
          ctx.fillStyle = hn.color;
          ctx.textAlign = "right";
          ctx.fillText(`${hn.label} — ${connCount} connections`, width - 12, 20);
        }
      }
    }

    requestAnimationFrame(simulate);
    return () => { running = false; };
  }, [initNodes.length, edges.length, width, height, title]);

  // Mouse hover detection
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) * (width / rect.width);
    const my = (e.clientY - rect.top) * (height / rect.height);
    let closest: string | null = null;
    let minDist = 20;
    for (const n of nodesRef.current) {
      const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
      if (d < minDist) { minDist = d; closest = n.id; }
    }
    if (hoverRef.current !== closest) {
      hoverRef.current = closest;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        // Redraw on hover change
        const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
        ctx.clearRect(0, 0, width, height);
        for (const ed of edges) {
          const s = nodeMap.get(ed.source); const t = nodeMap.get(ed.target);
          if (!s || !t) continue;
          const isH = closest === s.id || closest === t.id;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
          ctx.strokeStyle = isH ? ed.color + "AA" : ed.color + "25";
          ctx.lineWidth = isH ? 1.5 : 0.4; ctx.stroke();
        }
        for (const n of nodesRef.current) {
          const isH = closest === n.id;
          ctx.beginPath(); ctx.arc(n.x, n.y, isH ? n.size + 3 : n.size, 0, Math.PI * 2);
          ctx.fillStyle = isH ? n.color : n.color + "BB"; ctx.fill();
          if (isH) { ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.stroke(); }
          if (isH || n.size > 7) {
            ctx.font = `${isH ? 11 : 9}px monospace`; ctx.fillStyle = "#E8E0D0";
            ctx.textAlign = "center"; ctx.fillText(n.label, n.x, n.y - n.size - 5);
          }
        }
        ctx.font = "bold 13px Inter, sans-serif"; ctx.fillStyle = "#5A6A7A";
        ctx.textAlign = "left"; ctx.fillText(title, 12, 20);
        if (closest) {
          const hn = nodeMap.get(closest);
          if (hn) {
            const cc = edges.filter(ed => ed.source === closest || ed.target === closest).length;
            ctx.font = "11px monospace"; ctx.fillStyle = hn.color;
            ctx.textAlign = "right"; ctx.fillText(`${hn.label} — ${cc} connections`, width - 12, 20);
          }
        }
      }
    }
  }

  return (
    <canvas
      ref={canvasRef} width={width} height={height}
      onMouseMove={handleMouseMove}
      style={{ display: "block", width: "100%", height: "auto", background: "#050A15", border: "1px solid rgba(201,168,76,.15)", cursor: "crosshair" }}
    />
  );
}

/* ── Build graph data from repo ──────────────────────────── */
function buildGraphData(repo: RepoData): { nodes: GNode[]; edges: GEdge[] } {
  const nodeMap = new Map<string, GNode>();
  const edgeList: GEdge[] = [];

  // Parse imports
  const imports = parseTable(repo.imports?.markdown || "");
  for (const row of imports) {
    const src = row.source?.split("/").pop() || row.source;
    const tgt = row.target?.split("/").pop() || row.target;
    if (!src || !tgt) continue;
    if (!nodeMap.has(src)) nodeMap.set(src, { id: src, label: src, color: repo.color, x: 0, y: 0, vx: 0, vy: 0, size: 4, repo: repo.id });
    if (!nodeMap.has(tgt)) nodeMap.set(tgt, { id: tgt, label: tgt, color: repo.color, x: 0, y: 0, vx: 0, vy: 0, size: 4, repo: repo.id });
    nodeMap.get(src)!.size = Math.min(14, nodeMap.get(src)!.size + 1);
    nodeMap.get(tgt)!.size = Math.min(14, nodeMap.get(tgt)!.size + 1);
    edgeList.push({ source: src, target: tgt, color: repo.color });
  }

  // Parse function calls
  const calls = parseTable(repo.calls?.markdown || "");
  for (const row of calls) {
    const src = row.source; const tgt = row.target;
    if (!src || !tgt || src === tgt) continue;
    const srcId = `fn:${src}`; const tgtId = `fn:${tgt}`;
    if (!nodeMap.has(srcId)) nodeMap.set(srcId, { id: srcId, label: src, color: repo.color + "99", x: 0, y: 0, vx: 0, vy: 0, size: 3, repo: repo.id });
    if (!nodeMap.has(tgtId)) nodeMap.set(tgtId, { id: tgtId, label: tgt, color: repo.color + "99", x: 0, y: 0, vx: 0, vy: 0, size: 3, repo: repo.id });
    nodeMap.get(srcId)!.size = Math.min(12, nodeMap.get(srcId)!.size + 0.5);
    nodeMap.get(tgtId)!.size = Math.min(12, nodeMap.get(tgtId)!.size + 0.5);
    edgeList.push({ source: srcId, target: tgtId, color: repo.color + "60" });
  }

  return { nodes: [...nodeMap.values()], edges: edgeList };
}

/* ── Multi-repo graph ────────────────────────────────────── */
function buildMultiRepoGraph(repos: RepoData[]): { nodes: GNode[]; edges: GEdge[] } {
  const allNodes: GNode[] = [];
  const allEdges: GEdge[] = [];
  for (const r of repos) {
    const { nodes, edges } = buildGraphData(r);
    // Prefix IDs to avoid collisions
    const prefixed = nodes.map(n => ({ ...n, id: `${r.id}:${n.id}` }));
    const prefEdges = edges.map(e => ({ ...e, source: `${r.id}:${e.source}`, target: `${r.id}:${e.target}` }));
    allNodes.push(...prefixed);
    allEdges.push(...prefEdges);
  }
  return { nodes: allNodes, edges: allEdges };
}

/* ── Main Page ───────────────────────────────────────────── */
export default function CodeMapPage() {
  const [data, setData] = useState<RepoData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gitnexus")
      .then(r => r.json())
      .then(d => { setData(d.repos); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#040D1C", color: "#E8E0D0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12, animation: "pulse 1.5s infinite" }}>⚡</div>
        <p style={{ color: "#C9A84C", letterSpacing: ".15em", textTransform: "uppercase", fontSize: ".7rem" }}>Analyse des graphes GitNexus...</p>
      </div>
    </div>
  );

  if (!data || data.length === 0) return (
    <div style={{ padding: 40, color: "#EF4444" }}>Erreur: aucun repo indexe. Lancez `gitnexus analyze` sur vos projets.</div>
  );

  const activeRepos = selectedRepo ? data.filter(r => r.id === selectedRepo) : data;
  const graphData = selectedRepo
    ? buildGraphData(data.find(r => r.id === selectedRepo)!)
    : buildMultiRepoGraph(data);

  const totalNodes = data.reduce((s, r) => s + (r.meta?.stats.nodes || 0), 0);
  const totalEdges = data.reduce((s, r) => s + (r.meta?.stats.edges || 0), 0);
  const totalFiles = data.reduce((s, r) => s + (r.meta?.stats.files || 0), 0);

  return (
    <div style={{ padding: 24, color: "#E8E0D0" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: 0, color: "#E8E0D0" }}>
          Code Architecture Map
        </h1>
        <p style={{ fontSize: ".7rem", color: "#5A6A7A", marginTop: 4 }}>
          {totalFiles} fichiers · {totalNodes.toLocaleString()} symboles · {totalEdges.toLocaleString()} relations · GitNexus
        </p>
      </div>

      {/* Repo selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setSelectedRepo(null)} style={{
          padding: "6px 14px", fontSize: ".65rem", fontFamily: "inherit",
          background: !selectedRepo ? "rgba(201,168,76,.2)" : "rgba(255,255,255,.05)",
          border: `1px solid ${!selectedRepo ? "rgba(201,168,76,.4)" : "rgba(255,255,255,.1)"}`,
          color: !selectedRepo ? "#C9A84C" : "#9BA8B8", cursor: "pointer",
        }}>Tous ({graphData.nodes.length} noeuds)</button>
        {data.map(r => (
          <button key={r.id} onClick={() => setSelectedRepo(r.id)} style={{
            padding: "6px 14px", fontSize: ".65rem", fontFamily: "inherit",
            background: selectedRepo === r.id ? `${r.color}22` : "rgba(255,255,255,.05)",
            border: `1px solid ${selectedRepo === r.id ? `${r.color}66` : "rgba(255,255,255,.1)"}`,
            color: selectedRepo === r.id ? r.color : "#9BA8B8", cursor: "pointer",
          }}>{r.icon} {r.name} ({r.meta?.stats.nodes || 0})</button>
        ))}
      </div>

      {/* MAIN GRAPH — always visible */}
      <ForceGraph
        nodes={graphData.nodes}
        edges={graphData.edges}
        width={1100}
        height={650}
        title={selectedRepo ? `${activeRepos[0]?.icon} ${activeRepos[0]?.name} — Imports & Calls` : "All Projects — File Dependencies"}
      />

      {/* Stats + clusters below */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 20 }}>
        {activeRepos.map(r => {
          const clusters = parseTable(r.clusters?.markdown || "");
          const routes = parseTable(r.routes?.markdown || "");
          const topFiles = parseTable(r.topFiles?.markdown || "");
          return (
            <div key={r.id} style={{ background: "#0A1A2E", border: `1px solid ${r.color}33`, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: "1.2rem" }}>{r.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: r.color, fontSize: ".85rem" }}>{r.name}</div>
                  <div style={{ fontSize: ".55rem", color: "#5A6A7A" }}>{r.path}</div>
                </div>
              </div>

              {r.meta && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 12 }}>
                  {[
                    { l: "Files", v: r.meta.stats.files },
                    { l: "Symbols", v: r.meta.stats.nodes },
                    { l: "Edges", v: r.meta.stats.edges },
                    { l: "Clusters", v: r.meta.stats.communities },
                    { l: "Flows", v: r.meta.stats.processes },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: "center", padding: "4px 2px", background: "rgba(255,255,255,.03)", borderRadius: 3 }}>
                      <div style={{ fontSize: ".8rem", fontWeight: 700, color: "#E8E0D0" }}>{s.v}</div>
                      <div style={{ fontSize: ".45rem", color: "#5A6A7A" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top connected files */}
              {topFiles.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: ".55rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Hub files</div>
                  {topFiles.slice(0, 6).map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: ".6rem", padding: "2px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                      <span style={{ color: "#E8E0D0", fontFamily: "monospace" }}>{f.path?.split("/").pop()}</span>
                      <span style={{ color: r.color }}>{f.connections} links</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Clusters */}
              {clusters.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: ".55rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Clusters</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {clusters.slice(0, 8).map((c, i) => (
                      <span key={i} style={{ fontSize: ".5rem", padding: "2px 5px", background: `${r.color}15`, border: `1px solid ${r.color}30`, color: r.color }}>
                        {c.name} ({c.size})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Routes */}
              {routes.length > 0 && (
                <div>
                  <div style={{ fontSize: ".55rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Routes ({routes.length})</div>
                  <div style={{ maxHeight: 100, overflowY: "auto" }}>
                    {routes.slice(0, 12).map((rt, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".55rem", padding: "1px 0" }}>
                        {rt.method && (
                          <span style={{
                            fontSize: ".45rem", fontWeight: 700, padding: "0 4px", fontFamily: "monospace",
                            background: rt.method === "GET" ? "#22C55E18" : "#3B82F618",
                            color: rt.method === "GET" ? "#22C55E" : "#3B82F6",
                          }}>{rt.method}</span>
                        )}
                        <span style={{ color: "#9BA8B8", fontFamily: "monospace" }}>{rt.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: "flex", gap: 16, justifyContent: "center" }}>
        {data.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".6rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
            <span style={{ color: "#9BA8B8" }}>{r.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
