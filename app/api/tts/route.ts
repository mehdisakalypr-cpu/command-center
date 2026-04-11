import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return new Response("No key", { status: 500 });

  const { text, voice = "onyx" } = await req.json();
  if (!text?.trim()) return new Response("No text", { status: 400 });

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      response_format: "mp3",
    }),
  });

  if (!res.ok) return new Response("TTS error", { status: 502 });

  const audio = await res.arrayBuffer();
  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
