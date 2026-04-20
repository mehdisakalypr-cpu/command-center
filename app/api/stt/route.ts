import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

type Provider = { name: string; url: string; key: string | undefined; model: string };

const PROVIDERS: Provider[] = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    key: process.env.GROQ_API_KEY,
    model: "whisper-large-v3-turbo",
  },
  {
    name: "openai",
    url: "https://api.openai.com/v1/audio/transcriptions",
    key: process.env.OPENAI_API_KEY,
    model: "whisper-1",
  },
];

export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;

  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

  const available = PROVIDERS.filter((p) => p.key);
  if (available.length === 0) {
    return NextResponse.json({ error: "No STT key configured" }, { status: 500 });
  }

  let lastError = "";
  for (const provider of available) {
    const body = new FormData();
    body.append("file", audio, audio.name || "audio.webm");
    body.append("model", provider.model);
    body.append("language", "fr");

    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.key}` },
        body,
      });
      if (res.ok) {
        const { text } = await res.json();
        return NextResponse.json({ text: text ?? "", provider: provider.name });
      }
      lastError = `${provider.name}:${res.status}`;
    } catch (err) {
      lastError = `${provider.name}:${(err as Error).message}`;
    }
  }

  return NextResponse.json({ error: `STT failed (${lastError})` }, { status: 502 });
}
