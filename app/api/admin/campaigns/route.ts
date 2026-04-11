import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Fetch all campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (!campaigns) return NextResponse.json({ campaigns: [], funnels: [] })

  // For each campaign, get funnel stage counts
  const funnels = await Promise.all(campaigns.map(async (c) => {
    const stages = ['sent', 'opened', 'clicked', 'replied', 'visited', 'signup', 'converted']
    const counts: Record<string, number> = {}

    const { count: total } = await supabase
      .from('campaign_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', c.id)

    counts.total = total || 0

    for (const stage of stages) {
      const { count } = await supabase
        .from('campaign_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', c.id)
        .not(`${stage === 'signup' ? 'signup_at' : stage + '_at'}`, 'is', null)

      counts[stage] = count || 0
    }

    // Calculate actual rates
    const sent = counts.sent || counts.total || c.target_sent || 1
    const rates = {
      open_rate: sent > 0 ? ((counts.opened / sent) * 100) : 0,
      click_rate: counts.opened > 0 ? ((counts.clicked / counts.opened) * 100) : 0,
      reply_rate: sent > 0 ? ((counts.replied / sent) * 100) : 0,
      visit_rate: counts.clicked > 0 ? ((counts.visited / counts.clicked) * 100) : 0,
      signup_rate: sent > 0 ? ((counts.signup / sent) * 100) : 0,
      convert_rate: sent > 0 ? ((counts.converted / sent) * 100) : 0,
    }

    // Get daily metrics for trend
    const { data: dailyMetrics } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', c.id)
      .order('date', { ascending: true })
      .limit(30)

    return {
      campaignId: c.id,
      counts,
      rates,
      dailyMetrics: dailyMetrics || [],
    }
  }))

  return NextResponse.json({
    campaigns,
    funnels,
    ts: new Date().toISOString(),
  })
}
