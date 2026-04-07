import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

// POST /api/telegram-webhook — Telegram → Supabase telegram_inbox
export async function POST(req: NextRequest) {
  if (SECRET) {
    const token = req.headers.get("x-telegram-bot-api-secret-token");
    if (token !== SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json();
  const msg = update.message ?? update.channel_post;
  if (!msg) return NextResponse.json({ ok: true });

  const chat_id = String(msg.chat.id);
  const message_id = String(msg.message_id);
  const username = msg.from?.username ?? String(msg.from?.id ?? "unknown");
  const ts = new Date(msg.date * 1000).toISOString();
  const text = msg.text ?? msg.caption ?? "(media)";

  // Insérer dans Supabase (remplace le fichier local)
  await supabase.from("telegram_inbox").insert({
    chat_id, message_id, username, ts, text, status: "pending",
  });

  // Garder uniquement les 50 derniers messages
  const { data: rows } = await supabase
    .from("telegram_inbox")
    .select("id")
    .order("id", { ascending: true });
  if (rows && rows.length > 50) {
    const toDelete = rows.slice(0, rows.length - 50).map(r => r.id);
    await supabase.from("telegram_inbox").delete().in("id", toDelete);
  }

  // Accusé de réception Telegram
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "8238353364:AAGc0qRAlfqRoPd5EHgQvTlqpXrbDRfLWUA";
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text: "👁 Reçu — Claude traitera ton message au prochain prompt.",
      reply_to_message_id: Number(message_id),
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
