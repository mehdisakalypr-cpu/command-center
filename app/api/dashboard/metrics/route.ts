import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const IS_VPS = process.env.DEPLOYMENT_ENV === "vps";

/* ── VPS metrics (only when running on VPS) ────────────────── */
async function getVpsMetrics() {
  if (!IS_VPS) return null;
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

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
    } catch { /* pm2 not available */ }

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

/* ── The Estate metrics (Supabase) ─────────────────────────── */
async function getEstateMetrics() {
  try {
    const [hotelsRes, vouchersRes, alertsRes, membersRes] = await Promise.all([
      supabase.from("hotels").select("id", { count: "exact", head: true }),
      supabase.from("vouchers").select("status", { count: "exact" }),
      supabase.from("alerts").select("read", { count: "exact" }),
      supabase.from("members").select("id", { count: "exact", head: true }),
    ]);
    const unreadAlerts = (alertsRes.data ?? []).filter((a: { read: boolean }) => !a.read).length;
    const activeVouchers = (vouchersRes.data ?? []).filter((v: { status: string }) => v.status === "active").length;
    return {
      hotels: hotelsRes.count ?? 0,
      vouchers: { total: vouchersRes.count ?? 0, active: activeVouchers },
      alerts: { total: alertsRes.count ?? 0, unread: unreadAlerts },
      members: membersRes.count ?? 0,
    };
  } catch {
    return null;
  }
}

/* ── FTG data stats ──────────────────────────────────────────── */
async function getFtgDataStats() {
  try {
    const [countriesRes, oppsRes] = await Promise.all([
      supabase.from("countries").select("id", { count: "exact", head: true }),
      supabase.from("opportunities").select("id", { count: "exact", head: true }),
    ]);
    return {
      countries: countriesRes.count ?? 0,
      opportunities: oppsRes.count ?? 0,
    };
  } catch {
    return null;
  }
}

/* ── Reports & Shift Dynamics progress ─────────────────────── */
async function getReportsProgress() {
  try {
    const [reportsRes, bpRes, oppsCountryRes, leadsRes, cmsRes] = await Promise.all([
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase.from("business_plans").select("id", { count: "exact", head: true }),
      supabase.from("opportunities").select("country_iso"),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("cms_entries").select("id", { count: "exact", head: true }),
    ]);

    const distinctCountries = new Set((oppsCountryRes.data ?? []).map((r: { country_iso: string }) => r.country_iso)).size;

    return {
      reportsProgress: {
        reports: reportsRes.count ?? 0,
        businessPlans: bpRes.count ?? 0,
        countriesWithOpps: distinctCountries,
      },
      shiftDynamics: {
        cmsEntries: cmsRes.count ?? 0,
        leads: leadsRes.count ?? 0,
      },
    };
  } catch {
    return { reportsProgress: null, shiftDynamics: null };
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

/* ── Monitor logs (VPS only) ─────────────────────────────────── */
async function getLastHealthLog() {
  if (!IS_VPS) return null;
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("tail -3 /root/monitor/logs/health.log 2>/dev/null");
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/* ── Service URLs from env (no more hardcoded duckdns) ──────── */
const SVC_ESTATE = "https://the-estate-fo.netlify.app";
const SVC_SHIFT  = process.env.SHIFT_DYNAMICS_URL ?? "https://consulting-on55melzp-mehdisakalypr-3843s-projects.vercel.app";
const SVC_FTG    = process.env.FTG_URL ?? "https://feel-the-gap.vercel.app";
const SVC_CC     = process.env.NEXT_PUBLIC_BASE_URL ?? "https://command-center-lemon-xi.vercel.app";

/* ── GET /api/dashboard/metrics ─────────────────────────────── */
export async function GET() {
  const denied = await requireAuth(); if (denied) return denied;
  const [vps, ftg, ftgData, estate, estateStatus, shiftStatus, ftgStatus, healthLog, reportsData] = await Promise.all([
    getVpsMetrics(),
    getFtgMetrics(),
    getFtgDataStats(),
    getEstateMetrics(),
    pingService(SVC_ESTATE),
    pingService(SVC_SHIFT),
    pingService(SVC_FTG),
    getLastHealthLog(),
    getReportsProgress(),
  ]);

  return NextResponse.json({
    ts: new Date().toISOString(),
    isVps: IS_VPS,
    vps,
    ftg,
    ftgData,
    estate,
    reportsProgress: reportsData.reportsProgress,
    shiftDynamics: reportsData.shiftDynamics,
    services: {
      theEstate:     { url: SVC_ESTATE, ...estateStatus },
      shiftDynamics: { url: SVC_SHIFT, ...shiftStatus },
      feelTheGap:    { url: SVC_FTG, ...ftgStatus },
      commandCenter: { url: SVC_CC, up: true, latencyMs: 0 },
    },
    lastHealthLog: healthLog,
  }, { headers: { "Cache-Control": "no-store" } });
}
