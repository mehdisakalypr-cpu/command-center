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
type Action = {
  id: string;
  report_id: string;
  label: string;
  assignee: "agent" | "human";
  status: "pending" | "in_progress" | "done";
  palier: number | null;
  sort_order: number;
  completed_at: string | null;
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
  const [isMobile, setIsMobile] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [detailTab, setDetailTab] = useState<"content" | "actions">("content");
  const [paliers, setPaliers] = useState<any[]>([]);
  const [scenarioTab, setScenarioTab] = useState<"garanti" | "median" | "high" | "ultra">("median");
  const [projectTab, setProjectTab] = useState<"ftg" | "baratie" | "total">("ftg");
  const [sukStatus, setSukStatus] = useState<any>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetchReports();
    fetchPaliers();
    fetchSukStatus();
    const sukInterval = setInterval(fetchSukStatus, 10000); // refresh every 10s
    return () => clearInterval(sukInterval);
  }, [category]);

  async function fetchSukStatus() {
    try {
      const r = await fetch("/api/admin/suk-status");
      const d = await r.json();
      setSukStatus(d);
    } catch {}
  }

  useEffect(() => {
    const key = `${projectTab}_${scenarioTab}`;
    const data = ALL_SCENARIOS[key] ?? ALL_SCENARIOS[`ftg_${scenarioTab}`] ?? [];
    setPaliers(data);
  }, [scenarioTab, projectTab]);

  const ALL_SCENARIOS: Record<string, any[]> = {
    // ══════ FTG ══════
    ftg_garanti: [
      { palier_num: 1, label: "M1-M6 — Coûts €1/mo (free tiers), SEO lent, 0 payant mais 0 perte", timeline: "Mois 1-6", mrr: 0, costs: 1, margin: -1, annual_profit: -12, status: "in_progress" },
      { palier_num: 2, label: "M7-M12 — Premiers signups organiques, 0 payant, perte €1/mo", timeline: "Mois 7-12", mrr: 0, costs: 1, margin: -1, annual_profit: -12, status: "planned" },
      { palier_num: 3, label: "M13-M18 — 2 payants, MRR €144, profit €139/mo", timeline: "Mois 13-18", mrr: 144, costs: 5, margin: 139, annual_profit: 1668, status: "planned" },
      { palier_num: 4, label: "M19-M24 — 14 payants, MRR €1K, profit €970/mo", timeline: "Mois 19-24", mrr: 1008, costs: 30, margin: 978, annual_profit: 11736, status: "planned" },
      { palier_num: 5, label: "M25-M36 — 52 payants, MRR €3.7K, profit cumulé €32K", timeline: "Mois 25-36", mrr: 3744, costs: 110, margin: 3634, annual_profit: 43608, status: "planned" },
    ],
    ftg_median: [
      { palier_num: 1, label: "M1-M3 — 34 agents, 10K produits, 2,600 opps, 566 deals, 523 leads Nami, PPP pricing", timeline: "Mois 1-3", mrr: 760, costs: 4545, margin: -3785, annual_profit: -45420, status: "in_progress" },
      { palier_num: 2, label: "M4-M6 — FTG: 73 payants + Baratie: 200 sites (€3K) = MRR €10K, breakeven M6", timeline: "Mois 4-6", mrr: 9935, costs: 4728, margin: 5207, annual_profit: 62484, status: "planned" },
      { palier_num: 3, label: "M7-M12 — FTG: 367 payants €51K + Baratie: 2K sites €30K = MRR €81K", timeline: "Mois 7-12", mrr: 81380, costs: 6463, margin: 74917, annual_profit: 899004, status: "planned" },
      { palier_num: 4, label: "M13-M18 — FTG: €218K + Baratie: 8K sites €120K = MRR €338K", timeline: "Mois 13-18", mrr: 338340, costs: 12578, margin: 325762, annual_profit: 3909144, status: "planned" },
      { palier_num: 5, label: "M19-M24 — FTG: €547K + Baratie: 15K sites €225K = MRR €772K", timeline: "Mois 19-24", mrr: 772200, costs: 18385, margin: 753815, annual_profit: 9045780, status: "planned" },
      { palier_num: 6, label: "M25-M33 — FTG: €1M + Baratie: 25K sites €375K = MRR €1.4M", timeline: "Mois 25-33", mrr: 1415400, costs: 27550, margin: 1387850, annual_profit: 16654200, status: "planned" },
    ],
    ftg_high: [
      { palier_num: 1, label: "M1-M3 — 34 agents + viralité + press, 10K produits, 2,600 opps, 566 deals, 15 langues", timeline: "Mois 1-3", mrr: 1260, costs: 4545, margin: -3285, annual_profit: -39420, status: "in_progress" },
      { palier_num: 2, label: "M4-M6 — PMF validé, 65 payants, MRR €9.1K, breakeven M6", timeline: "Mois 4-6", mrr: 9100, costs: 4675, margin: 4425, annual_profit: 53100, status: "planned" },
      { palier_num: 3, label: "M7-M9 — Scale, 151 payants, MRR €21K, profit €16K/mo", timeline: "Mois 7-9", mrr: 21140, costs: 4847, margin: 16293, annual_profit: 195516, status: "planned" },
      { palier_num: 4, label: "M10-M12 — 354 payants, MRR €50K, profit €44K/mo", timeline: "Mois 10-12", mrr: 49560, costs: 5253, margin: 44307, annual_profit: 531684, status: "planned" },
      { palier_num: 5, label: "M13-M18 — Enterprise + API, 1412 payants, MRR €198K", timeline: "Mois 13-18", mrr: 197680, costs: 7369, margin: 190311, annual_profit: 2283732, status: "planned" },
      { palier_num: 6, label: "M19-M24 — 2764 payants, MRR €387K, vers €500K", timeline: "Mois 19-24", mrr: 386960, costs: 10073, margin: 376887, annual_profit: 4522644, status: "planned" },
    ],
    ftg_ultra: [
      { palier_num: 1, label: "M1-M3 — SSJ3: 34 agents, 10K produits, 2,600+ opps, 566 deals, 531 trends, 523 leads Nami, PPP pricing, 7 crons R&B", timeline: "Mois 1-3", mrr: 4465, costs: 4545, margin: -80, annual_profit: -960, status: "in_progress" },
      { palier_num: 2, label: "M4-M6 — Breakeven M4! FTG: 269 payants MRR €40K + Baratie (Site Factory): 500 sites MRR €7.5K = €47.5K total", timeline: "Mois 4-6", mrr: 47850, costs: 5218, margin: 42632, annual_profit: 511584, status: "planned" },
      { palier_num: 3, label: "M7-M9 — Kaioken: FTG 674 payants €135K + Baratie 3K sites €45K = €180K MRR, churn 2.5%", timeline: "Mois 7-9", mrr: 180000, costs: 10230, margin: 169770, annual_profit: 2037240, status: "planned" },
      { palier_num: 4, label: "M10-M12 — FTG 1289 payants €258K + Baratie 10K sites €150K = €408K MRR, profit €2.5M cumulé", timeline: "Mois 10-12", mrr: 408000, costs: 16768, margin: 391232, annual_profit: 4694784, status: "planned" },
      { palier_num: 5, label: "M13-M18 — FTG €500K + Baratie €300K = €800K MRR! 20K sites, marketplace B2B, Enterprise API", timeline: "Mois 13-18", mrr: 800000, costs: 25698, margin: 774302, annual_profit: 9291624, status: "planned" },
      { palier_num: 6, label: "M19-M24 — FTG €1M + Baratie €450K = €1.45M MRR! Night Guy: 30K sites, 5K payants FTG", timeline: "Mois 19-24", mrr: 1450000, costs: 35033, margin: 1414967, annual_profit: 16979604, status: "planned" },
      { palier_num: 7, label: "M25-M36 — Genkidama: FTG €3.45M + Baratie €1M = €4.45M MRR, valo €530M, IPO ready", timeline: "Mois 25-36", mrr: 4450000, costs: 55268, margin: 4394732, annual_profit: 52736784, status: "planned" },
    ],
    // ══════ BARATIE (Site Factory) ══════
    baratie_garanti: [
      { palier_num: 1, label: "M1-M6 — Build templates + 100 sites test, 0 vente", timeline: "Mois 1-6", mrr: 0, costs: 0, margin: 0, annual_profit: 0, status: "planned" },
      { palier_num: 2, label: "M7-M12 — 500 sites, 50 ventes × €49 + 30 abos × €15 = MRR €2.9K", timeline: "Mois 7-12", mrr: 2900, costs: 45, margin: 2855, annual_profit: 34260, status: "planned" },
      { palier_num: 3, label: "M13-M24 — 3K sites, 300 abos × €15 = MRR €4.5K", timeline: "Mois 13-24", mrr: 4500, costs: 70, margin: 4430, annual_profit: 53160, status: "planned" },
    ],
    baratie_median: [
      { palier_num: 1, label: "M4-M6 — Launch: 2K sites generes, 200 ventes + 500 abos = MRR €7.5K", timeline: "Mois 4-6", mrr: 7500, costs: 100, margin: 7400, annual_profit: 88800, status: "planned" },
      { palier_num: 2, label: "M7-M12 — Scale: 15K sites, 8K abos × €7 avg = MRR €56K", timeline: "Mois 7-12", mrr: 56000, costs: 750, margin: 55250, annual_profit: 663000, status: "planned" },
      { palier_num: 3, label: "M13-M18 — 40K sites, 25K abos × €7 = MRR €175K", timeline: "Mois 13-18", mrr: 175000, costs: 2000, margin: 173000, annual_profit: 2076000, status: "planned" },
      { palier_num: 4, label: "M19-M24 — 70K sites, 45K abos × €7 = MRR €315K", timeline: "Mois 19-24", mrr: 315000, costs: 3500, margin: 311500, annual_profit: 3738000, status: "planned" },
      { palier_num: 5, label: "M25-M33 — 100K sites, 65K abos × €7 = MRR €455K", timeline: "Mois 25-33", mrr: 455000, costs: 5000, margin: 450000, annual_profit: 5400000, status: "planned" },
    ],
    baratie_high: [
      { palier_num: 1, label: "M4-M6 — Nami Launch: 5K sites, 1K ventes + 2K abos = MRR €14K", timeline: "Mois 4-6", mrr: 14000, costs: 250, margin: 13750, annual_profit: 165000, status: "planned" },
      { palier_num: 2, label: "M7-M9 — 20K sites, 12K abos × €7 = MRR €84K", timeline: "Mois 7-9", mrr: 84000, costs: 1000, margin: 83000, annual_profit: 996000, status: "planned" },
      { palier_num: 3, label: "M10-M12 — 40K sites, 25K abos = MRR €175K", timeline: "Mois 10-12", mrr: 175000, costs: 2000, margin: 173000, annual_profit: 2076000, status: "planned" },
      { palier_num: 4, label: "M13-M18 — 70K sites, 45K abos = MRR €315K", timeline: "Mois 13-18", mrr: 315000, costs: 3500, margin: 311500, annual_profit: 3738000, status: "planned" },
      { palier_num: 5, label: "M19-M24 — 100K sites, 65K abos = MRR €455K, margin 99%", timeline: "Mois 19-24", mrr: 455000, costs: 5000, margin: 450000, annual_profit: 5400000, status: "planned" },
      { palier_num: 6, label: "M25-M33 — 150K sites, 100K abos = MRR €700K", timeline: "Mois 25-33", mrr: 700000, costs: 7500, margin: 692500, annual_profit: 8310000, status: "planned" },
    ],
    baratie_ultra: [
      { palier_num: 1, label: "M4-M6 — Nami Launch: 2K sites, 500 ventes + 1K abos = MRR €15K", timeline: "Mois 4-6", mrr: 15000, costs: 100, margin: 14900, annual_profit: 178800, status: "planned" },
      { palier_num: 2, label: "M7-M9 — 10K sites, 5K abos = MRR €75K", timeline: "Mois 7-9", mrr: 75000, costs: 1200, margin: 73800, annual_profit: 885600, status: "planned" },
      { palier_num: 3, label: "M10-M12 — 25K sites, 15K abos = MRR €225K", timeline: "Mois 10-12", mrr: 225000, costs: 3500, margin: 221500, annual_profit: 2658000, status: "planned" },
      { palier_num: 4, label: "M13-M18 — 50K sites, 30K abos = MRR €450K", timeline: "Mois 13-18", mrr: 450000, costs: 7000, margin: 443000, annual_profit: 5316000, status: "planned" },
      { palier_num: 5, label: "M19-M24 — 100K sites, 60K abos = MRR €900K", timeline: "Mois 19-24", mrr: 900000, costs: 14000, margin: 886000, annual_profit: 10632000, status: "planned" },
    ],
    // ══════ TOTAL (FTG + Baratie) ══════
    total_garanti: [
      { palier_num: 1, label: "M1-M12 — FTG seul, €0 coûts, 0 payant", timeline: "Mois 1-12", mrr: 0, costs: 1, margin: -1, annual_profit: -12, status: "in_progress" },
      { palier_num: 2, label: "M13-M24 — FTG €1K + Baratie €2.9K = MRR €3.9K", timeline: "Mois 13-24", mrr: 3900, costs: 75, margin: 3825, annual_profit: 45900, status: "planned" },
      { palier_num: 3, label: "M25-M36 — FTG €3.7K + Baratie €4.5K = MRR €8.2K", timeline: "Mois 25-36", mrr: 8200, costs: 180, margin: 8020, annual_profit: 96240, status: "planned" },
    ],
    total_median: [
      { palier_num: 1, label: "M1-M3 — FTG launch + Scout 130 demos, €760 MRR", timeline: "Mois 1-3", mrr: 760, costs: 4545, margin: -3785, annual_profit: -45420, status: "in_progress" },
      { palier_num: 2, label: "M4-M6 — FTG €10K + OFA 2K sites €7.5K = €17.5K MRR", timeline: "Mois 4-6", mrr: 17500, costs: 4648, margin: 12852, annual_profit: 154224, status: "planned" },
      { palier_num: 3, label: "M7-M12 — FTG €51K + OFA 15K sites €56K = €107K MRR", timeline: "Mois 7-12", mrr: 107000, costs: 6213, margin: 100787, annual_profit: 1209444, status: "planned" },
      { palier_num: 4, label: "M13-M18 — FTG €218K + OFA 40K sites €175K = €393K MRR", timeline: "Mois 13-18", mrr: 393000, costs: 11578, margin: 381422, annual_profit: 4577064, status: "planned" },
      { palier_num: 5, label: "M19-M24 — FTG €547K + OFA 70K sites €315K = €862K MRR", timeline: "Mois 19-24", mrr: 862000, costs: 18885, margin: 843115, annual_profit: 10117380, status: "planned" },
      { palier_num: 6, label: "M25-M33 — FTG €1M + OFA 100K sites €455K = €1.45M MRR", timeline: "Mois 25-33", mrr: 1455000, costs: 26550, margin: 1428450, annual_profit: 17141400, status: "planned" },
    ],
    total_high: [
      { palier_num: 1, label: "M1-M3 — FTG launch + Scout, €1.3K MRR", timeline: "Mois 1-3", mrr: 1260, costs: 4545, margin: -3285, annual_profit: -39420, status: "in_progress" },
      { palier_num: 2, label: "M4-M6 — FTG €9.1K + OFA 5K sites €14K = €23K MRR", timeline: "Mois 4-6", mrr: 23100, costs: 4970, margin: 18130, annual_profit: 217560, status: "planned" },
      { palier_num: 3, label: "M7-M9 — FTG €50K + OFA 20K sites €84K = €134K MRR", timeline: "Mois 7-9", mrr: 134000, costs: 8753, margin: 125247, annual_profit: 1502964, status: "planned" },
      { palier_num: 4, label: "M10-M12 — FTG €150K + OFA 40K sites €175K = €325K MRR", timeline: "Mois 10-12", mrr: 325000, costs: 14369, margin: 310631, annual_profit: 3727572, status: "planned" },
      { palier_num: 5, label: "M13-M18 — FTG €300K + OFA 70K sites €315K = €615K MRR", timeline: "Mois 13-18", mrr: 615000, costs: 19573, margin: 595427, annual_profit: 7145124, status: "planned" },
      { palier_num: 6, label: "M19-M24 — FTG €500K + OFA 100K sites €455K = €955K MRR", timeline: "Mois 19-24", mrr: 955000, costs: 23073, margin: 931927, annual_profit: 11183124, status: "planned" },
      { palier_num: 7, label: "M25-M33 — FTG €1M + OFA 150K sites €700K = €1.7M MRR", timeline: "Mois 25-33", mrr: 1700000, costs: 29000, margin: 1671000, annual_profit: 20052000, status: "planned" },
    ],
    total_ultra: [
      { palier_num: 1, label: "M1-M3 — FTG SSJ3 launch + Scout 500 demos, €4.5K MRR", timeline: "Mois 1-3", mrr: 4465, costs: 4545, margin: -80, annual_profit: -960, status: "in_progress" },
      { palier_num: 2, label: "M4-M6 — FTG €40K + OFA €15K = €55K MRR", timeline: "Mois 4-6", mrr: 55000, costs: 5318, margin: 49682, annual_profit: 596184, status: "planned" },
      { palier_num: 3, label: "M7-M9 — FTG €135K + OFA €75K = €210K MRR, Kaioken", timeline: "Mois 7-9", mrr: 210000, costs: 11430, margin: 198570, annual_profit: 2382840, status: "planned" },
      { palier_num: 4, label: "M10-M12 — FTG €258K + OFA €225K = €483K MRR", timeline: "Mois 10-12", mrr: 483000, costs: 20268, margin: 462732, annual_profit: 5552784, status: "planned" },
      { palier_num: 5, label: "M13-M18 — FTG €500K + OFA €450K = €950K MRR, Genkidama charging", timeline: "Mois 13-18", mrr: 950000, costs: 32698, margin: 917302, annual_profit: 11007624, status: "planned" },
      { palier_num: 6, label: "M19-M24 — FTG €1M + OFA 100K sites €900K = €1.9M MRR! Night Guy", timeline: "Mois 19-24", mrr: 1900000, costs: 49033, margin: 1850967, annual_profit: 22211604, status: "planned" },
      { palier_num: 7, label: "M25-M36 — GENKIDAMA: FTG €3.45M + OFA 150K sites €1.5M = €4.95M MRR, valo €594M", timeline: "Mois 25-36", mrr: 4950000, costs: 69268, margin: 4880732, annual_profit: 58568784, status: "planned" },
    ],
  };

  async function fetchPaliers() {
    try {
      const r = await fetch("/api/admin/paliers");
      const d = await r.json();
      if (Array.isArray(d) && d.length > 0) setPaliers(d);
      else setPaliers(ALL_SCENARIOS[`${projectTab}_${scenarioTab}`] ?? []);
    } catch {
      setPaliers(ALL_SCENARIOS[`${projectTab}_${scenarioTab}`] ?? []);
    }
  }

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
    setDetailTab("content");
    stopSpeaking();
    fetchActions(r.id);
  }

  async function fetchActions(reportId: string) {
    const res = await fetch(`/api/admin/insights/actions?report_id=${reportId}`);
    const data = await res.json();
    if (Array.isArray(data)) setActions(data);
  }

  async function toggleAction(actionId: string) {
    await fetch("/api/admin/insights/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: actionId, toggle: true }),
    });
    if (activeReport) fetchActions(activeReport.id);
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

        {/* SUK Sharingan — Live Activity Monitor */}
        {sukStatus && (
          <div style={{ padding: "0 24px 16px" }}>
            <div style={{ background: sukStatus.active ? "rgba(239,68,68,.08)" : "rgba(10,26,46,.6)", border: sukStatus.active ? "1px solid rgba(239,68,68,.3)" : C.border, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, borderRadius: 12 }}>
              <div style={{ position: "relative", width: 32, height: 32, flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: sukStatus.active ? "radial-gradient(circle, #EF4444 30%, #991B1B 70%)" : "radial-gradient(circle, #374151 30%, #1F2937 70%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: sukStatus.active ? "sukPulse 1.5s ease-in-out infinite" : "none",
                  boxShadow: sukStatus.active ? "0 0 12px rgba(239,68,68,.5)" : "none",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: sukStatus.active ? "#000" : "#4B5563" }} />
                </div>
                {sukStatus.active && <style>{`@keyframes sukPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.8; } }`}</style>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: sukStatus.active ? "#EF4444" : C.dim, textTransform: "uppercase", letterSpacing: ".1em" }}>
                  {sukStatus.active ? "SUK ACTIF — Sharingan Mode" : "SUK Standby — Zéro Absolu"}
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                  {sukStatus.recent?.products_5min > 0 ? `+${sukStatus.recent.products_5min} produits (5 min)` : ""}
                  {sukStatus.recent?.posts_5min > 0 ? ` · +${sukStatus.recent.posts_5min} posts (5 min)` : ""}
                  {!sukStatus.active ? " · Aucune activité récente" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                {[
                  { label: "Products", value: sukStatus.counts?.products, color: "#C9A84C" },
                  { label: "Deals", value: sukStatus.counts?.deals, color: "#34D399" },
                  { label: "Personas", value: sukStatus.counts?.personas, color: "#A78BFA" },
                  { label: "Posts", value: sukStatus.counts?.posts, color: "#60A5FA" },
                  { label: "Trends", value: sukStatus.counts?.trends, color: "#F59E0B" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, color: s.color, fontSize: 14 }}>{s.value?.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>{s.label}</div>
                  </div>
                ))}
                <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.1)", paddingLeft: 12 }}>
                  <div style={{ fontWeight: 700, color: "#EF4444", fontSize: 14 }}>{sukStatus.total?.toLocaleString()}</div>
                  <div style={{ fontSize: 9, color: C.dim }}>Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3 Scénarios Revenus — toujours visible */}
        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ background: "rgba(10,26,46,.6)", border: C.border, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".1em" }}>
                Scénarios Revenus
              </div>
              {/* Project selector */}
              <div style={{ display: "flex", gap: 3, background: "rgba(201,168,76,.08)", borderRadius: 8, padding: 2, border: "1px solid rgba(201,168,76,.2)" }}>
                {([
                  { key: "ftg" as const, label: "FTG", icon: "🌍" },
                  { key: "baratie" as const, label: "One For All", icon: "💪" },
                  { key: "total" as const, label: "Total Empire", icon: "👑" },
                ] as const).map(p => (
                  <button key={p.key} onClick={() => setProjectTab(p.key)}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, transition: "all .15s",
                      background: projectTab === p.key ? C.gold : "transparent",
                      color: projectTab === p.key ? "#07090F" : C.gold, border: "none", cursor: "pointer" }}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
              {/* Scenario selector */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "rgba(255,255,255,.05)", borderRadius: 8, padding: 2 }}>
                {([
                  { key: "garanti" as const, label: "Garanti 85%", color: "#34D399" },
                  { key: "median" as const, label: "Médian 55%", color: "#F59E0B" },
                  { key: "high" as const, label: "High 20%", color: "#A78BFA" },
                  { key: "ultra" as const, label: "Plus Ultra 15%", color: "#EF4444" },
                ] as const).map(s => (
                  <button key={s.key} onClick={() => setScenarioTab(s.key)}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, transition: "all .15s",
                      background: scenarioTab === s.key ? s.color : "transparent",
                      color: scenarioTab === s.key ? "#07090F" : s.color, border: "none", cursor: "pointer" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(201,168,76,.2)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: C.gold, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Palier</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: C.gold, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Travail Agents IA</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: C.gold, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Timeline</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: C.gold, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>MRR</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "#EF4444", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Coûts/mois</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: C.gold, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Marge/mois</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: C.gold, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Bénéfice annuel</th>
                  </tr>
                </thead>
                <tbody>
                  {paliers.map((row: any, idx: number) => {
                    const mrr = row.mrr ?? 0;
                    const costs = row.costs ?? row.couts ?? 0;
                    const margin = row.margin ?? row.marge ?? (mrr - costs);
                    const annual = row.annual_profit ?? row.benefice ?? (margin * 12);
                    const statusIcon = row.status === "done" ? " ✅" : row.status === "in_progress" ? " 🔄" : "";
                    const isCurrent = row.status === "in_progress";
                    return (
                    <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: isCurrent ? "rgba(201,168,76,.06)" : undefined }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: isCurrent ? "#F59E0B" : C.gold }}>P{row.palier_num ?? idx + 1}</td>
                      <td style={{ padding: "10px 12px", color: isCurrent ? "#F59E0B" : C.text, fontSize: 12, fontWeight: isCurrent ? 600 : 400 }}>{row.label}{statusIcon}</td>
                      <td style={{ padding: "10px 12px", color: C.dim, fontSize: 11, whiteSpace: "nowrap" }}>{row.timeline ?? row.mois}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: mrr > 0 ? C.text : C.dim }}>{mrr.toLocaleString("fr-FR")} €</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: "#EF4444" }}>-{costs.toLocaleString("fr-FR")} €</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: margin > 0 ? "#10B981" : "#EF4444" }}>{margin > 0 ? "+" : ""}{margin.toLocaleString("fr-FR")} €</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: annual > 0 ? "#10B981" : "#EF4444" }}>{annual > 0 ? "+" : ""}{annual.toLocaleString("fr-FR")} €</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stratégie détaillée — classée par priorité */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Priorités classées — moins d'effort humain, max levier */}
              <div style={{ background: "rgba(16,185,129,.04)", border: "1px solid rgba(16,185,129,.2)", padding: "16px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Actions prioritaires — classées potentiel/effort humain</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(16,185,129,.15)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: "#10B981", fontSize: 10, fontWeight: 600 }}>#</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: "#10B981", fontSize: 10, fontWeight: 600 }}>ACTION</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", color: "#10B981", fontSize: 10, fontWeight: 600 }}>TON EFFORT</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: "#10B981", fontSize: 10, fontWeight: 600 }}>COÛT/MOIS</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: "#10B981", fontSize: 10, fontWeight: 600 }}>POTENTIEL MRR</th>
                      <th style={{ padding: "6px 8px", textAlign: "center", color: "#10B981", fontSize: 10, fontWeight: 600 }}>100% AGENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { rank: 1, action: "15 langues déployées — marché ×1.78 ✅", effort: "0 (fait)", cout: 0, potentiel: "+936K MRR", agent: true },
                      { rank: 2, action: "300 personas IA influenceurs × 15 langues ✅", effort: "0 (fait)", cout: 0, potentiel: "+311K MRR", agent: true },
                      { rank: 3, action: "Geo-pricing PPP 4 tiers — marchés émergents", effort: "2h setup", cout: 0, potentiel: "+446K MRR", agent: false },
                      { rank: 4, action: "SEO Factory 300K pages × 15 langues ✅", effort: "0 (agent)", cout: 0, potentiel: "+85K MRR", agent: true },
                      { rank: 5, action: "600+ produits catalogue (terroir, coopératives) ✅", effort: "0 (agent)", cout: 0, potentiel: "+183K MRR", agent: true },
                      { rank: 6, action: "Performance tracker journalier + auto-ratchet ✅", effort: "0 (agent)", cout: 0, potentiel: "churn 5%→2.5%", agent: true },
                      { rank: 7, action: "Social agents — 30 posts/jour × 10 langues", effort: "0", cout: 100, potentiel: "+25K MRR", agent: true },
                      { rank: 8, action: "Outbound froid multilingue — 2500 leads/sem", effort: "0", cout: 400, potentiel: "+85K MRR", agent: true },
                      { rank: 9, action: "Upsell agent — détection signaux + push auto", effort: "0", cout: 50, potentiel: "+60% upgrades", agent: true },
                      { rank: 10, action: "Churn agent — intervention prédictive", effort: "0", cout: 50, potentiel: "-50% churn", agent: true },
                      { rank: 11, action: "Content agent — rapports sectoriels (lead magnets)", effort: "0", cout: 150, potentiel: "+15K MRR", agent: true },
                      { rank: 12, action: "Tier Enterprise €799 + support dédié", effort: "2h/sem", cout: 0, potentiel: "+143K MRR", agent: false },
                      { rank: 13, action: "API payante (€1.5-5K/mois)", effort: "Setup initial", cout: 200, potentiel: "+90K MRR", agent: false },
                      { rank: 14, action: "Partenariats chambres de commerce", effort: "4h/mois", cout: 0, potentiel: "+60K MRR", agent: false },
                      { rank: 15, action: "Ads Google/Meta optimisés par agent", effort: "Budget à valider", cout: 2000, potentiel: "+80K MRR", agent: true },
                    ].map((row) => (
                      <tr key={row.rank} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                        <td style={{ padding: "8px 8px", fontWeight: 700, color: row.rank <= 5 ? "#10B981" : row.rank <= 10 ? C.gold : C.muted, fontSize: 12 }}>{row.rank}</td>
                        <td style={{ padding: "8px 8px", color: C.text, fontSize: 11 }}>{row.action}</td>
                        <td style={{ padding: "8px 8px", textAlign: "center", fontSize: 11, color: row.effort === "0" ? "#10B981" : C.gold, fontWeight: row.effort === "0" ? 700 : 400 }}>{row.effort === "0" ? "AUCUN" : row.effort}</td>
                        <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: "monospace", fontSize: 11, color: row.cout === 0 ? "#10B981" : C.muted }}>{row.cout === 0 ? "GRATUIT" : `€${row.cout}`}</td>
                        <td style={{ padding: "8px 8px", textAlign: "right", fontSize: 11, fontWeight: 600, color: C.text }}>{row.potentiel}</td>
                        <td style={{ padding: "8px 8px", textAlign: "center", fontSize: 11 }}>{row.agent ? <span style={{ color: "#10B981", fontWeight: 700 }}>✓</span> : <span style={{ color: C.dim }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.1)", fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                  <strong style={{ color: "#10B981" }}>Résumé :</strong> Les 10 premières actions sont <strong style={{ color: C.text }}>100% automatisables</strong> par agents IA, coûtent <strong style={{ color: C.text }}>€1 300/mois total</strong>, et représentent <strong style={{ color: C.text }}>+80% du potentiel MRR</strong>. Ton effort humain total : <strong style={{ color: "#10B981" }}>~2h de setup unique</strong> puis <strong style={{ color: "#10B981" }}>0h/mois</strong>.
                </div>
              </div>

              {/* Grille résumé pricing + mix */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Nouveau pricing benchmarké */}
                <div style={{ background: "rgba(201,168,76,.04)", border: "1px solid rgba(201,168,76,.15)", padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Pricing revu (benchmark marché)</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>Starter (ex-Data)</span><strong style={{ color: C.text }}>€79/mois</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>Pro (ex-Strategy)</span><strong style={{ color: C.text }}>€199/mois</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>Business (NEW)</span><strong style={{ color: "#8B5CF6" }}>€349/mois</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>Enterprise</span><strong style={{ color: "#10B981" }}>€799/mois</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>Custom/API</span><strong style={{ color: "#3B82F6" }}>€1 500-5 000/mois</strong></div>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>Benchmark : Import Genius $99-399, Panjiva $500+, TradeMap enterprise</div>
                </div>

                {/* Mix clients cible 500K */}
                <div style={{ background: "rgba(59,130,246,.04)", border: "1px solid rgba(59,130,246,.15)", padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Mix cible 500K+ MRR</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>~800 Starter × €79</span><strong style={{ color: C.text }}>€63 200</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>~480 Pro × €199</span><strong style={{ color: C.text }}>€95 520</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>~320 Business × €349</span><strong style={{ color: C.text }}>€111 680</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>~180 Enterprise × €799</span><strong style={{ color: C.text }}>€143 820</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "3px 0" }}><span>~30 Custom × €3 000</span><strong style={{ color: C.text }}>€90 000</strong></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: 700 }}><span style={{ color: C.gold }}>TOTAL</span><strong style={{ color: "#10B981" }}>€504 220 MRR</strong></div>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>~1 810 clients payants · Conversion free→paid 12-15%</div>
                </div>
              </div>
            </div>
          </div>
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

      {/* Tabs: Content / Actions */}
      {(() => {
        const done = actions.filter(a => a.status === "done").length;
        const total = actions.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const agentActions = actions.filter(a => a.assignee === "agent");
        const agentDone = agentActions.filter(a => a.status === "done").length;
        const humanActions = actions.filter(a => a.assignee === "human");
        const humanDone = humanActions.filter(a => a.status === "done").length;
        const humanTodo = humanActions.filter(a => a.status !== "done");
        return (
          <>
            <div style={{ background: C.header, borderBottom: C.borderLight, padding: "0 20px", display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
              <button onClick={() => setDetailTab("content")} style={{
                padding: "10px 16px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                color: detailTab === "content" ? C.gold : C.muted,
                background: "transparent", border: "none",
                borderBottom: detailTab === "content" ? "2px solid " + C.gold : "2px solid transparent",
              }}>Contenu</button>
              <button onClick={() => setDetailTab("actions")} style={{
                padding: "10px 16px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                color: detailTab === "actions" ? C.gold : C.muted,
                background: "transparent", border: "none",
                borderBottom: detailTab === "actions" ? "2px solid " + C.gold : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                Actions
                {total > 0 && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: pct === 100 ? "rgba(16,185,129,.15)" : "rgba(201,168,76,.12)", color: pct === 100 ? "#10B981" : C.gold }}>
                    {done}/{total}
                  </span>
                )}
              </button>
            </div>

            {/* Section Tracking dédiée */}
            {total > 0 && (
              <div style={{ background: "rgba(10,26,46,.8)", borderBottom: C.border, padding: "14px 20px", flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
                  Tracking
                </div>

                {/* Barre de progression globale */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600, minWidth: 40 }}>{pct}%</span>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10B981" : C.gold, borderRadius: 4, transition: "width .3s" }} />
                  </div>
                  <span style={{ fontSize: 12, color: C.muted }}>{done}/{total} complétées</span>
                </div>

                {/* Détail par assignee */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {/* Agents IA */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 6 }}>
                    <span style={{ fontSize: 18 }}>🤖</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Agents IA</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{agentDone}/{agentActions.length} tâches</div>
                    </div>
                    <div style={{ width: 50, height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden", marginLeft: 8 }}>
                      <div style={{ height: "100%", width: agentActions.length > 0 ? `${Math.round((agentDone / agentActions.length) * 100)}%` : "0%", background: agentDone === agentActions.length && agentActions.length > 0 ? "#10B981" : C.gold, borderRadius: 3 }} />
                    </div>
                  </div>

                  {/* Actions humaines */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: humanTodo.length > 0 ? "rgba(239,68,68,.06)" : "rgba(16,185,129,.06)", border: `1px solid ${humanTodo.length > 0 ? "rgba(239,68,68,.15)" : "rgba(16,185,129,.15)"}`, borderRadius: 6 }}>
                    <span style={{ fontSize: 18 }}>👤</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Mes actions</div>
                      <div style={{ fontSize: 12, color: humanTodo.length > 0 ? "#EF4444" : C.muted }}>
                        {humanTodo.length > 0 ? `${humanTodo.length} en attente` : `${humanDone}/${humanActions.length} complétées`}
                      </div>
                    </div>
                    <div style={{ width: 50, height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden", marginLeft: 8 }}>
                      <div style={{ height: "100%", width: humanActions.length > 0 ? `${Math.round((humanDone / humanActions.length) * 100)}%` : "0%", background: humanDone === humanActions.length && humanActions.length > 0 ? "#10B981" : "#EF4444", borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section Palier Revenus Théorique — vue détail */}
            {total > 0 && (
              <div style={{ background: "rgba(10,26,46,.6)", borderBottom: C.border, padding: "14px 20px", flexShrink: 0, maxHeight: 300, overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12 }}>
                  Palier Revenus Théorique
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(201,168,76,.2)" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: C.gold, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Palier</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: C.gold, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Objectif</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: C.gold, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Timeline</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: C.gold, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>MRR</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: "#EF4444", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Coûts</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: C.gold, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Marge</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: C.gold, fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Annuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { palier: "M1", label: "609 produits + 300 personas + 206 deals + 270 posts + vidéos 🔄", mois: "Mois 1", mrr: 1210000, couts: 4600, marge: 1205400, benefice: 14464800 },
                        { palier: "M2", label: "2K produits + SEO 30K + Social 500/j + Email 15 langues", mois: "Mois 2", mrr: 1280000, couts: 12000, marge: 1268000, benefice: 15216000 },
                        { palier: "M3", label: "5K produits + SEO 75K + Influencers viraux + geo-pricing", mois: "Mois 3", mrr: 1450000, couts: 87000, marge: 1363000, benefice: 16356000 },
                        { palier: "M4-5", label: "10K produits + 150K SEO + 500 personas + 500 deals + upsell", mois: "Mois 4-5", mrr: 1800000, couts: 108000, marge: 1692000, benefice: 20304000 },
                        { palier: "M6", label: "Traction: 150K pages indexées + 10K produits + churn 2.5%", mois: "Mois 6", mrr: 2200000, couts: 132000, marge: 2068000, benefice: 24816000 },
                        { palier: "M7-9", label: "Enterprise + API B2B + white-label + marketplace + Stripe live", mois: "Mois 7-9", mrr: 3200000, couts: 192000, marge: 3008000, benefice: 36096000 },
                        { palier: "M10-12", label: "50 langues + 20K produits + agent army ×3 + vidéos auto", mois: "Mois 10-12", mrr: 5000000, couts: 300000, marge: 4700000, benefice: 56400000 },
                        { palier: "M13-18", label: "Datasets exclusifs + bureaux régionaux + 50K produits", mois: "Mois 13-18", mrr: 8500000, couts: 510000, marge: 7990000, benefice: 95880000 },
                        { palier: "M19-24", label: "Référence mondiale + IPO ready + 100K produits", mois: "Mois 19-24", mrr: 18000000, couts: 1080000, marge: 16920000, benefice: 203040000 },
                        { palier: "M24+", label: "Exit / IPO: €216M+ ARR, valorisation €2-3B", mois: "Mois 24+", mrr: 25000000, couts: 1500000, marge: 23500000, benefice: 282000000 },
                      ].map((row, idx) => {
                        const isActive = actions.some(a => a.palier === idx + 1 && a.status !== "done");
                        const isDone = actions.filter(a => a.palier === idx + 1).length > 0 && actions.filter(a => a.palier === idx + 1).every(a => a.status === "done");
                        return (
                          <tr key={row.palier} style={{
                            background: isActive ? "rgba(201,168,76,.06)" : isDone ? "rgba(16,185,129,.04)" : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,.04)",
                          }}>
                            <td style={{ padding: "8px 10px", fontWeight: 700, color: isActive ? C.gold : isDone ? "#10B981" : C.muted }}>
                              {isDone ? "✓ " : isActive ? "► " : ""}{row.palier}
                            </td>
                            <td style={{ padding: "8px 10px", color: isActive ? C.text : C.muted, fontSize: 11 }}>{row.label}</td>
                            <td style={{ padding: "8px 10px", color: C.dim, fontSize: 11 }}>{row.mois}</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: row.mrr > 0 ? C.text : C.dim }}>{row.mrr.toLocaleString("fr-FR")} €</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: "#EF4444" }}>-{row.couts.toLocaleString("fr-FR")} €</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: row.marge > 0 ? "#10B981" : "#EF4444" }}>{row.marge > 0 ? "+" : ""}{row.marge.toLocaleString("fr-FR")} €</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: row.benefice > 0 ? "#10B981" : "#EF4444" }}>{row.benefice > 0 ? "+" : ""}{row.benefice.toLocaleString("fr-FR")} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Actions tab */}
      {detailTab === "actions" && (
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "20px 24px" }}>
          {actions.length === 0 ? (
            <div style={{ color: C.dim, fontSize: 13, padding: 40, textAlign: "center" }}>
              Aucune action definie pour ce rapport.
              <br /><span style={{ fontSize: 11 }}>Les actions sont generees automatiquement avec chaque nouveau palier.</span>
            </div>
          ) : (
            <>
              {/* Human actions first */}
              {actions.filter(a => a.assignee === "human").length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>👤</span> Vos actions requises
                  </div>
                  {actions.filter(a => a.assignee === "human").map(a => (
                    <div key={a.id} onClick={() => toggleAction(a.id)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 4,
                      background: a.status === "done" ? "rgba(16,185,129,.05)" : "rgba(239,68,68,.05)",
                      border: `1px solid ${a.status === "done" ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)"}`,
                      cursor: "pointer", transition: "all .15s",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                        border: a.status === "done" ? "2px solid #10B981" : "2px solid rgba(239,68,68,.4)",
                        background: a.status === "done" ? "#10B981" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 12,
                      }}>
                        {a.status === "done" ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 13, color: a.status === "done" ? C.dim : C.text, textDecoration: a.status === "done" ? "line-through" : "none", flex: 1 }}>
                        {a.label}
                      </span>
                      <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(239,68,68,.1)", color: "#EF4444", borderRadius: 3, flexShrink: 0 }}>HUMAIN</span>
                      {a.palier && <span style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>P{a.palier}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Agent actions */}
              {actions.filter(a => a.assignee === "agent").length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🤖</span> Actions agents IA
                  </div>
                  {actions.filter(a => a.assignee === "agent").map(a => (
                    <div key={a.id} onClick={() => toggleAction(a.id)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 4,
                      background: a.status === "done" ? "rgba(16,185,129,.05)" : C.cardAlt,
                      border: a.status === "done" ? "1px solid rgba(16,185,129,.15)" : C.borderLight,
                      cursor: "pointer", transition: "all .15s",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                        border: a.status === "done" ? "2px solid #10B981" : "2px solid rgba(201,168,76,.3)",
                        background: a.status === "done" ? "#10B981" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 12,
                      }}>
                        {a.status === "done" ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 13, color: a.status === "done" ? C.dim : C.muted, textDecoration: a.status === "done" ? "line-through" : "none", flex: 1 }}>
                        {a.label}
                      </span>
                      <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(201,168,76,.08)", color: C.gold, borderRadius: 3, flexShrink: 0 }}>AGENT</span>
                      {a.palier && <span style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>P{a.palier}</span>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Content tab */}
      {detailTab === "content" && (
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: 1, minHeight: 0 }}>
        {/* Chapter nav */}
        {activeReport.chapters.length > 0 && (
          isMobile ? (
            /* Mobile: horizontal scrollable pills */
            <div style={{ display: "flex", gap: 6, padding: "8px 16px", overflowX: "auto", flexShrink: 0, borderBottom: C.borderLight }}>
              {activeReport.chapters.map((ch, i) => (
                <button key={ch.anchor} onClick={() => scrollToChapter(ch.anchor)} style={{
                  padding: "6px 12px", fontSize: 10, whiteSpace: "nowrap",
                  color: activeChapter === ch.anchor ? C.gold : C.muted,
                  background: activeChapter === ch.anchor ? "rgba(201,168,76,.1)" : "rgba(255,255,255,.03)",
                  border: activeChapter === ch.anchor ? "1px solid rgba(201,168,76,.25)" : "1px solid rgba(255,255,255,.06)",
                  borderRadius: 20, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                }}>
                  {i + 1}. {ch.title.length > 20 ? ch.title.slice(0, 20) + "…" : ch.title}
                </button>
              ))}
            </div>
          ) : (
            /* Desktop: sidebar */
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
          )
        )}

        {/* Content */}
        <div ref={contentRef} style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "20px 24px", lineHeight: 1.6 }}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 16 }}>
            Mis à jour le {new Date(activeReport.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            {" · "}{Math.ceil(activeReport.content.length / 1500)} min de lecture
            {" · "}{activeReport.chapters.length} chapitres
          </div>
          {renderContent(activeReport.content, activeReport.chapters)}
        </div>
      </div>
      )}
    </div>
  );
}
