"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Message { role: "user" | "model"; content: string; }

export default function GeminiPage() {
  const [apiKey,      setApiKey]      = useState("");
  const [savedKey,    setSavedKey]    = useState(() => {
    try { return localStorage.getItem("gemini_api_key") ?? ""; } catch { return ""; }
  });
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [showKeyEdit, setShowKeyEdit] = useState(false);
  const [streamText,  setStreamText]  = useState("");
  const convRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (convRef.current) convRef.current.scrollTop = convRef.current.scrollHeight;
  }, [messages, streamText]);

  const saveKey = () => {
    const k = apiKey.trim();
    if (!k) return;
    localStorage.setItem("gemini_api_key", k);
    setSavedKey(k);
    setApiKey("");
    setShowKeyEdit(false);
  };

  const send = useCallback(async () => {
    if (!input.trim() || loading || !savedKey) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);
    setStreamText("");

    try {
      const history = newMsgs.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=" + savedKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...history,
            { role: "user", parts: [{ text: userMsg.content }] },
          ],
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = err?.error?.message ?? `Erreur ${res.status}`;
        setMessages(prev => [...prev, { role: "model", content: `❌ ${msg}` }]);
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            full += text;
            setStreamText(full);
          } catch { /* skip */ }
        }
      }
      setMessages(prev => [...prev, { role: "model", content: full || "…" }]);
      setStreamText("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      setMessages(prev => [...prev, { role: "model", content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, savedKey, messages]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#030314",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes fade-up { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-g { 0%,100% { opacity:.6; } 50% { opacity:1; } }
        .msg { animation: fade-up .22s ease; }
        * { -webkit-tap-highlight-color: transparent; }
        textarea { resize: none; }
        textarea:focus { outline: none; }
        input:focus { outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,.06)", padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.5)", textDecoration: "none", fontSize: 14 }}>
              ←
            </Link>
            {/* Gemini logo */}
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff" }}>G</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)", letterSpacing: ".05em" }}>GEMINI PRO</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".08em" }}>Google AI · gemini-2.0-flash</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setStreamText(""); }} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "5px 11px", color: "rgba(255,255,255,.4)", fontSize: 11, cursor: "pointer" }}>
                ✕
              </button>
            )}
            <button onClick={() => setShowKeyEdit(v => !v)} title="Clé API"
              style={{ background: savedKey ? "rgba(66,133,244,.15)" : "rgba(234,67,53,.15)", border: `1px solid ${savedKey ? "rgba(66,133,244,.4)" : "rgba(234,67,53,.4)"}`, borderRadius: 8, padding: "5px 10px", color: savedKey ? "rgba(66,133,244,.9)" : "rgba(234,67,53,.9)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              {savedKey ? "🔑 API" : "⚠ Clé"}
            </button>
          </div>
        </div>
      </div>

      {/* API key setup */}
      {(!savedKey || showKeyEdit) && (
        <div style={{ flexShrink: 0, margin: "12px 16px 0", background: "rgba(66,133,244,.08)", border: "1px solid rgba(66,133,244,.25)", borderRadius: 12, padding: "14px" }}>
          <div style={{ fontSize: 12, color: "rgba(66,133,244,.9)", fontWeight: 700, marginBottom: 6, letterSpacing: ".06em" }}>
            {savedKey ? "MODIFIER LA CLÉ API" : "CONNEXION GEMINI"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 10, lineHeight: 1.5 }}>
            Obtiens une clé gratuite sur <span style={{ color: "rgba(66,133,244,.8)" }}>aistudio.google.com</span> → Get API Key.<br/>
            Elle est stockée uniquement dans ton navigateur.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveKey()}
              placeholder="AIza…"
              style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#fff", fontFamily: "monospace" }}
            />
            <button onClick={saveKey} disabled={!apiKey.trim()}
              style={{ background: "linear-gradient(135deg,#4285F4,#0F9D58)", border: "none", borderRadius: 8, padding: "0 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: apiKey.trim() ? "pointer" : "default", opacity: apiKey.trim() ? 1 : 0.4 }}>
              Sauver
            </button>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div ref={convRef} style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && !streamText && savedKey && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,.15)", fontSize: 13, marginTop: 40, lineHeight: 2 }}>
            <div style={{ fontSize: 40, marginBottom: 8, animation: "pulse-g 2.5s ease-in-out infinite" }}>✦</div>
            Démarre une conversation avec Gemini
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "model" && (
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff", flexShrink: 0, marginRight: 7, marginTop: 2 }}>G</div>
            )}
            <div style={{
              maxWidth: "80%", padding: "10px 14px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? "linear-gradient(135deg,rgba(66,133,244,.4),rgba(15,157,88,.3))" : "rgba(255,255,255,.06)",
              border: `1px solid ${m.role === "user" ? "rgba(66,133,244,.3)" : "rgba(255,255,255,.08)"}`,
              fontSize: 14, color: "#e2e8f0", lineHeight: 1.6,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {streamText && (
          <div className="msg" style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff", flexShrink: 0, marginRight: 7, marginTop: 2 }}>G</div>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(66,133,244,.2)", fontSize: 14, color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {streamText}
              <span style={{ display: "inline-block", width: 2, height: 13, background: "rgba(66,133,244,.8)", marginLeft: 2, verticalAlign: "middle", animation: "pulse-g .6s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {loading && !streamText && (
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 7, alignItems: "center" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff" }}>G</div>
            <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "rgba(255,255,255,.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)" }}>
              {[0, .2, .4].map(d => (
                <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(66,133,244,.7)", animation: `pulse-g .9s ease-in-out infinite ${d}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: "10px 16px 20px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={savedKey ? "Message à Gemini… (Shift+Entrée pour saut de ligne)" : "Configure d'abord ta clé API Gemini ↑"}
            disabled={!savedKey || loading}
            rows={1}
            style={{
              flex: 1, background: "rgba(15,15,40,.95)", border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#fff",
              fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
              opacity: savedKey ? 1 : 0.5,
            }}
          />
          <button onClick={send} disabled={!input.trim() || loading || !savedKey}
            style={{
              background: "linear-gradient(135deg,#4285F4,#0F9D58)",
              border: "none", borderRadius: 12, padding: "12px 18px",
              color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
              opacity: (input.trim() && !loading && savedKey) ? 1 : 0.35,
              transition: "opacity .2s",
            }}>
            →
          </button>
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)", textAlign: "center", marginTop: 6 }}>
          gemini-2.0-flash · clé stockée localement
        </div>
      </div>
    </div>
  );
}
