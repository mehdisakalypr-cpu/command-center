"use client";

import { useState } from "react";
import Link from "next/link";

/* ── Brick catalog ─────────────────────────────────────────────────────────── */

interface Brick {
  id: string;
  name: string;
  category: "auth" | "payment" | "ai" | "data" | "ui" | "infra";
  source: string;
  description: string;
  features: string[];
  deps: string[];
  files: string[];
  status: "ready" | "beta" | "planned";
}

const BRICKS: Brick[] = [
  {
    id: "auth-otp",
    name: "Auth OTP",
    category: "auth",
    source: "Feel The Gap + Command Center",
    description: "Login email/mot de passe + reset par code OTP envoyé par email. Flow complet sans redirect, compatible proxy/middleware.",
    features: ["Login email/password", "OTP 6-8 digits par email", "Reset password", "Session JWT 7 jours", "Rate limiting"],
    deps: ["@supabase/supabase-js", "@supabase/ssr", "jose", "resend"],
    files: ["lib/supabase-server.ts", "app/auth/login/page.tsx", "app/auth/forgot/page.tsx", "app/api/auth/forgot/route.ts", "proxy.ts"],
    status: "ready",
  },
  {
    id: "auth-biometric",
    name: "Auth Biométrique",
    category: "auth",
    source: "Feel The Gap + Command Center",
    description: "WebAuthn FIDO2 pour connexion par empreinte digitale ou Face ID. Registration + authentication avec challenge serveur.",
    features: ["Fingerprint / Face ID", "Registration post-login", "Challenge HMAC", "Multi-device", "Fallback password"],
    deps: ["@simplewebauthn/server", "@simplewebauthn/browser", "supabase"],
    files: ["lib/webauthn.ts", "app/api/auth/webauthn/register/route.ts", "app/api/auth/webauthn/authenticate/route.ts", "app/api/auth/webauthn/check/route.ts"],
    status: "ready",
  },
  {
    id: "auth-gate",
    name: "Auth Gate",
    category: "auth",
    source: "Shift Dynamics",
    description: "Page de garde avec mot de passe partagé pour sites en pré-lancement. Cookie 30 jours, rappel par email.",
    features: ["Mot de passe partagé", "Cookie httpOnly 30j", "Forgot password par email", "Proxy Next.js 16"],
    deps: ["resend"],
    files: ["app/gate/page.tsx", "app/api/gate/route.ts", "app/api/forgot-password/route.ts", "proxy.ts"],
    status: "ready",
  },
  {
    id: "stripe-subs",
    name: "Stripe Subscriptions",
    category: "payment",
    source: "Feel The Gap + Shift Dynamics",
    description: "Intégration Stripe complète : checkout, webhooks, portail client, gestion des tiers d'abonnement.",
    features: ["Checkout sessions", "Webhook handler", "Customer portal", "Tier mapping", "Emails de confirmation", "Promotion codes"],
    deps: ["stripe", "@stripe/stripe-js", "supabase", "resend"],
    files: ["app/api/stripe/checkout/route.ts", "app/api/stripe/webhook/route.ts", "app/api/stripe/portal/route.ts"],
    status: "ready",
  },
  {
    id: "ai-chat",
    name: "AI Chat Widget",
    category: "ai",
    source: "Feel The Gap + Shift Dynamics",
    description: "Widget chat IA intégrable avec streaming SSE, multi-modèles (Gemini, OpenAI, Groq), contexte métier injectable.",
    features: ["Streaming SSE", "Multi-LLM (Gemini, OpenAI, Groq)", "Contexte métier", "Historique conversation", "UI flottante"],
    deps: ["@google/generative-ai", "@ai-sdk/google", "ai", "react"],
    files: ["components/ChatWidget.tsx", "app/api/chat/route.ts", "app/api/advisor/route.ts", "app/api/gemini/route.ts"],
    status: "ready",
  },
  {
    id: "business-plan",
    name: "Business Plan Generator",
    category: "ai",
    source: "Feel The Gap",
    description: "Génération de business plans structurés (JSON) par IA : projections financières, analyse de risques, plan d'action, cibles B2B.",
    features: ["Multi-provider (Groq → Gemini → Mistral)", "JSON structuré", "Projections financières", "Analyse risques", "Plan d'action séquentiel", "Cibles B2B"],
    deps: ["@google/generative-ai"],
    files: ["app/api/reports/business-plan/route.ts", "app/reports/[iso]/business-plan/page.tsx"],
    status: "ready",
  },
  {
    id: "world-map",
    name: "World Map Interactive",
    category: "data",
    source: "Feel The Gap",
    description: "Carte mondiale interactive avec Leaflet : données par pays, scoring d'opportunités, filtres par catégorie, panneau de détails.",
    features: ["Leaflet SSR-safe", "Color coding par score", "Click → panneau détails", "Filtres catégories", "Responsive zoom/pan"],
    deps: ["leaflet", "react-leaflet", "supabase"],
    files: ["components/WorldMap.tsx", "components/MapLoader.tsx", "components/CountryPanel.tsx", "components/CategoryFilter.tsx"],
    status: "ready",
  },
  {
    id: "cms-bilingual",
    name: "CMS Bilingue",
    category: "ui",
    source: "Shift Dynamics",
    description: "Système de gestion de contenu bilingue (FR/EN) avec Supabase : texte, vidéo YouTube, organisation par verticale.",
    features: ["FR/EN", "Texte + vidéo", "Admin CRUD", "YouTube embed privacy", "Organisation par vertical"],
    deps: ["supabase", "react"],
    files: ["lib/cms.ts", "components/cms/CmsSection.tsx", "app/api/cms/route.ts", "app/[locale]/admin/page.tsx"],
    status: "ready",
  },
  {
    id: "email-service",
    name: "Email Service",
    category: "infra",
    source: "Tous les projets",
    description: "Service d'envoi d'emails transactionnels via Resend : templates HTML, reset password, confirmations, 2FA.",
    features: ["Templates HTML branded", "Reset password", "Confirmations", "2FA codes", "CORS support"],
    deps: ["resend"],
    files: ["app/api/estate/reset-request/route.ts", "app/api/estate/send-2fa/route.ts"],
    status: "ready",
  },
  {
    id: "paywall",
    name: "Paywall & Tiers",
    category: "payment",
    source: "Feel The Gap",
    description: "Composant de verrouillage par abonnement : blur preview, vérification tier, CTA upgrade, compteur de crédits.",
    features: ["Blur preview", "5 tiers (explorer → enterprise)", "Credit counter", "Upgrade CTA", "Supabase tier check"],
    deps: ["supabase", "react"],
    files: ["components/PaywallGate.tsx", "components/CreditCounter.tsx"],
    status: "ready",
  },
  {
    id: "voice-stt-tts",
    name: "Voice STT/TTS",
    category: "ai",
    source: "Command Center + Shift Dynamics",
    description: "Services voix : transcription Whisper (STT) et synthèse vocale OpenAI (TTS) avec sélection de voix.",
    features: ["Whisper transcription", "OpenAI TTS", "Multi-voix (onyx, echo, nova...)", "Audio streaming", "Push-to-talk UI"],
    deps: ["openai"],
    files: ["app/api/stt/route.ts", "app/api/tts/route.ts", "app/api/voice/route.ts"],
    status: "ready",
  },
  {
    id: "analytics",
    name: "Analytics Tracker",
    category: "infra",
    source: "Feel The Gap",
    description: "Tracking d'événements léger côté client, stocké dans Supabase. Sessions, pages vues, clics, conversions.",
    features: ["Fire-and-forget", "Session tracking", "Event categorization", "Zero impact UI", "Supabase storage"],
    deps: ["supabase"],
    files: ["lib/tracking.ts", "app/api/track/route.ts"],
    status: "ready",
  },
];

