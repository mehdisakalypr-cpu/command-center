import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
);

/* ── Keepalive Supabase: simple query (works everywhere) ───── */
async function keepaliveSupabase() {
  const { count, error } = await supabase
    .from("hotels")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return `Supabase OK — ${count} hotels pingés`;
}

/* ── Health check: Supabase-based (works everywhere) ────────── */
async function healthCheck() {
  const results: string[] = [];
  const start = Date.now();

  const { error: sbErr } = await supabase.from("hotels").select("id").limit(1);
  results.push(sbErr ? `Supabase: ERREUR ${sbErr.message}` : "Supabase: OK");

  const urls = [
    ["The Estate", "https://the-estate-fo.netlify.app"],
    ["Shift Dynamics", process.env.SHIFT_DYNAMICS_URL ?? "https://consulting-on55melzp-mehdisakalypr-3843s-projects.vercel.app"],
    ["Feel The Gap", process.env.FTG_URL ?? "https://feel-the-gap.vercel.app"],
  ];
  for (const [name, url] of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
      clearTimeout(timer);
      results.push(`${name}: ${res.ok ? "OK" : res.status}`);
    } catch {
      results.push(`${name}: HORS LIGNE`);
    }
  }

  results.push(`Durée: ${Date.now() - start}ms`);
  return results.join("\n");
}

/* ── VPS actions: enqueue into remote_action_requests. VPS cron polls. ── */
async function enqueueRemoteAction(action: string, command: string, requestedBy?: string) {
  const { data, error } = await supabase
    .from("remote_action_requests")
    .insert({ action, command, requested_by: requestedBy ?? null, status: "pending" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return `Action "${action}" mise en file d'attente (id=${data?.id}). Le cron VPS l'exécutera sous ~1 min.`;
}

/* ── Action dispatcher ──────────────────────────────────────── */
const ACTIONS: Record<string, () => Promise<string>> = {
  "keepalive-supabase": keepaliveSupabase,
  "health-check":       healthCheck,
  "restart-ftg":        () => enqueueRemoteAction("restart-ftg", "pm2 restart feel-the-gap"),
  "restart-cc":         () => enqueueRemoteAction("restart-cc", "pm2 restart command-center"),
};

export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const { action } = await req.json().catch(() => ({}));
  const handler = ACTIONS[action];
  if (!handler) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }
  try {
    const output = await handler();
    return NextResponse.json({ ok: true, output });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
