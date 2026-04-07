import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const IS_VPS = process.env.DEPLOYMENT_ENV === "vps";

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

  // Supabase connectivity
  const { error: sbErr } = await supabase.from("hotels").select("id").limit(1);
  results.push(sbErr ? `Supabase: ERREUR ${sbErr.message}` : "Supabase: OK");

  // Ping services
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

/* ── VPS-only actions (PM2 restart) ─────────────────────────── */
async function vpsAction(cmd: string) {
  if (!IS_VPS) throw new Error("Action PM2 non disponible sur Vercel");
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);
  const { stdout, stderr } = await execAsync(cmd, { timeout: 15_000 });
  return (stdout + stderr).trim().slice(0, 500);
}

/* ── Action dispatcher ──────────────────────────────────────── */
const ACTIONS: Record<string, () => Promise<string>> = {
  "keepalive-supabase": keepaliveSupabase,
  "health-check":       healthCheck,
  "restart-ftg":        () => vpsAction("pm2 restart feel-the-gap"),
  "restart-cc":         () => vpsAction("pm2 restart command-center"),
};

export async function POST(req: NextRequest) {
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