const CATEGORIES = [
  { id: "all", label: "Tout", icon: "◈" },
  { id: "auth", label: "Auth", icon: "🔐" },
  { id: "payment", label: "Paiement", icon: "💳" },
  { id: "ai", label: "IA", icon: "🤖" },
  { id: "data", label: "Data", icon: "🗺️" },
  { id: "ui", label: "UI/CMS", icon: "🎨" },
  { id: "infra", label: "Infra", icon: "⚙️" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  ready: "#10B981",
  beta: "#F59E0B",
  planned: "#6B7280",
};

/* ── Page component ────────────────────────────────────────────────────────── */

export default function BuildPage() {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "all" ? BRICKS : BRICKS.filter(b => b.category === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "monospace" }}>
      {/* Header */}
      <header style={{
        padding: "20px 24px",
        borderBottom: "1px solid #222",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "#666", textDecoration: "none", fontSize: "0.8rem" }}>← Hub</Link>
          <h1 style={{ fontSize: "1rem", margin: 0, letterSpacing: 2, color: "#1a6fff" }}>BUILD</h1>
          <span style={{ fontSize: "0.7rem", color: "#444", background: "#1a1a1a", padding: "2px 8px", borderRadius: 4 }}>
            {BRICKS.length} briques
          </span>
        </div>
        <div style={{ fontSize: "0.65rem", color: "#444" }}>
          {BRICKS.filter(b => b.status === "ready").length} ready · {BRICKS.filter(b => b.status === "beta").length} beta
        </div>
      </header>

      {/* Category filter */}
      <div style={{ padding: "16px 24px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            style={{
              background: filter === c.id ? "#1a6fff" : "#151515",
              border: `1px solid ${filter === c.id ? "#1a6fff" : "#333"}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: "0.75rem",
              color: filter === c.id ? "#fff" : "#888",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Brick grid */}
      <div style={{ padding: "8px 24px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filtered.map(brick => {
          const isExpanded = expanded === brick.id;
          return (
            <div
              key={brick.id}
              onClick={() => setExpanded(isExpanded ? null : brick.id)}
              style={{
                background: "#111",
                border: `1px solid ${isExpanded ? "#1a6fff33" : "#222"}`,
                borderRadius: 10,
                padding: "20px",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "#fff" }}>{brick.name}</h3>
                  <p style={{ fontSize: "0.65rem", color: "#555", margin: "4px 0 0" }}>{brick.source}</p>
                </div>
                <span style={{
                  fontSize: "0.6rem",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: `${STATUS_COLORS[brick.status]}22`,
                  color: STATUS_COLORS[brick.status],
                  border: `1px solid ${STATUS_COLORS[brick.status]}44`,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}>
                  {brick.status}
                </span>
              </div>

              {/* Description */}
              <p style={{ fontSize: "0.75rem", color: "#888", lineHeight: 1.5, margin: "0 0 12px" }}>
                {brick.description}
              </p>

              {/* Features */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: isExpanded ? 16 : 0 }}>
                {brick.features.slice(0, isExpanded ? undefined : 3).map(f => (
                  <span key={f} style={{
                    fontSize: "0.6rem",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "#1a1a1a",
                    color: "#666",
                    border: "1px solid #2a2a2a",
                  }}>
                    {f}
                  </span>
                ))}
                {!isExpanded && brick.features.length > 3 && (
                  <span style={{ fontSize: "0.6rem", color: "#444", padding: "2px 4px" }}>
                    +{brick.features.length - 3}
                  </span>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #222", paddingTop: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Dépendances</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {brick.deps.map(d => (
                        <code key={d} style={{
                          fontSize: "0.6rem", padding: "2px 6px", borderRadius: 3,
                          background: "#0d1117", color: "#1a6fff", border: "1px solid #1a3a5c",
                        }}>{d}</code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.6rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Fichiers clés</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {brick.files.map(f => (
                        <code key={f} style={{ fontSize: "0.6rem", color: "#4a4a4a" }}>{f}</code>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
