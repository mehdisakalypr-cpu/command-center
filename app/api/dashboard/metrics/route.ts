import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { createClient } from "@supabase/supabase-js";

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

/* ── VPS metrics ─────────────────────────────────────────────── */
async function getVpsMetrics() {
  try {
    const [memOut, dfOut, pm2Out] = await Promise.all([
      execAsync("free -m | awk 'NR==2{print $2,$3,$7}'"),
      execAsync("df -h / | awk 'NR==2{print $2,$3,$4,$5}'"),
      execAsync("pm2 jlist 2>/dev/null"),
    ]);

    const [total, used, available] = memOut.stdout.trim().split(" ").map(Number);
    const [diskTotal, diskUsed, diskFree, diskPct] = dfOut.stdout.trim().split(" ");

    let pm2Processes: Array<{ name: string; status: string; memory: number; restarts: number }> = [];
    try {
      const raw = JSON.parse(pm2Out.stdout);
      type Pm2Proc = { name: string; pm2_env?: { status?: string; restart_time?: number }; monit?: { memory?: number } };
      pm2Processes = raw.map((p: Pm2Proc) => ({
        name: p.name,
        status: p.pm2_env?.status ?? "unknown",
        memory: Math.round((p.monit?.memory ?? 0) / 1024 / 1024),
        restarts: p.pm2_env?.restart_time ?? 0,
      }));
    } catch { /* pm2 not available or parse error */ }

    return {
      ram: { total, used, available, pct: Math.round((used / total) * 100) },
      disk: { total: diskTotal, used: diskUsed, free: diskFree, pct: diskPct },
      pm2: pm2Processes,
    };
  } catch {
    return null;
  }
}

/* ── Feel The Gap metrics (Supabase) ────────────────────────── */
async function getFtgMetrics() {
  try {
    const [profilesRes, creditsRes] = await Promise.all([
      supabase.from("profiles").select("tier, created_at"),
      supabase.from("profiles").select("ai_credits").gt("ai_credits", 0),
    ]);

    const profiles = profilesRes.data ?? [];
    const tiers: Record<string, number> = {};
    for (const p of profiles) {
      tiers[p.tier ?? "explorer"] = (tiers[p.tier ?? "explorer"] ?? 0) + 1;
    }

    // New users last 7 days
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const newUsers = profiles.filter(p => p.created_at >= since).length;

    return {
      total: profiles.length,
      tiers,
      newLast7d: newUsers,
      withCredits: creditsRes.data?.length ?? 0,
    };
  } catch {
    return null;
  }
}

/* ── Service uptime ping ─────────────────────────────────────── */
async function pingService(url: string, timeoutMs = 5000): Promise<{ up: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    clearTimeout(timer);
    return { up: res.ok || res.status < 500, latencyMs: Date.now() - start };
  } catch {
    return { up: false, latencyMs: Date.now() - start };
  }
}

/* ── Monitor logs (last health check) ───────────────────────── */
async function getLastHealthLog() {
  try {
    const { stdout } = await execAsync("tail -3 /root/monitor/logs/health.log 2>/dev/null");
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/* ── GET /api/dashboard/metrics ─────────────────────────────── */
export async function GET() {
  const [vps, ftg, estateStatus, shiftStatus, ftgStatus, healthLog] = await Promise.all([
    getVpsMetrics(),
    getFtgMetrics(),
    pingService("https://the-estate-fo.netlify.app"),
    pingService("https://consulting-on55melzp-mehdisakalypr-3843s-projects.vercel.app"),
    pingService("https://feel-the-gap.duckdns.org"),
    getLastHealthLog(),
  ]);

  return NextResponse.json({
    ts: new Date().toISOString(),
    vps,
    ftg,
    services: {
      theEstate: { url: "https://the-estate-fo.netlify.app", ...estateStatus },
      shiftDynamics: { url: "https://consulting-on55melzp-mehdisakalypr-3843s-projects.vercel.app", ...shiftStatus },
      feelTheGap: { url: "https://feel-the-gap.duckdns.org", ...ftgStatus },
      commandCenter: { url: "https://command-center01.duckdns.org", up: true, latencyMs: 0 },
    },
    lastHealthLog: healthLog,
  }, { headers: { "Cache-Control": "no-store" } });
}
