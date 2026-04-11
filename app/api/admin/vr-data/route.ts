import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
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
    supabase.from('commerce_leads').select('*', { count: 'exact', head: true }).eq('status', 'pitched'),
    supabase.from('commerce_leads').select('*', { count: 'exact', head: true }).eq('status', 'onboarded'),
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
    revenue: {
      mrrOfa: 0,
      mrrFtg: 0,
      mrrSeo: 0,
      totalMrr: 0,
      totalCustomers: 0,
      stripeActive: false, // pas de Stripe live keys encore
    },
  })
}
