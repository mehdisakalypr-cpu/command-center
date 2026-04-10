import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/admin/insights?category=strategy
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  let query = sb()
    .from("insights_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/insights — create or update a report
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, title, category, content, chapters, score } = body;

  if (id) {
    // Update existing
    const { data, error } = await sb()
      .from("insights_reports")
      .update({ title, category, content, chapters, score, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Insert new
  const { data, error } = await sb()
    .from("insights_reports")
    .insert({ title, category: category ?? "strategy", content, chapters: chapters ?? [], score })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/insights?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await sb().from("insights_reports").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
