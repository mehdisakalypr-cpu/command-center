import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return NextResponse.json({ error: "No key" }, { status: 500 });

  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

  const whisperForm = new FormData();
  whisperForm.append("file", audio, audio.name || "audio.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "fr");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: whisperForm,
  });

  if (!res.ok) return NextResponse.json({ error: "Whisper error" }, { status: 502 });
  const { text } = await res.json();
  return NextResponse.json({ text: text ?? "" });
}
