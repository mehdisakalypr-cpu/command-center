"use client";
import { useEffect, useRef, useState, use } from "react";

type LogEntry = { kind: "text" | "tool" | "status" | "usage" | "err"; content: string; ts: string };
const C = { bg: "#040D1C", card: "#0A1A2E", gold: "#C9A84C", text: "#E8E0D0", muted: "#9BA8B8", border: "1px solid rgba(201,168,76,.15)" };

export default function MinatoSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<"connecting" | "streaming" | "idle" | "terminated" | "error">("connecting");
  const logsRef = useRef<HTMLDivElement>(null);
  const totalTokens = useRef<{ in: number; out: number; cache: number }>({ in: 0, out: 0, cache: 0 });
  const [tokens, setTokens] = useState({ in: 0, out: 0, cache: 0 });

  useEffect(() => {
    const push = (e: LogEntry) => setLogs((prev) => [...prev, e]);
    const es = new EventSource(`/api/minato/session/${id}/stream`);
    setStatus("streaming");
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        const ts = new Date().toISOString().slice(11, 19);
        if (event.type === "agent.message") {
          const content = (event.content || []) as { type: string; text?: string }[];
          for (const b of content) if (b.type === "text" && b.text) push({ kind: "text", content: b.text, ts });
        } else if (event.type === "agent.custom_tool_use") {
          push({ kind: "tool", content: `🔧 ${event.tool_name}(${JSON.stringify(event.input).slice(0, 200)})`, ts });
        } else if (event.type === "span.model_request_end" && event.model_usage) {
          const u = event.model_usage;
          totalTokens.current.in += u.input_tokens || 0;
          totalTokens.current.out += u.output_tokens || 0;
          totalTokens.current.cache += u.cache_read_input_tokens || 0;
          setTokens({ ...totalTokens.current });
        } else if (event.type === "session.status_idle") {
          const sr = event.stop_reason?.type;
          push({ kind: "status", content: `✅ idle · ${sr || "end_turn"}`, ts });
          if (sr !== "requires_action") setStatus("idle");
        } else if (event.type === "session.status_terminated") {
          push({ kind: "status", content: "🛑 terminated", ts });
          setStatus("terminated");
          es.close();
        }
      } catch { /* partial */ }
    };
    es.onerror = () => { setStatus("error"); es.close(); };
    return () => es.close();
  }, [id]);

  useEffect(() => { logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight }); }, [logs]);

  const estCost = (tokens.in * 5 + tokens.out * 25) / 1_000_000;
  const statusColor = status === "streaming" ? "#6BCB77" : status === "idle" ? C.gold : status === "terminated" ? "#FF6B6B" : C.muted;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: 24, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ color: C.gold, fontSize: 22, margin: 0 }}>⚡ Session Minato</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12, color: C.muted }}>
            <span>🎯 <b style={{ color: C.text }}>{id}</b></span>
            <span style={{ color: statusColor, fontWeight: 600 }}>● {status}</span>
            <span>📥 {tokens.in.toLocaleString()} in</span>
            <span>📤 {tokens.out.toLocaleString()} out</span>
            <span>💾 {tokens.cache.toLocaleString()} cache</span>
            <span style={{ color: C.gold }}>≈ ${estCost.toFixed(4)}</span>
          </div>
        </div>
        <div ref={logsRef} style={{ background: C.card, border: C.border, borderRadius: 8, padding: 16, height: "72vh", overflow: "auto", fontFamily: "Menlo,monospace", fontSize: 12, lineHeight: 1.55 }}>
          {logs.length === 0 && <div style={{ color: C.muted }}>En attente d'événements...</div>}
          {logs.map((l, i) => (
            <div key={i} style={{ marginBottom: 6, color: l.kind === "tool" ? C.gold : l.kind === "status" ? "#6BCB77" : l.kind === "err" ? "#FF6B6B" : C.text, whiteSpace: "pre-wrap" }}>
              <span style={{ color: C.muted, marginRight: 8 }}>{l.ts}</span>{l.content}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <a href="/admin/minato" style={{ color: C.gold, textDecoration: "none", fontSize: 13 }}>← Retour à la doc Minato</a>
        </div>
      </div>
    </div>
  );
}
