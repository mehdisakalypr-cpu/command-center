import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get("site");
  const collection = req.nextUrl.searchParams.get("collection");

  let query = sb().from("cms_content").select("*").order("order");
  if (site) query = query.eq("site", site);
  if (collection) query = query.eq("collection", collection);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { site, collection, slug, field_type, value_en, value_fr, metadata, order, published } = body;
  if (!site || !collection || !slug) return NextResponse.json({ error: "site, collection, slug required" }, { status: 400 });

  const s = sb();
  const { data: existing } = await s.from("cms_content").select("id, value_en, value_fr, metadata").eq("site", site).eq("collection", collection).eq("slug", slug).single();

  const row = { site, collection, slug, field_type: field_type ?? "text", value_en: value_en ?? "", value_fr: value_fr ?? "", metadata: metadata ?? {}, order: order ?? 0, published: published ?? true, updated_at: new Date().toISOString() };
  const { data, error } = await s.from("cms_content").upsert(row, { onConflict: "site,collection,slug" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing && (existing.value_en !== value_en || existing.value_fr !== value_fr)) {
    await s.from("cms_history").insert({ content_id: data.id, value_en: existing.value_en, value_fr: existing.value_fr, metadata: existing.metadata });
    const { data: hist } = await s.from("cms_history").select("id").eq("content_id", data.id).order("changed_at", { ascending: false });
    if (hist && hist.length > 5) await s.from("cms_history").delete().in("id", hist.slice(5).map(h => h.id));
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await sb().from("cms_content").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
