import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/admin/stats — aggregate stats for admin pages
export async function GET() {
  const denied = await requireAuth(); if (denied) return denied;
  const s = sb();

  const [profiles, countries, opportunities, businessPlans, reports] = await Promise.all([
    s.from("profiles").select("id, tier, is_billed, is_admin, is_delegate_admin, ai_credits, created_at", { count: "exact" }),
    s.from("countries").select("id", { count: "exact" }),
    s.from("opportunities").select("id", { count: "exact" }),
    s.from("business_plans").select("id", { count: "exact" }),
    s.from("reports").select("id", { count: "exact" }),
  ]);

  const allProfiles = profiles.data ?? [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tiers: Record<string, number> = {};
  let billed = 0, demo = 0, admins = 0, withCredits = 0, newLast7d = 0;

  for (const p of allProfiles) {
    const t = p.tier ?? "explorer";
    tiers[t] = (tiers[t] ?? 0) + 1;
    if (p.is_billed) billed++;
    if (!p.is_billed && !p.is_admin) demo++;
    if (p.is_admin || p.is_delegate_admin) admins++;
    if ((p.ai_credits ?? 0) > 0) withCredits++;
    if (new Date(p.created_at) > weekAgo) newLast7d++;
  }

  return NextResponse.json({
    total: allProfiles.length,
    billed,
    demo,
    admins,
    withCredits,
    newLast7d,
    tiers,
    countries: countries.count ?? 0,
    opportunities: opportunities.count ?? 0,
    businessPlans: (businessPlans as { count: number | null }).count ?? 0,
    reports: (reports as { count: number | null }).count ?? 0,
  });
}
