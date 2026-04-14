"use client";
import { useState, useEffect } from "react";

const C = {
  card: "#0A1A2E", gold: "#C9A84C", text: "#E8E0D0",
  muted: "#9BA8B8", dim: "#5A6A7A", green: "#10B981",
  purple: "#A78BFA", blue: "#3B82F6",
};

type HumanTask = { id: string; group: string; label: string; url?: string; impact: string };
const HUMAN_TASKS: HumanTask[] = [
  { id: "resend-domain", group: "Outreach", label: "Vérifier ofaops.xyz chez Resend (ajouter MX/SPF/DKIM dans Cloudflare)", url: "https://resend.com/domains", impact: "Débloque 100% de l'outreach email" },
  { id: "spf-merge", group: "Outreach", label: "Fusionner les 3 SPF en un seul record sur Cloudflare DNS ofaops.xyz", url: "https://dash.cloudflare.com", impact: "Évite rejets emails (conflit SPF)" },
  { id: "gemini-1", group: "LLM Capacity", label: "Créer compte Gemini #2 via alias gemini2@ofaops.xyz", url: "https://aistudio.google.com/apikey", impact: "+1500 RPM Gemini gratuit" },
  { id: "gemini-2", group: "LLM Capacity", label: "Créer compte Gemini #3 via alias gemini3@ofaops.xyz", url: "https://aistudio.google.com/apikey", impact: "+1500 RPM Gemini gratuit" },
  { id: "groq-1", group: "LLM Capacity", label: "Créer compte Groq via alias groq@ofaops.xyz", url: "https://console.groq.com/keys", impact: "Boost LLM ultra-rapide free" },
  { id: "together-1", group: "LLM Capacity", label: "Créer compte Together AI ($25 free credits)", url: "https://api.together.xyz/", impact: "+$25 inférence gratuite" },
  { id: "cerebras-1", group: "LLM Capacity", label: "Créer compte Cerebras supplémentaire", url: "https://cloud.cerebras.ai/", impact: "Boost Llama free" },
  { id: "cf-workers-ai", group: "Image Capacity", label: "Créer compte Cloudflare Workers AI #2 via alias cf2@ofaops.xyz", url: "https://dash.cloudflare.com/sign-up", impact: "+10K image gen/jour" },
  { id: "fal-1", group: "Image Capacity", label: "Créer compte fal.ai (free tier)", url: "https://fal.ai/", impact: "Image gen alternative" },
  { id: "hf-1", group: "Image Capacity", label: "Créer compte HuggingFace via alias hf@ofaops.xyz", url: "https://huggingface.co/join", impact: "+inference free + datasets" },
  { id: "callmebot-wa", group: "Multi-channel", label: "Activer CallMeBot WhatsApp (envoyer 'I allow callmebot' à +34 644 71 81 95)", url: "https://www.callmebot.com/blog/free-api-whatsapp-messages/", impact: "WhatsApp gratuit illimité" },
  { id: "twilio-trial", group: "Multi-channel", label: "Créer compte Twilio trial ($15 credit + numéro)", url: "https://www.twilio.com/try-twilio", impact: "SMS + WhatsApp Business" },
  { id: "meta-biz", group: "Multi-channel", label: "Meta Business Suite + IG Developer App", url: "https://business.facebook.com/", impact: "Outreach IG/Messenger" },
  { id: "gcp-200", group: "Scout", label: "Activer GCP Free Trial $200/mo (carte bancaire requise)", url: "https://console.cloud.google.com/freetrial", impact: "Google Places API → +contact info massif" },
  { id: "wise-biz", group: "Settlement", label: "Activer Wise Business (vérification ID)", url: "https://wise.com/business", impact: "Settlement Mobile Money → EUR" },
  { id: "stripe-live", group: "Settlement", label: "Stripe: passer en mode live (vérification entreprise)", url: "https://dashboard.stripe.com/account/onboarding", impact: "Encaisser vrais paiements OFA/FTG" },
  { id: "claude-2", group: "Boost (€20/mo)", label: "Souscrire 2e compte Claude Code (€20)", url: "https://claude.ai/upgrade", impact: "+context parallèle pour Minato" },
  { id: "resend-pro", group: "Boost ($20/mo)", label: "Resend Pro $20/mo (50K emails)", url: "https://resend.com/settings/billing", impact: "500x volume vs free" },
  { id: "stripe-seo-geo-pro-m", group: "OFA Pricing SEO/GEO", label: "Stripe: créer price SEO_GEO_PRO_MONTHLY 29$/mo", url: "https://dashboard.stripe.com/products", impact: "Active tier Pro 29$/mo (+$29 AVG MRR)" },
  { id: "stripe-seo-geo-pro-y", group: "OFA Pricing SEO/GEO", label: "Stripe: price SEO_GEO_PRO_YEARLY 290$/yr (10x)", url: "https://dashboard.stripe.com/products", impact: "Annual Pro prepay" },
  { id: "stripe-seo-geo-elite-m", group: "OFA Pricing SEO/GEO", label: "Stripe: price SEO_GEO_ELITE_MONTHLY 39$/mo", url: "https://dashboard.stripe.com/products", impact: "Tier Elite 39$/mo (no-brainer gap)" },
  { id: "stripe-seo-geo-elite-y", group: "OFA Pricing SEO/GEO", label: "Stripe: price SEO_GEO_ELITE_YEARLY 390$/yr (10x)", url: "https://dashboard.stripe.com/products", impact: "Annual Elite" },
  { id: "vercel-env-stripe-seo-geo", group: "OFA Pricing SEO/GEO", label: "Vercel: pousser STRIPE_PRICE_SEO_GEO_{PRO,ELITE}_{MONTHLY,YEARLY} env vars (site-factory prod)", url: "https://vercel.com/", impact: "Connecte les 4 price IDs au checkout" },
  { id: "supabase-migration-geo-lps", group: "OFA LP GEO", label: "Supabase: appliquer migration 20260414100000_geo_landing_pages.sql", url: "https://supabase.com/dashboard", impact: "Active table geo_landing_pages + RLS" },
  { id: "cron-geo-lps-monthly", group: "OFA LP GEO", label: "Cron mensuel: scripts/generate-geo-lps.ts --tier=pro --limit=100 --publish", url: "", impact: "3 LP/mois/site Pro = trafic SEO+GEO" },
];

