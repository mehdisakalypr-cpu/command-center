import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const denied = await requireAuth(); if (denied) return denied;
  const [
    { count: entrepreneurDemos },
    { count: commerceLeads },
    { count: generatedSites },
    { count: productionCosts },
    { count: logistics },
    { count: regulations },
    { count: businessPlans },
    { count: opportunities },
    { count: products },
    { count: profiles },
    { count: seoPages },
    { count: socialPosts },
    { count: youtubeInsights },
    { count: marketTrends },
    { count: influencerProfiles },
    { count: dealFlows },
    { count: pitchedLeads },
    { count: onboardedLeads },
    { count: viewedDemos },
    { count: convertedDemos },
    { count: publishedSites },
  ] = await Promise.all([
    supabase.from('entrepreneur_demos').select('*', { count: 'exact', head: true }),
    supabase.from('commerce_leads').select('*', { count: 'exact', head: true }),
    supabase.from('generated_sites').select('*', { count: 'exact', head: true }),
    supabase.from('production_cost_benchmarks').select('*', { count: 'exact', head: true }),
    supabase.from('logistics_corridors').select('*', { count: 'exact', head: true }),
    supabase.from('country_regulations').select('*', { count: 'exact', head: true }),
    supabase.from('business_plans').select('*', { count: 'exact', head: true }),
    supabase.from('opportunities').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('seo_pages').select('*', { count: 'exact', head: true }).then(r => r.count ? r : { count: 0 }),
    supabase.from('social_posts').select('*', { count: 'exact', head: true }).then(r => r.count ? r : { count: 0 }),
    supabase.from('youtube_insights').select('*', { count: 'exact', head: true }),
    supabase.from('market_trends').select('*', { count: 'exact', head: true }).then(r => r.count ? r : { count: 0 }),
    supabase.from('influencer_profiles').select('*', { count: 'exact', head: true }).then(r => r.count ? r : { count: 0 }),
    supabase.from('deal_flows').select('*', { count: 'exact', head: true }).then(r => r.count ? r : { count: 0 }),
    supabase.from('commerce_leads').select('*', { count: 'exact', head: true }).not('outreach_sent_at', 'is', null),
    supabase.from('commerce_leads').select('*', { count: 'exact', head: true }).not('onboarded_at', 'is', null),
    supabase.from('entrepreneur_demos').select('*', { count: 'exact', head: true }).eq('status', 'viewed'),
    supabase.from('entrepreneur_demos').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    supabase.from('generated_sites').select('*', { count: 'exact', head: true }).eq('status', 'published'),
  ])

  return NextResponse.json({
    ts: new Date().toISOString(),
    data: {
      entrepreneurDemos: entrepreneurDemos || 0,
      commerceLeads: commerceLeads || 0,
      generatedSites: generatedSites || 0,
      publishedSites: publishedSites || 0,
      productionCosts: productionCosts || 0,
      logistics: logistics || 0,
      regulations: regulations || 0,
      businessPlans: businessPlans || 0,
      opportunities: opportunities || 0,
      products: products || 0,
      profiles: profiles || 0,
      seoPages: seoPages || 0,
      socialPosts: socialPosts || 0,
      youtubeInsights: youtubeInsights || 0,
      marketTrends: marketTrends || 0,
      influencerProfiles: influencerProfiles || 0,
      dealFlows: dealFlows || 0,
      pitchedLeads: pitchedLeads || 0,
      onboardedLeads: onboardedLeads || 0,
      viewedDemos: viewedDemos || 0,
      convertedDemos: convertedDemos || 0,
    },
    revenue: (() => {
      // Proxy MRR from claimed sites × avg subscription (14.98€/mo OFA hyp)
      const claimedSites = (publishedSites || 0) > 0 ? Math.max(0, (publishedSites || 0) - (onboardedLeads || 0)) : 0;
      const payingOfa = (onboardedLeads || 0);
      const mrrOfa = Math.round(payingOfa * 14.98);
      const payingFtg = (profiles || 0); // proxy — vrais payants nécessitent Stripe live
      const mrrFtg = Math.round(payingFtg * 49 * 0.05); // 5% conv proxy avant Stripe live
      const totalMrr = mrrOfa + mrrFtg;
      return {
        mrrOfa,
        mrrFtg,
        mrrSeo: 0,
        totalMrr,
        totalCustomers: payingOfa + payingFtg,
        stripeActive: false,
      };
    })(),
  })
}
