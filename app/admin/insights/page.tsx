"use client";

import { useState, useEffect, useRef } from "react";

type Chapter = { title: string; anchor: string };
type Report = {
  id: string;
  title: string;
  category: string;
  content: string;
  chapters: Chapter[];
  score: number | null;
  created_at: string;
  updated_at: string;
};

const C = {
  bg: "#040D1C", header: "#071425", card: "#0A1A2E", cardAlt: "rgba(255,255,255,.03)",
  gold: "#C9A84C", text: "#E8E0D0", muted: "#9BA8B8", dim: "#5A6A7A",
  border: "1px solid rgba(201,168,76,.15)", borderLight: "1px solid rgba(255,255,255,.06)",
};

const CATEGORIES = [
  { key: "all", label: "Tous" },
  { key: "strategy", label: "Stratégie" },
  { key: "benchmark", label: "Benchmark" },
  { key: "seo", label: "SEO & GEO" },
  { key: "growth", label: "Croissance" },
  { key: "revenue", label: "Revenus" },
];

export default function InsightsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [speaking, setSpeaking] = useState(false);
  const [speakingChapter, setSpeakingChapter] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    fetchReports();
  }, [category]);

  async function fetchReports() {
    setLoading(true);
    const url = category === "all" ? "/api/admin/insights" : `/api/admin/insights?category=${category}`;
    const r = await fetch(url);
    const d = await r.json();
    if (Array.isArray(d)) setReports(d);
    setLoading(false);
  }

  function openReport(r: Report) {
    setActiveReport(r);
    setActiveChapter(null);
    stopSpeaking();
  }

  function scrollToChapter(anchor: string) {
    setActiveChapter(anchor);
    const el = contentRef.current?.querySelector(`[data-chapter="${anchor}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // TTS — read a chapter or full report
  function speak(text: string, chapterAnchor?: string) {
    stopSpeaking();
    if (!window.speechSynthesis) return;
    // Clean markdown-like formatting
    const clean = text.replace(/#{1,3}\s/g, "").replace(/\*\*/g, "").replace(/- /g, "").replace(/\|[^|]+\|/g, "");
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "fr-FR";
    utter.rate = 1.0;
    utter.onend = () => { setSpeaking(false); setSpeakingChapter(null); };
    utterRef.current = utter;
    setSpeaking(true);
    setSpeakingChapter(chapterAnchor ?? null);
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSpeakingChapter(null);
  }

  function speakChapterContent(chapter: Chapter) {
    if (!activeReport) return;
    // Extract text between this chapter heading and the next
    const lines = activeReport.content.split("\n");
    const startMarker = `## ${chapter.title}`;
    let capturing = false;
    let text = "";
    for (const line of lines) {
      if (line.trim().startsWith(startMarker) || line.trim() === `## ${chapter.title}`) {
        capturing = true;
        continue;
      }
      if (capturing && line.trim().startsWith("## ")) break;
      if (capturing) text += line + "\n";
    }
    if (text.trim()) speak(text.trim(), chapter.anchor);
    else speak(chapter.title, chapter.anchor);
  }

  function getScoreColor(score: number) {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#C9A84C";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  }

  // Render markdown-like content
  function renderContent(content: string, chapters: Chapter[]) {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentChapter = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("# ")) {
        elements.push(<h1 key={i} style={{ fontSize: 22, fontWeight: 700, color: C.gold, margin: "24px 0 12px", lineHeight: 1.3 }}>{trimmed.slice(2)}</h1>);
      } else if (trimmed.startsWith("## ")) {
        const title = trimmed.slice(3);
        const ch = chapters.find(c => c.title === title);
        currentChapter = ch?.anchor ?? "";
        elements.push(
          <h2 key={i} data-chapter={currentChapter} style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "28px 0 10px", paddingTop: 16, borderTop: C.borderLight, display: "flex", alignItems: "center", gap: 10, lineHeight: 1.3 }}>
            {title}
            {ch && (
              <button onClick={() => speakingChapter === ch.anchor ? stopSpeaking() : speakChapterContent(ch)} style={{ background: "none", border: `1px solid ${speakingChapter === ch.anchor ? "#EF4444" : "rgba(201,168,76,.3)"}`, color: speakingChapter === ch.anchor ? "#EF4444" : C.gold, padding: "2px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", borderRadius: 4 }}>
                {speakingChapter === ch.anchor ? "⏹ Stop" : "🔊"}
              </button>
            )}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        elements.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 600, color: C.muted, margin: "16px 0 8px" }}>{trimmed.slice(4)}</h3>);
      } else if (trimmed.startsWith("- **")) {
        const match = trimmed.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
        if (match) {
          elements.push(
            <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ color: C.gold, flexShrink: 0 }}>•</span>
              <span><strong style={{ color: C.text }}>{match[1]}</strong>{match[2] ? <span style={{ color: C.muted }}> — {match[2]}</span> : null}</span>
            </div>
          );
        }
      } else if (trimmed.startsWith("- ")) {
        elements.push(
          <div key={i} style={{ display: "flex", gap: 8, padding: "3px 0", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            <span style={{ color: C.dim, flexShrink: 0 }}>•</span>
            <span>{trimmed.slice(2)}</span>
          </div>
        );
      } else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        // Simple table row
        const cells = trimmed.split("|").filter(c => c.trim() && !c.match(/^[-:]+$/));
        if (cells.length > 0 && !trimmed.match(/^[\s|:-]+$/)) {
          elements.push(
            <div key={i} style={{ display: "flex", gap: 4, padding: "3px 0", fontSize: 11, fontFamily: "monospace" }}>
              {cells.map((cell, j) => (
                <span key={j} style={{ flex: 1, color: i < 2 ? C.dim : C.muted, padding: "2px 6px", background: i < 2 ? "transparent" : C.cardAlt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cell.trim()}
                </span>
              ))}
            </div>
          );
        }
      } else if (trimmed === "") {
        elements.push(<div key={i} style={{ height: 8 }} />);
      } else {
        elements.push(<p key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "4px 0" }}>{trimmed}</p>);
      }
    }
    return elements;
  }

  // List view
  if (!activeReport) {
    return (
      <div style={{ color: C.text, fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: C.header, borderBottom: C.border, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase", color: C.gold, fontWeight: 600 }}>Insights</span>
          <span style={{ fontSize: ".6rem", color: C.dim }}>Analyses stratégiques & benchmarks</span>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, padding: "12px 24px", flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategory(cat.key)} style={{
              padding: "6px 14px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              background: category === cat.key ? "rgba(201,168,76,.12)" : "transparent",
              border: category === cat.key ? "1px solid rgba(201,168,76,.3)" : "1px solid rgba(255,255,255,.06)",
              color: category === cat.key ? C.gold : C.muted,
              borderRadius: 6,
            }}>
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          {loading ? (
            <div style={{ color: C.dim, fontSize: 13, padding: 40, textAlign: "center" }}>Chargement...</div>
          ) : reports.length === 0 ? (
            <div style={{ color: C.dim, fontSize: 13, padding: 40, textAlign: "center" }}>
              Aucun rapport disponible.
              <br /><span style={{ fontSize: 11 }}>Les analyses sont générées automatiquement chaque semaine.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reports.map(r => (
                <div key={r.id} onClick={() => openReport(r)} style={{
                  background: C.card, border: C.borderLight, padding: "16px 20px", cursor: "pointer",
                  transition: "border-color .15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(201,168,76,.1)", color: C.gold, borderRadius: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                      {r.category}
                    </span>
                    {r.score !== null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: getScoreColor(r.score) }}>
                        Score: {r.score}/100
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: C.dim, marginLeft: "auto" }}>
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
                    {r.chapters.length} chapitres · {Math.ceil(r.content.length / 1500)} min de lecture
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detail view
  return (
    <div style={{ color: C.text, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ background: C.header, borderBottom: C.border, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={() => { setActiveReport(null); stopSpeaking(); }} style={{ background: "none", border: "1px solid rgba(255,255,255,.1)", color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", borderRadius: 4 }}>
          ← Retour
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeReport.title}
        </span>
        {activeReport.score !== null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(activeReport.score), flexShrink: 0 }}>
            {activeReport.score}/100
          </span>
        )}
        <button onClick={() => speaking ? stopSpeaking() : speak(activeReport.content)} style={{
          background: speaking ? "rgba(239,68,68,.15)" : "rgba(201,168,76,.12)",
          border: `1px solid ${speaking ? "rgba(239,68,68,.3)" : "rgba(201,168,76,.3)"}`,
          color: speaking ? "#EF4444" : C.gold,
          padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", borderRadius: 4, flexShrink: 0,
        }}>
          {speaking ? "⏹ Stop" : "🔊 Écouter"}
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Chapter nav (desktop) */}
        {activeReport.chapters.length > 0 && (
          <div style={{ width: 200, borderRight: C.borderLight, padding: "12px 8px", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8, padding: "0 8px" }}>Chapitres</div>
            {activeReport.chapters.map((ch, i) => (
              <button key={ch.anchor} onClick={() => scrollToChapter(ch.anchor)} style={{
                display: "block", width: "100%", textAlign: "left", padding: "6px 8px",
                fontSize: 11, color: activeChapter === ch.anchor ? C.gold : C.muted,
                background: activeChapter === ch.anchor ? "rgba(201,168,76,.08)" : "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 4,
                lineHeight: 1.4,
              }}>
                <span style={{ color: C.dim, marginRight: 6 }}>{i + 1}.</span>
                {ch.title}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} style={{ flex: 1, overflow: "auto", padding: "20px 24px", lineHeight: 1.6 }}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 16 }}>
            Mis à jour le {new Date(activeReport.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            {" · "}{Math.ceil(activeReport.content.length / 1500)} min de lecture
            {" · "}{activeReport.chapters.length} chapitres
          </div>
          {renderContent(activeReport.content, activeReport.chapters)}
        </div>
      </div>
    </div>
  );
}
