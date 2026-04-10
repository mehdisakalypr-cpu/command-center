"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Mode = "idle" | "listening" | "thinking" | "speaking";
interface Message { role: "user" | "assistant"; content: string; bridge?: boolean; bridgeType?: string; }

/* ── Detect best audio MIME type for MediaRecorder ── */
function bestMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? "";
}

/* ── Bridge message formatter ── */
interface BridgePayload { type?: string; text?: string; eta?: string; needs_validation?: boolean; }

function formatBridgeMsg(raw: string): { speech: string; display: string; needsValidation: boolean } {
  try {
    const p: BridgePayload = JSON.parse(raw);
    const t = p.text ?? "";
    switch (p.type) {
      case "received":
        return { speech: `Claude a bien reçu ta requête.${t ? " " + t : " Il s'en occupe."}`, display: `Claude a bien reçu ta requête.${t ? " " + t : ""}`, needsValidation: false };
      case "thinking": {
        const eta = p.eta ? ` Patiente environ ${p.eta}.` : "";
        const s = `Claude traite ta requête.${eta}${t ? " " + t : ""}`;
        return { speech: s, display: s, needsValidation: false };
      }
      case "solution":
        if (p.needs_validation) {
          return { speech: `Claude a identifié une solution. ${t} Souhaites-tu qu'il l'applique ?`, display: `Claude a identifié une solution : ${t}`, needsValidation: true };
        }
        return { speech: `Claude a identifié une solution : ${t}. Il va maintenant appliquer les corrections.`, display: `Claude a identifié une solution : ${t}`, needsValidation: false };
      case "applying":
        return { speech: `Claude applique les corrections.${t ? " " + t : ""}`, display: `Claude applique les corrections.${t ? " " + t : ""}`, needsValidation: false };
      case "done":
        return { speech: `Claude a terminé. ${t || "Les corrections sont appliquées."}`, display: `Claude a terminé. ${t || "Les corrections sont appliquées."}`, needsValidation: false };
      default:
        return { speech: `claude a dit : ${t || raw}`, display: `claude a dit : ${t || raw}`, needsValidation: false };
    }
  } catch {
    return { speech: `claude a dit : ${raw}`, display: `claude a dit : ${raw}`, needsValidation: false };
  }
}


