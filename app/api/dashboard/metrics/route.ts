import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Kept for UI compatibility; now reflects whether a fresh infra_samples row is available.
const IS_VPS = process.env.DEPLOYMENT_ENV === "vps";

/* ── VPS metrics: read latest row from infra_samples (VPS cron pushes it). ─ */
async function getVpsMetrics() {
  try {
    const { data } = await supabase
      .from("infra_samples")
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (!row) return null;
    const total = Number(row.ram_total_mb ?? 0);
    const used = Number(row.ram_used_mb ?? 0);
    const available = Number(row.ram_free_mb ?? 0);
    return {
      ram: { total, used, available, pct: total > 0 ? Math.round((used / total) * 100) : 0 },
      disk: { total: row.disk_total, used: row.disk_used, free: row.disk_free, pct: row.disk_pct },
      pm2: Array.isArray(row.pm2_processes) ? row.pm2_processes : [],
      captured_at: row.captured_at,
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

/* ── Monitor logs: read health_tail from last infra_samples row ──────── */
async function getLastHealthLog() {
  try {
    const { data } = await supabase
      .from("infra_samples")
      .select("health_tail")
      .order("captured_at", { ascending: false })
      .limit(1);
    return data?.[0]?.health_tail ?? null;
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
