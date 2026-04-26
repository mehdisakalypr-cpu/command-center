import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

const FROM_BY_TYPE: Record<string, string> = {
  contact: "Sanctuary AI Services <contact.saas@gapup.io>",
  dpo: "Sanctuary AI Services DPO <dpo.saas@gapup.io>",
  rgpd: "Sanctuary AI Services DPO <dpo.saas@gapup.io>",
};

const PRODUCT_NAME: Record<string, string> = {
  aici: "AICI", aiplb: "AIPLB", ancf: "ANCF", ftg: "Feel The Gap", ofa: "One For All",
};

export async function GET(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const url = new URL(req.url);
  const product = url.searchParams.get("product");
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 500);
  const s = sb();

  let q = s.from("customer_messages")
    .select("id, product_slug, type, customer_id, name, email, phone, company, subject, message, metadata, received_at, ai_draft, ai_classification, ai_confidence, draft_status, sent_at, thread_id")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (product) q = q.eq("product_slug", product);
  if (status) q = q.eq("draft_status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Aggregate counts per product/status for sidebar
  const { data: counts } = await s.from("customer_messages")
    .select("product_slug, draft_status");

  const productCounts: Record<string, Record<string, number>> = {};
  for (const r of counts ?? []) {
    productCounts[r.product_slug] ??= {};
    productCounts[r.product_slug][r.draft_status] = (productCounts[r.product_slug][r.draft_status] ?? 0) + 1;
  }

  return NextResponse.json({ ok: true, messages: data ?? [], counts: productCounts });
}

type Action = "save_draft" | "approve" | "send" | "discard" | "send_bulk" | "redraft";
type ReqBody = {
  action: Action;
  id?: string;
  ids?: string[];
  ai_draft?: string;
};

export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as ReqBody;
  const s = sb();

  if (body.action === "save_draft") {
    if (!body.id || typeof body.ai_draft !== "string") {
      return NextResponse.json({ ok: false, error: "id + ai_draft required" }, { status: 400 });
    }
    const { error } = await s.from("customer_messages")
      .update({ ai_draft: body.ai_draft, draft_status: "draft_ready" })
      .eq("id", body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve") {
    if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await s.from("customer_messages")
      .update({ draft_status: "approved" })
      .eq("id", body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "discard") {
    if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await s.from("customer_messages")
      .update({ draft_status: "discarded" })
      .eq("id", body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "redraft") {
    if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await s.from("customer_messages")
      .update({ draft_status: "pending", ai_draft: null, ai_classification: null })
      .eq("id", body.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "send" || body.action === "send_bulk") {
    const ids = body.action === "send" ? (body.id ? [body.id] : []) : (body.ids ?? []);
    if (!ids.length) return NextResponse.json({ ok: false, error: "no ids" }, { status: 400 });

    const { data: msgs, error: fetchErr } = await s.from("customer_messages")
      .select("id, product_slug, type, name, email, subject, ai_draft, draft_status")
      .in("id", ids);
    if (fetchErr) return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing" }, { status: 500 });

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const m of msgs ?? []) {
      if (!m.ai_draft) {
        results.push({ id: m.id, ok: false, error: "no draft" });
        continue;
      }
      const fromAddr = FROM_BY_TYPE[m.type] ?? FROM_BY_TYPE.contact;
      const productName = PRODUCT_NAME[m.product_slug] ?? m.product_slug;
      const baseSubject = `Réponse à votre message sur ${productName}`;
      const subject = m.subject ? `${baseSubject} — ${m.subject}` : baseSubject;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromAddr,
            to: [m.email],
            reply_to: fromAddr.match(/<(.+)>/)?.[1] ?? fromAddr,
            subject,
            text: m.ai_draft,
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => `HTTP ${res.status}`);
          throw new Error(err.slice(0, 200));
        }
        await s.from("customer_messages")
          .update({ draft_status: "sent", sent_at: new Date().toISOString() })
          .eq("id", m.id);
        results.push({ id: m.id, ok: true });
      } catch (e) {
        results.push({ id: m.id, ok: false, error: (e as Error).message });
      }
    }
    return NextResponse.json({ ok: results.every((r) => r.ok), results });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
