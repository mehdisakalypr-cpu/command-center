import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const s = sb();

  const [healthRes, recentRunsRes] = await Promise.all([
    s.from("cron_health").select("*").order("status").order("cron_name"),
    s.from("cron_runs")
      .select("cron_name, started_at, finished_at, success, duration_ms, items_processed, error_msg")
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    ts: new Date().toISOString(),
    health: healthRes.data ?? [],
    healthError: healthRes.error?.message ?? null,
    recentRuns: recentRunsRes.data ?? [],
    recentRunsError: recentRunsRes.error?.message ?? null,
  });
}
