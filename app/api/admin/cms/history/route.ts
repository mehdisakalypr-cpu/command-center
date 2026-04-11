import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const contentId = req.nextUrl.searchParams.get("content_id");
  if (!contentId) return NextResponse.json({ error: "content_id required" }, { status: 400 });
  const { data, error } = await sb().from("cms_history").select("*").eq("content_id", contentId).order("changed_at", { ascending: false }).limit(5);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const { history_id } = await req.json();
  if (!history_id) return NextResponse.json({ error: "history_id required" }, { status: 400 });
  const s = sb();
  const { data: hist, error: hErr } = await s.from("cms_history").select("*").eq("id", history_id).single();
  if (hErr || !hist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: current } = await s.from("cms_content").select("id, value_en, value_fr, metadata").eq("id", hist.content_id).single();
  if (current) await s.from("cms_history").insert({ content_id: current.id, value_en: current.value_en, value_fr: current.value_fr, metadata: current.metadata });

  const { data, error } = await s.from("cms_content").update({ value_en: hist.value_en, value_fr: hist.value_fr, metadata: hist.metadata, updated_at: new Date().toISOString() }).eq("id", hist.content_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: allHist } = await s.from("cms_history").select("id").eq("content_id", hist.content_id).order("changed_at", { ascending: false });
  if (allHist && allHist.length > 5) await s.from("cms_history").delete().in("id", allHist.slice(5).map(h => h.id));

  return NextResponse.json({ ok: true, restored: data });
}
