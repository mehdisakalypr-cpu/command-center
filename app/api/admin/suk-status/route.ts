import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// GET /api/admin/suk-status — Real-time SUK dashboard (Sharingan mode)
export async function GET() {
  const denied = await requireAuth(); if (denied) return denied;
  const supabase = sb();

  const [products, deals, personas, posts, trends] = await Promise.all([
    supabase.from("products_catalog").select("*", { count: "exact", head: true }),
    supabase.from("deal_flows").select("*", { count: "exact", head: true }),
    supabase.from("ai_influencer_personas").select("*", { count: "exact", head: true }),
    supabase.from("social_posts").select("*", { count: "exact", head: true }),
    supabase.from("market_trends").select("*", { count: "exact", head: true }),
  ]);

  // Recent activity (last 5 minutes)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const [recentProducts, recentPosts] = await Promise.all([
    supabase.from("products_catalog").select("*", { count: "exact", head: true }).gte("created_at", fiveMinAgo),
    supabase.from("social_posts").select("*", { count: "exact", head: true }).gte("created_at", fiveMinAgo),
  ]);

  const isActive = (recentProducts.count ?? 0) > 0 || (recentPosts.count ?? 0) > 0;

  return NextResponse.json({
    active: isActive,
    timestamp: new Date().toISOString(),
    counts: {
      products: products.count ?? 0,
      deals: deals.count ?? 0,
      personas: personas.count ?? 0,
      posts: posts.count ?? 0,
      trends: trends.count ?? 0,
    },
    recent: {
      products_5min: recentProducts.count ?? 0,
      posts_5min: recentPosts.count ?? 0,
    },
    total: (products.count ?? 0) + (deals.count ?? 0) + (personas.count ?? 0) + (posts.count ?? 0) + (trends.count ?? 0),
  });
}
