import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireAuth } from "@/lib/auth";

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
}

// POST /api/bridge — Aria → Claude ou Claude → Aria
export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const { message, direction: dir } = await req.json();
  if (!message?.trim()) return NextResponse.json({ ok: false });

  const direction = dir === "from_claude" ? "from_claude" : "to_claude";

  // Sauvegarde Supabase
  await sb().from("claude_bridge").insert({
    direction,
    message: message.trim(),
    status: "unread",
  });

  // Accusé de réception immédiat pour les messages entrants (to_claude)
  if (direction === "from_claude") return NextResponse.json({ ok: true });

  await sb().from("claude_bridge").insert({
    direction: "from_claude",
    message: JSON.stringify({ type: "received", text: "Message reçu. Claude le traitera au prochain prompt." }),
    status: "unread",
  });

  // Notification email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Command Center <onboarding@resend.dev>",
      to: process.env.ADMIN_EMAIL ?? "",
      subject: "📨 Command Center → Claude : nouveau message",
      html: `
        <div style="font-family:system-ui;background:#0a0a1e;color:#e2e8f0;padding:32px;border-radius:12px">
          <div style="color:#C9A84C;font-weight:700;font-size:13px;letter-spacing:.1em;margin-bottom:12px">COMMAND CENTER → CLAUDE</div>
          <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:16px;font-size:15px;line-height:1.6">
            ${message}
          </div>
          <div style="margin-top:16px;font-size:12px;color:rgba(255,255,255,.3)">
            Pour répondre : <code style="color:#C9A84C">bash /root/monitor/claude-reply.sh "ta réponse"</code>
          </div>
        </div>`,
    });
  } catch { /* email non bloquant */ }

  return NextResponse.json({ ok: true });
}

// GET /api/bridge — Aria lit les réponses de Claude
export async function GET() {
  const denied = await requireAuth(); if (denied) return denied;
  const { data } = await sb()
    .from("claude_bridge")
    .select("*")
    .eq("direction", "from_claude")
    .eq("status", "unread")
    .order("created_at", { ascending: true });

  if (data?.length) {
    // Marquer comme lus
    const ids = data.map((r: { id: number }) => r.id);
    await sb().from("claude_bridge").update({ status: "read" }).in("id", ids);
  }

  return NextResponse.json({ messages: data ?? [] });
}
