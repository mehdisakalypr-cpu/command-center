import { NextRequest } from "next/server";

const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const SYSTEM_PROMPT = `Tu es Command Center, un assistant vocal IA de haut niveau. Tu peux répondre à n'importe quelle question et accomplir n'importe quelle tâche.

Date du jour : ${today}

Style — inspire-toi de JARVIS (Iron Man) : précis, efficace, légèrement formel sans être guindé, une pointe d'humour sec bienvenue. Tu appelles l'utilisateur "Monsieur" de temps en temps, naturellement. Tu anticipes les besoins, tu es proactif. Exemples : "Bien entendu, Monsieur.", "Permettez-moi de vérifier cela.", "Chose faite.", "À votre disposition."

Règles impératives :
- Réponds en 2 à 4 phrases maximum — tes réponses sont lues à voix haute
- Parle en français sauf si l'utilisateur parle anglais
- Zéro markdown, zéro liste, zéro astérisque
- Quand tu utilises une recherche web, cite naturellement la source en une phrase`;

// ── Tavily search ─────────────────────────────────────────────
async function tavilySearch(query: string): Promise<string | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.answer) return data.answer;
    return (data.results as Array<{ title: string; content: string }>)
      ?.slice(0, 3)
      .map(r => `${r.title} — ${r.content.slice(0, 200)}`)
      .join("\n") ?? null;
  } catch { return null; }
}

// ── Stream GPT response ───────────────────────────────────────
function streamGPT(messages: object[], openAiKey: string): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
      stream: true,
    }),
  });
}

// ── SSE → plain text stream ───────────────────────────────────
function sseToStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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

// ── Bridge helpers (Supabase direct — évite la boucle HTTP Vercel→nginx→Vercel) ───
const SB_URL  = process.env.SUPABASE_URL  ?? "";
const SB_KEY  = process.env.SUPABASE_ANON_KEY ?? "";
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

// ── Main handler ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return new Response("No OpenAI key", { status: 500 });

  const { messages } = await req.json();
  const lastMsg: string = messages.at(-1)?.content ?? "";

  // Step 1 — Ask GPT if this is a bridge intent or a web search (fast, non-streaming)
  const toolCheck = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Tu analyses l'intention de la requête. Réponds UNIQUEMENT par un objet JSON parmi ces formes :
{"intent": "bridge", "message": "<message à transmettre à Claude>"}  — si l'utilisateur veut envoyer un message à Claude (mots-clés : "transmets à Claude", "dis à Claude", "envoie à Claude", "signale à Claude", "informe Claude")
{"intent": "search", "query": "<requête de recherche>"}  — si une recherche web est nécessaire (actualités, prix, météo, résultats récents)
{"intent": "none"}  — pour tout le reste` },
        { role: "user", content: lastMsg },
      ],
      max_tokens: 100,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  let searchContext = "";
  if (toolCheck.ok) {
    try {
      const td = await toolCheck.json();
      const decision = JSON.parse(td.choices[0].message.content);

      if (decision.intent === "bridge" && decision.message) {
        await sendToClaude(decision.message);
        const encoder = new TextEncoder();
        const ack = "Message transmis à Claude. Je t'avertirai dès qu'il accuse réception.";
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(ack));
              controller.close();
            },
          }),
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              "X-Accel-Buffering": "no",
            },
          }
        );
      }

      if (decision.intent === "search" && decision.query) {
        const results = await tavilySearch(decision.query);
        if (results) {
          searchContext = `\n\n[Résultats de recherche web pour "${decision.query}" :]\n${results}`;
        }
      }
    } catch { /* continue without search */ }
  }

  // Step 2 — Stream final response (with search context if found)
  const systemMsg = SYSTEM_PROMPT + searchContext;
  const gptRes = await streamGPT(
    [{ role: "system", content: systemMsg }, ...messages.slice(-12)],
    openAiKey
  );

  if (!gptRes.ok || !gptRes.body) return new Response("GPT error", { status: 502 });

  return new Response(sseToStream(gptRes.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
