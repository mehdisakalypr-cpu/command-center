// Vercel cron — drafts AI replies for new customer_messages.
// Pulls pending rows, builds product context, generates response via Claude.
// Runs every 5 minutes (Pro plan).
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type ClaimedMsg = {
  id: string;
  product_slug: string;
  type: string;
  customer_id: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown>;
};

// Per-product short briefs the LLM uses to ground answers.
const PRODUCT_BRIEF: Record<string, { name: string; pitch: string; pricing: string }> = {
  aici: {
    name: "AICI",
    pitch: "Veille concurrentielle automatisée — snapshots quotidiens des sites concurrents + digest IA hebdo.",
    pricing: "Starter €49/mo · Pro €99/mo · Enterprise €299/mo · 4 durées (mensuel + 12/24/36 mois avec discounts -15/-25/-33%).",
  },
  aiplb: {
    name: "AIPLB",
    pitch: "Détection automatisée d'usage non-licencié de brevets · génération de lettres de mise en demeure · proposition de termes commerciaux.",
    pricing: "Standard $250k upfront + 2.5% royalty · Volume $1.5M + 1.8% (>1M units) · Cross-licence négociée · Settlement-only $500k-$5M.",
  },
  ancf: {
    name: "ANCF",
    pitch: "Cluster SEO complet sur niche identifiée — articles pillar+satellites, calendrier éditorial, source mining.",
    pricing: "Starter €99/mo (1 niche) · Pro €299/mo (3 niches) · Scale €799/mo (10 niches).",
  },
  ftg: {
    name: "Feel The Gap",
    pitch: "Données import/export mondiales + plans business IA pour identifier les opportunités d'arbitrage.",
    pricing: "Explorer free · Data €99/mo · Strategy €299/mo · Premium €799/mo · Enterprise sur devis.",
  },
};

const HOST = "vercel";
const CRON_NAME = "customer-messages-draft";

function authorize(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const token =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return !!process.env.CRON_SECRET && token === process.env.CRON_SECRET;
}

async function heartbeatStart(admin: ReturnType<typeof createSupabaseAdmin>): Promise<number | null> {
  const { data } = await admin.from("cron_runs").insert({ cron_name: CRON_NAME, host: HOST }).select("id").single();
  return data?.id ?? null;
}

async function heartbeatFinish(
  admin: ReturnType<typeof createSupabaseAdmin>,
  id: number | null,
  success: boolean,
  errorMsg: string | null,
  items: number,
) {
  if (!id) return;
  await admin
    .from("cron_runs")
    .update({ finished_at: new Date().toISOString(), success, error_msg: errorMsg, items_processed: items })
    .eq("id", id);
}

async function claimMessage(admin: ReturnType<typeof createSupabaseAdmin>): Promise<ClaimedMsg | null> {
  const { data } = await admin.rpc("claim_pending_message");
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as ClaimedMsg;
}

async function callClaude(opts: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ text: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0.4,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userPrompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  if (!text) throw new Error("anthropic: empty content");
  return { text };
}

function detectLocale(metadata: Record<string, unknown>): string {
  const loc = String((metadata as { locale?: string })?.locale ?? "fr").toLowerCase().split("-")[0];
  return ["fr", "en", "de", "es", "it", "pt"].includes(loc) ? loc : "fr";
}

function buildSystemPrompt(msg: ClaimedMsg, locale: string): string {
  const brief = PRODUCT_BRIEF[msg.product_slug] ?? {
    name: msg.product_slug.toUpperCase(),
    pitch: "(no brief available)",
    pricing: "(contact sales)",
  };
  return `You draft customer-support replies on behalf of Sanctuary AI Services LLC.
The product is "${brief.name}" — ${brief.pitch}
Pricing: ${brief.pricing}

RULES:
- Reply in language code: ${locale}
- Tone: warm, professional, concrete. No marketing fluff.
- 5-12 sentences. Address the customer's question directly.
- If asking for refund / cancellation: confirm 30-day money-back, explain steps.
- If RGPD / data deletion: confirm we'll process within 30 days, state DPO contact.
- If pricing question: cite exact tiers + the 4 durations (Mensuel + 12/24/36 mois discounts).
- Sign with "L'équipe ${brief.name}" / "The ${brief.name} team" / equivalent in user's language.
- DO NOT promise features that aren't in the brief.
- DO NOT mention an internal email address.

ALSO output a one-line classification at the END, separated by a line "--CLASSIFICATION--":
Categories: sales / support / pricing / rgpd / refund / partnership / spam / other
Format: "category | confidence(0-1)"
Example:
--CLASSIFICATION--
support | 0.85`;
}

function buildUserPrompt(msg: ClaimedMsg): string {
  return `Customer message received on ${msg.product_slug}:

From: ${msg.name ?? "(no name)"} <${msg.email}>
Type: ${msg.type}
Subject: ${msg.subject ?? "(no subject)"}
Company: ${msg.company ?? "—"}
Phone: ${msg.phone ?? "—"}

Message:
${msg.message}

Draft a single reply email body (no greeting headers like "Subject:", just the body). Then output classification.`;
}

function parseClassification(reply: string): { draft: string; cat: string; conf: number } {
  const idx = reply.lastIndexOf("--CLASSIFICATION--");
  if (idx === -1) return { draft: reply.trim(), cat: "other", conf: 0.5 };
  const draft = reply.slice(0, idx).trim();
  const tail = reply.slice(idx + "--CLASSIFICATION--".length).trim();
  const m = tail.match(/^([a-z_]+)\s*\|\s*([0-9.]+)/i);
  if (!m) return { draft, cat: "other", conf: 0.5 };
  return { draft, cat: m[1].toLowerCase(), conf: Math.min(1, Math.max(0, parseFloat(m[2]))) };
}

async function processOne(admin: ReturnType<typeof createSupabaseAdmin>, msg: ClaimedMsg) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  const locale = detectLocale(msg.metadata);
  const out = await callClaude({
    apiKey,
    systemPrompt: buildSystemPrompt(msg, locale),
    userPrompt: buildUserPrompt(msg),
  });
  const { draft, cat, conf } = parseClassification(out.text);
  await admin
    .from("customer_messages")
    .update({
      ai_draft: draft,
      ai_classification: cat,
      ai_confidence: conf,
      draft_status: "draft_ready",
    })
    .eq("id", msg.id);
}

async function run(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdmin();
  const hbId = await heartbeatStart(admin);
  let processed = 0;
  let lastError: string | null = null;
  const log: string[] = [];
  const url = new URL(req.url);
  const max = Math.min(parseInt(url.searchParams.get("max") ?? "10", 10) || 10, 30);

  for (let i = 0; i < max; i++) {
    const msg = await claimMessage(admin);
    if (!msg) break;
    try {
      await processOne(admin, msg);
      processed++;
      log.push(`drafted ${msg.id} (${msg.product_slug})`);
    } catch (e) {
      const err = (e as Error).message;
      lastError = err;
      await admin
        .from("customer_messages")
        .update({ draft_status: "failed", ai_draft: null, ai_classification: null })
        .eq("id", msg.id);
      log.push(`FAIL ${msg.id}: ${err.slice(0, 100)}`);
    }
  }

  await heartbeatFinish(admin, hbId, !lastError, lastError, processed);
  return NextResponse.json({ ok: !lastError, processed, log, error: lastError });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
