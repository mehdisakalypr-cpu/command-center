import { redirect } from 'next/navigation'

// Shaka consolidation 2026-04-21 : /admin/analytics fusionné dans /admin/overview
// (overlap 80% — tiers + KPIs. Top countries réintégrés côté overview.)
export default function LegacyAnalyticsRedirect() {
  redirect('/admin/overview')
}
