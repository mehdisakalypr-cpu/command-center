import FtgLaunchClient from './FtgLaunchClient'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_VOLUME_TARGETS } from '@/lib/ftg-launch-model'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'FTG Launch 15 mai — Budget & MRR' }

export default async function Page() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Fetch current counts for all volume-target tables
  const currents = await Promise.all(
    DEFAULT_VOLUME_TARGETS.map(async (v) => {
      try {
        const { count } = await sb.from(v.table).select('*', { count: 'exact', head: true })
        return { ...v, current: count ?? v.current }
      } catch {
        return v
      }
    }),
  )

  return <FtgLaunchClient volumeTargets={currents} />
}