export default function HumanTodoPanel() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem("humanTasksDone") || "{}")); } catch {}
  }, []);
  function toggle(id: string) {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    localStorage.setItem("humanTasksDone", JSON.stringify(next));
  }
  const groups = Array.from(new Set(HUMAN_TASKS.map(t => t.group)));
  const totalDone = HUMAN_TASKS.filter(t => done[t.id]).length;
  const pct = (totalDone / HUMAN_TASKS.length) * 100;
  return (
    <div style={{ marginBottom: 24, padding: 16, background: C.card, border: `1px solid rgba(167,139,250,.3)`, borderRadius: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: ".85rem", fontWeight: 700, color: C.purple, letterSpacing: ".05em" }}>🧑 MES ACTIONS — Capacité & Vérifications</div>
          <div style={{ fontSize: ".6rem", color: C.dim, marginTop: 2 }}>Tâches que SEUL Mehdi peut faire (créer comptes, vérifier domaines, signer paiements). Persisté en localStorage.</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: pct >= 100 ? C.green : C.purple }}>{totalDone}/{HUMAN_TASKS.length}</div>
          <div style={{ fontSize: ".55rem", color: C.dim }}>{pct.toFixed(0)}% fait</div>
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, marginBottom: 14 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.purple}, ${C.green})`, borderRadius: 2, transition: "width .5s" }} />
      </div>
      {groups.map(g => {
        const tasks = HUMAN_TASKS.filter(t => t.group === g);
        const groupDone = tasks.filter(t => done[t.id]).length;
        const isCol = collapsed[g];
        return (
          <div key={g} style={{ marginBottom: 8 }}>
            <button onClick={() => setCollapsed({ ...collapsed, [g]: !isCol })} style={{
              width: "100%", textAlign: "left", padding: "6px 8px", background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.06)", color: C.gold, fontFamily: "inherit",
              fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>{isCol ? "▶" : "▼"} {g}</span>
              <span style={{ color: groupDone === tasks.length ? C.green : C.muted }}>{groupDone}/{tasks.length}</span>
            </button>
            {!isCol && tasks.map(t => (
              <div key={t.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px",
                borderBottom: "1px solid rgba(255,255,255,.04)",
                opacity: done[t.id] ? 0.5 : 1,
              }}>
                <input type="checkbox" checked={!!done[t.id]} onChange={() => toggle(t.id)} style={{ marginTop: 3, cursor: "pointer", accentColor: C.purple }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".72rem", color: C.text, textDecoration: done[t.id] ? "line-through" : "none" }}>{t.label}</div>
                  <div style={{ fontSize: ".58rem", color: C.muted, marginTop: 2 }}>→ {t.impact}</div>
                </div>
                {t.url && (
                  <a href={t.url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: ".58rem", color: C.blue, textDecoration: "none",
                    border: `1px solid ${C.blue}`, padding: "3px 8px", borderRadius: 3, whiteSpace: "nowrap",
                  }}>Ouvrir ↗</a>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