export default function VoicePage() {
  const [mode,        setMode]       = useState<Mode>("idle");
  const [messages,    setMessages]   = useState<Message[]>([]);
  const [transcript,  setTranscript] = useState("");
  const [ariaText,    setAriaText]   = useState("");
  const [showInput,   setShowInput]  = useState(false);
  const [textInput,   setTextInput]  = useState("");
  const [noSpeech,    setNoSpeech]   = useState(false);
  const textModeRef = useRef(false); // true = dernière entrée était texte → pas de TTS
  const [voiceId,          setVoiceId]          = useState("onyx");
  const [showVoices,       setShowVoices]       = useState(false);
  const [pendingValidation, setPendingValidation] = useState<string | null>(null);
  const [muted,            setMuted]            = useState(() => {
    try { return localStorage.getItem("cc_muted") === "1"; } catch { return false; }
  });
  const mutedRef = useRef(muted);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const streamRef     = useRef<MediaStream | null>(null);
  const modeRef       = useRef<Mode>("idle");
  const voiceRef      = useRef("onyx");
  const messagesRef   = useRef<Message[]>([]);
  const submittingRef = useRef(false);
  const recordingRef  = useRef(false);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const convRef       = useRef<HTMLDivElement>(null);

  modeRef.current     = mode;
  messagesRef.current = messages;

  /* ── Init — vérifie MediaRecorder dispo ── */
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNoSpeech(true); setShowInput(true); textModeRef.current = true;
    }
  }, []);

  /* ── Sync voiceId → ref ── */
  useEffect(() => { voiceRef.current = voiceId; }, [voiceId]);

  /* ── Sync muted → ref + localStorage ── */
  useEffect(() => {
    mutedRef.current = muted;
    try { localStorage.setItem("cc_muted", muted ? "1" : "0"); } catch { /* noop */ }
    if (muted) { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } speechSynthesis.cancel(); }
  }, [muted]);

  /* ── Auto-scroll inside conversation ── */
  useEffect(() => {
    if (convRef.current) {
      convRef.current.scrollTop = convRef.current.scrollHeight;
    }
  }, [messages, ariaText]);

  /* ── Stop audio ── */
  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    speechSynthesis.cancel();
  }, []);

  /* ── TTS via OpenAI ── */
  const speak = useCallback(async (text: string) => {
    if (mutedRef.current) { setMode("idle"); return; }
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceRef.current }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = audio.onerror = () => { setMode("idle"); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      if (mutedRef.current) { setMode("idle"); return; }
      // Fallback Web Speech
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "fr-FR"; utt.rate = 1.05;
      utt.onend = utt.onerror = () => setMode("idle");
      speechSynthesis.speak(utt);
    }
  }, []);

  /* ── Bridge polling (check for Claude replies) ── */
  const pollBridge = useCallback(async () => {
    try {
      const res = await fetch("/api/bridge", { method: "GET" });
      if (!res.ok) return;
      const { messages: claudeMsgs } = await res.json();
      if (!claudeMsgs?.length) return;
      for (const m of claudeMsgs as { message: string }[]) {
        const { speech, display, needsValidation } = formatBridgeMsg(m.message);
        const bridgeType = (() => { try { return JSON.parse(m.message).type ?? "message"; } catch { return "message"; } })();
        setMessages(prev => [...prev, { role: "assistant", content: display, bridge: true, bridgeType }]);
        if (needsValidation) {
          setPendingValidation(display);
          speak(speech);
        } else {
          speak(speech);
        }
      }
    } catch { /* silent */ }
  }, [speak]);

  /* ── Bridge validation ── */
  const sendValidation = useCallback(async (validated: boolean) => {
    const payload = validated
      ? JSON.stringify({ type: "validated", text: "Mehdi a validé la solution, tu peux appliquer les corrections." })
      : JSON.stringify({ type: "refused",   text: "Mehdi a refusé la solution." });
    await fetch("/api/bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: payload }) });
    const ack = validated ? "Validation envoyée à Claude. Il va maintenant appliquer les corrections." : "Refus envoyé à Claude.";
    setMessages(prev => [...prev, { role: "assistant", content: ack }]);
    setPendingValidation(null);
    speak(ack);
  }, [speak]);

  useEffect(() => {
    pollBridge();
    const id = setInterval(pollBridge, 8_000); // toutes les 8s pour réponses quasi-temps-réel
    return () => clearInterval(id);
  }, [pollBridge]);

  /* ── Call AI ── */
  const callAI = useCallback(async (userText: string) => {
    if (!userText.trim()) { setMode("idle"); return; }
    // Anti-doublon #1 : verrou en-vol
    if (submittingRef.current) return;
    submittingRef.current = true;
    stopAudio();
    // Anti-doublon #3 : vérifie via ref que le dernier msg n'est pas déjà ce texte
    const current = messagesRef.current;
    const last = current.at(-1);
    if (last?.role === "user" && last.content === userText) {
      submittingRef.current = false; setMode("idle"); return;
    }
    const newMessages: Message[] = [...current, { role: "user", content: userText }];
    setMessages(newMessages);
    setTranscript(""); setAriaText(""); setMode("thinking");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok || !res.body) throw new Error();
      setMode("speaking");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setAriaText(full);
      }
      setMessages(prev => [...prev, { role: "assistant", content: full }]);
      setAriaText("");
      if (!textModeRef.current) speak(full);
      else setMode("idle");
    } catch { setMode("idle"); }
    finally { submittingRef.current = false; }
  }, [speak]);

  /* ── Push-to-talk — MediaRecorder + Whisper ── */
  const startPTT = useCallback(async (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    if (recordingRef.current || modeRef.current !== "idle") return;
    recordingRef.current = true;
    textModeRef.current = false;
    stopAudio();
    setTranscript("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { recordingRef.current = false; return; }

    streamRef.current = stream;
    chunksRef.current = [];
    const mime = bestMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecRef.current = rec;

    rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };

    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      recordingRef.current = false;
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      chunksRef.current = [];
      if (blob.size < 1000) { setMode("idle"); return; }  // trop court, probablement silence

      setMode("thinking");
      setTranscript("…transcription…");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "audio.webm");
        const res = await fetch("/api/stt", { method: "POST", body: fd });
        const { text } = await res.json();
        setTranscript("");
        if (text?.trim()) callAI(text.trim());
        else setMode("idle");
      } catch { setMode("idle"); setTranscript(""); }
    };

    rec.start();
    setMode("listening");
  }, [callAI, stopAudio]);

  const stopPTT = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!recordingRef.current) return;
    mediaRecRef.current?.stop();
  }, []);

  /* ── Text fallback ── */
  const sendText = useCallback(() => {
    if (!textInput.trim()) return;
    textModeRef.current = true;
    callAI(textInput); setTextInput("");
  }, [textInput, callAI]);

  /* ── Voice options ── */
  const VOICES = [
    { id: "onyx",    label: "Onyx",    desc: "Grave · Autoritaire", male: true  },
    { id: "echo",    label: "Echo",    desc: "Masculin · Posé",     male: true  },
    { id: "fable",   label: "Fable",   desc: "Brit · Expressif",   male: true  },
    { id: "alloy",   label: "Alloy",   desc: "Neutre · Clair",      male: false },
    { id: "nova",    label: "Nova",    desc: "Féminin · Vif",       male: false },
    { id: "shimmer", label: "Shimmer", desc: "Féminin · Doux",      male: false },
  ];

  /* ── Orb visuals ── */
  const cfg: Record<Mode, { gradient: string; glow: string; label: string; ring: boolean; spin: boolean }> = {
    idle:      { gradient: "linear-gradient(135deg,#4F46E5,#7C3AED)",       glow: "rgba(79,70,229,.5)",   label: "Maintenir pour parler", ring: false, spin: false },
    listening: { gradient: "linear-gradient(135deg,#06B6D4,#0EA5E9)",       glow: "rgba(6,182,212,.6)",   label: "En écoute…",            ring: true,  spin: false },
    thinking:  { gradient: "linear-gradient(135deg,#C9A84C,#a07830)",       glow: "rgba(201,168,76,.55)", label: "Réflexion…",            ring: false, spin: true  },
    speaking:  { gradient: "linear-gradient(135deg,#10B981,#059669)",       glow: "rgba(16,185,129,.55)", label: "Command Center répond…", ring: true,  spin: false },
  };
  const c = cfg[mode];

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#030314",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes ring-out {
          0%   { transform:scale(1);   opacity:.7; }
          100% { transform:scale(1.7); opacity:0;  }
        }
        @keyframes ring-out2 {
          0%   { transform:scale(1);   opacity:.5; }
          100% { transform:scale(2.2); opacity:0;  }
        }
        @keyframes spin-ring {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes bar-wave {
          0%,100% { transform:scaleY(1); }
          50%     { transform:scaleY(1.8); }
        }
        @keyframes fade-up {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .msg  { animation: fade-up .25s ease; }
        .bar  { display:inline-block; width:3px; border-radius:2px; }
        .bwav { animation: bar-wave .55s ease-in-out infinite; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"14px 18px 6px", position:"relative" }}>
          <span style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.6)", letterSpacing:".12em" }}>COMMAND CENTER</span>
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); stopAudio(); setMode("idle"); }} style={{ position:"absolute", right:18, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"5px 11px", color:"rgba(255,255,255,.4)", fontSize:11, cursor:"pointer" }}>
              ✕
            </button>
          )}
        </div>
        {/* Big nav buttons */}
        <div style={{ display:"flex", justifyContent:"center", gap:10, padding:"6px 18px 10px" }}>
          <Link href="/admin" style={{ flex:1, maxWidth:160, height:44, borderRadius:12, background:"linear-gradient(135deg,#0A1A2E,#071425)", border:"1px solid rgba(201,168,76,.35)", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontWeight:700, fontSize:14, color:"#C9A84C", textDecoration:"none" }}>
            ⊞ Dashboard
          </Link>
          <Link href="/gemini" style={{ flex:1, maxWidth:160, height:44, borderRadius:12, background:"linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontWeight:700, fontSize:14, color:"#fff", textDecoration:"none" }}>
            G Gemini
          </Link>
        </div>
      </div>

      {/* ── Conversation ── */}
      <div ref={convRef} style={{ flex:1, overflowY:"auto", padding:"8px 16px 220px", display:"flex", flexDirection:"column", gap:10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,.15)", fontSize:13, marginTop:40, lineHeight:2 }}>
            Maintenez l'orbe pour parler<br/>
            <span style={{ fontSize:11 }}>Relâchez pour envoyer</span>
          </div>
        )}

        {messages.filter((m, i) => {
          // Dedup visuel : supprime les messages user consécutifs identiques
          if (m.role !== "user") return true;
          const prev = messages[i - 1];
          return !prev || prev.role !== "user" || prev.content !== m.content;
        }).map((m, i) => {
          const isBridge = m.bridge;
          const bridgeColor: Record<string, string> = { received:"rgba(79,70,229,.35)", thinking:"rgba(201,168,76,.35)", solution:"rgba(16,185,129,.35)", applying:"rgba(6,182,212,.35)", done:"rgba(16,185,129,.5)", validated:"rgba(16,185,129,.35)", refused:"rgba(239,68,68,.35)" };
          const bg = isBridge
            ? (bridgeColor[m.bridgeType ?? ""] ?? "rgba(201,168,76,.12)")
            : m.role === "user" ? "linear-gradient(135deg,rgba(79,70,229,.45),rgba(124,58,237,.35))" : "rgba(255,255,255,.06)";
          const border = isBridge ? "1px solid rgba(201,168,76,.35)" : "1px solid " + (m.role === "user" ? "rgba(79,70,229,.3)" : "rgba(255,255,255,.08)");
          return (
            <div key={i} className="msg" style={{ display:"flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {isBridge && <div style={{ fontSize:9, color:"#C9A84C", fontWeight:700, letterSpacing:".1em", alignSelf:"flex-end", marginRight:6, marginBottom:4, whiteSpace:"nowrap" }}>CLAUDE</div>}
              <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: bg, border, fontSize:14, color: m.role === "user" ? "rgba(255,255,255,.9)" : "#e2e8f0", lineHeight:1.55 }}>
                {m.content}
              </div>
            </div>
          );
        })}

        {/* Streaming */}
        {ariaText && (
          <div className="msg" style={{ display:"flex", justifyContent:"flex-start" }}>
            <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius:"16px 16px 16px 4px", background:"rgba(255,255,255,.06)", border:"1px solid rgba(16,185,129,.25)", fontSize:14, color:"#e2e8f0", lineHeight:1.55 }}>
              {ariaText}
              <span style={{ display:"inline-block", width:2, height:13, background:"rgba(16,185,129,.8)", marginLeft:2, verticalAlign:"middle", animation:"bar-wave .6s ease-in-out infinite" }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* ── Bridge validation banner ── */}
      {pendingValidation && (
        <div style={{ position:"fixed", bottom:130, left:16, right:16, zIndex:35, background:"rgba(10,10,30,.95)", backdropFilter:"blur(12px)", border:"1px solid rgba(201,168,76,.4)", borderRadius:16, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:12, color:"#C9A84C", fontWeight:700, letterSpacing:".08em" }}>CLAUDE — VALIDATION REQUISE</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.85)", lineHeight:1.5 }}>{pendingValidation}</div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => sendValidation(true)}  style={{ flex:1, padding:"10px", background:"linear-gradient(135deg,#10B981,#059669)", border:"none", borderRadius:10, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>Valider</button>
            <button onClick={() => sendValidation(false)} style={{ flex:1, padding:"10px", background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.15)", borderRadius:10, color:"rgba(255,255,255,.6)", fontSize:13, cursor:"pointer" }}>Refuser</button>
          </div>
        </div>
      )}

      {/* ── Text input — toujours visible au-dessus de l'orbe ── */}
      <div style={{ position:"fixed", bottom:148, left:16, right:16, display:"flex", gap:8, zIndex:30 }}>
        <input value={textInput} onChange={e => setTextInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendText()}
          placeholder="Écris un message…"
          style={{ flex:1, background:"rgba(15,15,40,.95)", border:"1px solid rgba(255,255,255,.15)", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#fff", outline:"none", fontFamily:"inherit" }}
        />
        <button onClick={sendText} disabled={!textInput.trim()} style={{ background:"linear-gradient(135deg,#4F46E5,#7C3AED)", border:"none", borderRadius:12, padding:"0 18px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer", opacity: textInput.trim() ? 1 : 0.4 }}>→</button>
      </div>

      {/* ── Voice picker popup (ancré au bouton voix) ── */}
      {showVoices && (
        <div style={{ position:"fixed", bottom:116, left:"50%", transform:"translateX(calc(-50% - 56px))", zIndex:50, background:"rgba(8,8,28,.97)", backdropFilter:"blur(16px)", border:"1px solid rgba(201,168,76,.3)", borderRadius:16, padding:"12px", display:"flex", flexDirection:"column", gap:6, minWidth:160 }}>
          <div style={{ fontSize:10, color:"rgba(201,168,76,.7)", fontWeight:700, letterSpacing:".1em", marginBottom:2 }}>VOIX</div>
          {VOICES.map(v => (
            <button key={v.id} onClick={() => { setVoiceId(v.id); setShowVoices(false); }}
              style={{ background: voiceId === v.id ? "rgba(201,168,76,.15)" : "transparent", border:`1px solid ${voiceId === v.id ? "rgba(201,168,76,.4)" : "rgba(255,255,255,.07)"}`, borderRadius:8, padding:"7px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, textAlign:"left" }}>
              <span style={{ fontSize:12, color: voiceId === v.id ? "#C9A84C" : "rgba(255,255,255,.5)" }}>{v.male ? "♂" : "♀"}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: voiceId === v.id ? "#C9A84C" : "rgba(255,255,255,.85)" }}>{v.label}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{v.desc}</div>
              </div>
              {voiceId === v.id && <span style={{ marginLeft:"auto", fontSize:10, color:"#C9A84C" }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Floating orb ── */}
      <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)", zIndex:40, display:"flex", flexDirection:"column", alignItems:"center", gap:8, userSelect:"none" }}>

        {/* Status label */}
        <div style={{ fontSize:11, background:"rgba(0,0,0,.55)", backdropFilter:"blur(8px)", padding:"4px 10px", borderRadius:20, whiteSpace:"nowrap",
          color: mode === "idle" ? "rgba(255,255,255,.4)" : mode === "listening" ? "#06B6D4" : mode === "thinking" ? "#C9A84C" : "#10B981",
          border: `1px solid ${c.glow}`,
          transition:"color .3s, border-color .3s",
        }}>
          {transcript && mode === "listening" ? `« ${transcript.slice(0,28)}${transcript.length>28?"…":""}` : c.label}
        </div>

        {/* Boutons flanquants */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>

        {/* Bouton voix — à gauche de l'orbe */}
        <button
          onClick={() => setShowVoices(v => !v)}
          style={{
            width:44, height:44, borderRadius:"50%",
            background: showVoices ? "rgba(201,168,76,.2)" : "rgba(255,255,255,.07)",
            border: `1px solid ${showVoices ? "rgba(201,168,76,.5)" : "rgba(255,255,255,.15)"}`,
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1,
            transition:"background .2s, border-color .2s",
          }}
          title="Changer la voix"
        >
          <span style={{ fontSize:16, lineHeight:1 }}>🎭</span>
          <span style={{ fontSize:8, color: showVoices ? "#C9A84C" : "rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".04em" }}>
            {VOICES.find(v => v.id === voiceId)?.label?.toUpperCase()}
          </span>
        </button>

        {/* Orb wrapper */}
        <div style={{ position:"relative", width:72, height:72 }}>

          {/* Pulse rings */}
          {c.ring && <>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:c.gradient, opacity:.5, animation:"ring-out 1.1s ease-out infinite" }} />
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:c.gradient, opacity:.35, animation:"ring-out2 1.1s ease-out infinite .35s" }} />
          </>}

          {/* Spin ring */}
          {c.spin && (
            <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`conic-gradient(${c.glow}, transparent, ${c.glow})`, animation:"spin-ring 1s linear infinite" }} />
          )}

          {/* Core button */}
          <button
            onPointerDown={startPTT}
            onPointerUp={stopPTT}
            onPointerLeave={stopPTT}
            onPointerCancel={stopPTT}
            disabled={mode === "thinking"}
            style={{
              position:"absolute", inset:0,
              borderRadius:"50%",
              background: c.gradient,
              boxShadow: `0 0 28px ${c.glow}, 0 0 60px ${c.glow.replace(".5",",.18").replace(".6",",.2").replace(".55",",.18")}`,
              border: "none",
              cursor: mode === "thinking" ? "wait" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"transform .15s, box-shadow .3s, background .4s",
              transform: mode === "listening" ? "scale(1.08)" : "scale(1)",
              WebkitUserSelect:"none", touchAction:"none",
            }}
          >
            {/* Icon */}
            {mode === "idle" && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="9" y1="22" x2="15" y2="22"/>
              </svg>
            )}
            {mode === "listening" && (
              <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                {[.0,.08,.16,.24,.16,.08,.0].map((d,i) => (
                  <div key={i} className="bar bwav" style={{ height:[10,18,24,28,24,18,10][i], background:"rgba(255,255,255,.95)", animationDelay:`${d}s`, animationDuration:".5s" }} />
                ))}
              </div>
            )}
            {mode === "thinking" && <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(255,255,255,.9)" }} />}
            {mode === "speaking" && (
              <div style={{ display:"flex", gap:3, alignItems:"center" }}>
                {[.0,.1,.2,.15,.05].map((d,i) => (
                  <div key={i} className="bar bwav" style={{ height:[14,22,18,22,14][i], background:"rgba(255,255,255,.95)", animationDelay:`${d}s` }} />
                ))}
              </div>
            )}
          </button>
        </div>
        {/* Bouton mute — à droite de l'orbe */}
        <button
          onClick={() => setMuted(m => !m)}
          style={{
            width:44, height:44, borderRadius:"50%",
            background: muted ? "rgba(239,68,68,.18)" : "rgba(255,255,255,.07)",
            border: `1px solid ${muted ? "rgba(239,68,68,.55)" : "rgba(255,255,255,.15)"}`,
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1,
            transition:"background .2s, border-color .2s",
          }}
          title={muted ? "Activer le son" : "Couper le son"}
        >
          <span style={{ fontSize:16, lineHeight:1 }}>{muted ? "🔇" : "🔊"}</span>
          <span style={{ fontSize:8, color: muted ? "#EF4444" : "rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".04em" }}>
            {muted ? "MUTE" : "SON"}
          </span>
        </button>

        </div>{/* fin boutons flanquants */}
      </div>{/* fin floating orb container */}
    </div>
  );
}
