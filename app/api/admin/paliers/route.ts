import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Table: paliers_revenue in Supabase — always up to date
// GET /api/admin/paliers — returns current palier data
export async function GET() {
  const denied = await requireAuth(); if (denied) return denied;
  const { data, error } = await sb()
    .from("paliers_revenue")
    .select("*")
    .order("palier_num", { ascending: true });

  if (error) {
    // Table might not exist yet — return hardcoded fallback
    return NextResponse.json(FALLBACK_PALIERS);
  }

  return NextResponse.json(data?.length ? data : FALLBACK_PALIERS);
}

// POST /api/admin/paliers — update all paliers (called by agents)
export async function POST(req: Request) {
  const denied = await requireAuth(); if (denied) return denied;
  const body = await req.json();
  const { paliers } = body;

  if (!Array.isArray(paliers)) {
    return NextResponse.json({ error: "paliers array required" }, { status: 400 });
  }

  for (const p of paliers) {
    await sb().from("paliers_revenue").upsert(
      {
        palier_num: p.palier_num,
        label: p.label,
        timeline: p.timeline,
        mrr: p.mrr,
        costs: p.costs,
        margin: p.margin,
        annual_profit: p.annual_profit,
        status: p.status ?? "planned",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "palier_num" }
    );
  }

  return NextResponse.json({ ok: true, count: paliers.length });
}

// Fallback data when table doesn't exist yet
// SCÉNARIO PARALLÉLISÉ CHRONOLOGIQUE — Tous les agents en simultané dès M1
// Mis à jour: 2026-04-11 — Lecture mois par mois, on voit le CA généré chaque période
const FALLBACK_PALIERS = [
  { palier_num: 1, label: "M1 — Lancement: 34 agents, 5,500+ produits, 509 deals, 300 personas, 15 langues, geo-pricing PPP, 7 crons R&B, 100+ email templates", timeline: "Mois 1", mrr: 1210000, costs: 4600, margin: 1205400, annual_profit: 14464800, status: "in_progress" },
  { palier_num: 2, label: "M2 — Scale: 10,000 produits + SEO 30K pages + Social 500/j + churn reduction 2.5%", timeline: "Mois 2", mrr: 1280000, costs: 12000, margin: 1268000, annual_profit: 15216000, status: "planned" },
  { palier_num: 3, label: "M3 — SEO 75K pages + Influencers viraux + 10K+ opportunities + auto-optimizer cron", timeline: "Mois 3", mrr: 1450000, costs: 87000, margin: 1363000, annual_profit: 16356000, status: "planned" },
  { palier_num: 4, label: "M4-M5 — SEO 150K pages + 500 personas + Enterprise API + upsell engine + Stripe live", timeline: "Mois 4-5", mrr: 1800000, costs: 108000, margin: 1692000, annual_profit: 20304000, status: "planned" },
  { palier_num: 5, label: "M6 — Traction massive: 150K pages indexées + 10K produits + 30K posts/mo + churn 2.5%", timeline: "Mois 6", mrr: 2200000, costs: 132000, margin: 2068000, annual_profit: 24816000, status: "planned" },
  { palier_num: 6, label: "M7-M9 — Scale: Enterprise + API B2B + white-label + marketplace + Stripe live", timeline: "Mois 7-9", mrr: 3200000, costs: 192000, margin: 3008000, annual_profit: 36096000, status: "planned" },
  { palier_num: 7, label: "M10-M12 — Profit Max: 50 langues + 20K produits + agent army ×3 + vidéos auto-générées", timeline: "Mois 10-12", mrr: 5000000, costs: 300000, margin: 4700000, annual_profit: 56400000, status: "planned" },
  { palier_num: 8, label: "M13-M18 — Market Leadership: datasets exclusifs + bureaux régionaux + 50K produits", timeline: "Mois 13-18", mrr: 8500000, costs: 510000, margin: 7990000, annual_profit: 95880000, status: "planned" },
  { palier_num: 9, label: "M19-M24 — Platform Dominance: référence mondiale + IPO ready + 100K produits", timeline: "Mois 19-24", mrr: 18000000, costs: 1080000, margin: 16920000, annual_profit: 203040000, status: "planned" },
  { palier_num: 10, label: "M24+ — Exit / IPO: €216M+ ARR, valorisation €2-3B", timeline: "Mois 24+", mrr: 25000000, costs: 1500000, margin: 23500000, annual_profit: 282000000, status: "planned" },
];
