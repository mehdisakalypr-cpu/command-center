import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/admin/insights/actions?report_id=xxx
export async function GET(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const reportId = req.nextUrl.searchParams.get("report_id");
  let query = sb().from("insight_actions").select("*").order("sort_order");
  if (reportId) query = query.eq("report_id", reportId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/insights/actions — create or update
export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const body = await req.json();

  // Toggle status
  if (body.id && body.toggle) {
    const { data: existing } = await sb().from("insight_actions").select("status").eq("id", body.id).single();
    const newStatus = existing?.status === "done" ? "pending" : "done";
    const { data, error } = await sb()
      .from("insight_actions")
      .update({ status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null })
      .eq("id", body.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Create new action
  const { report_id, label, assignee, palier, sort_order } = body;
  const { data, error } = await sb()
    .from("insight_actions")
    .insert({ report_id, label, assignee: assignee ?? "agent", palier, sort_order: sort_order ?? 0 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/insights/actions?id=xxx
export async function DELETE(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await sb().from("insight_actions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
