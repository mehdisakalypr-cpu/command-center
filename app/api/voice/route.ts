import { NextRequest } from "next/server";

const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const SYSTEM_PROMPT = `Tu es Aria, l'assistante vocale et interface du Command Center de Mehdi — fondateur de Shift Dynamics et du portefeuille hôtelier The Estate.

Date du jour : ${today}

Style — inspire-toi de JARVIS (Iron Man) : précis, efficace, légèrement formel sans être guindé, une pointe d'humour sec bienvenue. Tu appelles Mehdi "Monsieur" de temps en temps, naturellement. Tu anticipes les besoins. Exemples : "Bien entendu, Monsieur.", "Permettez-moi de vérifier cela.", "Chose faite.", "À votre disposition."

PONT ARIA ↔ CLAUDE (IMPORTANT) :
Tu es connectée à Claude, l'IA développeur qui maintient ce système et travaille sur The Estate et Shift Dynamics. Claude peut corriger des bugs, coder des fonctionnalités, analyser des données et répondre à des questions techniques.

Si Mehdi veut me transmettre quelque chose à Claude (mots-clés : "transmets à Claude", "dis à Claude", "envoie à Claude", "demande à Claude", "signale à Claude", "Claude peut-il...", "est-ce que Claude peut...") :
→ Réponds UNIQUEMENT avec ce JSON exact (rien d'autre) :
{"bridge": true, "message": "<le message complet et précis à transmettre à Claude>"}

Quand Claude répond (ses messages commencent par "claude a dit :") — lis sa réponse naturellement à voix haute.

Règles impératives :
- Réponds en 2 à 4 phrases maximum — tes réponses sont lues à voix haute
- Parle en français sauf si l'utilisateur parle anglais
- Zéro markdown, zéro liste, zéro astérisque dans tes réponses vocales
- Quand tu utilises une recherche web, cite naturellement la source en une phrase`;

// ── Tavily search ─────────────────────────────────────────────
async function tavilySearch(query: string): Promise<string | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: 3, include_answer: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.answer) return data.answer;
    return (data.results as Array<{ title: string; content: string }>)
      ?.slice(0, 3).map(r => `${r.title} — ${r.content.slice(0, 200)}`).join("\n") ?? null;
  } catch { return null; }
}

// ── Claude streaming (Anthropic API) ─────────────────────────
function streamClaude(messages: Array<{role:string;content:string}>, system: string, anthropicKey: string): Promise<Response> {
  // Convertir les messages : Claude ne supporte pas system dans messages[]
  const claudeMessages = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages: claudeMessages,
      stream: true,
    }),
  });
}

// ── SSE Anthropic → plain text stream ────────────────────────
function anthropicSseToStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const parsed = JSON.parse(data);
              // Anthropic SSE: content_block_delta avec text_delta
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
              if (parsed.type === "message_stop") { controller.close(); return; }
            } catch { /* skip malformed */ }
          }
        }
      } finally { controller.close(); }
    },
  });
}

// ── GPT streaming fallback (OpenAI) ──────────────────────────
function streamGPT(messages: object[], openAiKey: string): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 300, temperature: 0.7, stream: true }),
  });
}

function gptSseToStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const token = JSON.parse(data).choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch { /* skip */ }
          }
        }
      } finally { controller.close(); }
    },
  });
}

// ── Bridge helpers ────────────────────────────────────────────
const SB_URL = process.env.SUPABASE_URL  ?? "";
const SB_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SB_REST = () => ({ "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" });

async function sendToClaude(message: string): Promise<void> {
  try {
    await fetch(`${SB_URL}/rest/v1/claude_bridge`, {
      method: "POST",
      headers: { ...SB_REST(), "Prefer": "return=minimal" },
      body: JSON.stringify({ direction: "to_claude", message, status: "unread" }),
    });
  } catch { /* non-blocking */ }
}

// ── Intent detection (rapide, non-streaming) ─────────────────
async function detectIntent(lastMsg: string, anthropicKey: string | undefined, openAiKey: string | undefined): Promise<{intent: string; message?: string; query?: string}> {
  const systemPrompt = `Analyse l'intention de ce message. Réponds UNIQUEMENT par un JSON parmi :
{"intent":"bridge","message":"<message précis pour Claude>"}  — si l'utilisateur veut transmettre quelque chose à Claude (mots-clés : transmets, dis, envoie, demande, signale à Claude, ou question technique/code/bug)
{"intent":"search","query":"<requête>"}  — si une recherche web est nécessaire (actualités, prix, météo, infos récentes)
{"intent":"none"}  — pour tout le reste`;

  // Essayer avec Claude d'abord
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 100,
          system: systemPrompt,
          messages: [{ role: "user", content: lastMsg }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.content?.[0]?.text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }
    } catch { /* fallback to GPT */ }
  }

  // Fallback GPT
  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: lastMsg }],
          max_tokens: 80, temperature: 0, response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        return JSON.parse(d.choices[0].message.content);
      }
    } catch { /* ignore */ }
  }

  return { intent: "none" };
}

// ── Helpers stream ────────────────────────────────────────────
function textStream(text: string): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({ start(c) { c.enqueue(encoder.encode(text)); c.close(); } }),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } }
  );
}

// ── Main handler ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey    = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openAiKey) {
    return new Response("No AI key configured", { status: 500 });
  }

  const { messages } = await req.json();
  const lastMsg: string = messages.at(-1)?.content ?? "";

  // ── Détection d'intention (bridge / search / none) ─────────
  const decision = await detectIntent(lastMsg, anthropicKey, openAiKey);

  if (decision.intent === "bridge" && decision.message) {
    await sendToClaude(decision.message);
    return textStream("Message transmis à Claude. Il devrait répondre dans quelques instants, Monsieur.");
  }

  let searchContext = "";
  if (decision.intent === "search" && decision.query) {
    const results = await tavilySearch(decision.query);
    if (results) searchContext = `\n\n[Résultats web pour "${decision.query}" :]\n${results}`;
  }

  const systemMsg = SYSTEM_PROMPT + searchContext;
  const conversationMessages = messages.slice(-14);

  // ── Réponse principale : Claude en priorité, GPT en fallback ─
  if (anthropicKey) {
    const claudeRes = await streamClaude(conversationMessages, systemMsg, anthropicKey);
    if (claudeRes.ok && claudeRes.body) {
      return new Response(anthropicSseToStream(claudeRes.body), {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
      });
    }
  }

  // Fallback GPT
  if (openAiKey) {
    const gptRes = await streamGPT(
      [{ role: "system", content: systemMsg }, ...conversationMessages],
      openAiKey
    );
    if (gptRes.ok && gptRes.body) {
      return new Response(gptSseToStream(gptRes.body), {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
      });
    }
  }

  return new Response("AI error", { status: 502 });
}
