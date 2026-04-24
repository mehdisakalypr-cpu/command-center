import { createClient } from '@supabase/supabase-js'
import ContentJobsClient from './ContentJobsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Content Jobs · Command Center' }

export default async function ContentJobsPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: jobs } = await db.from('cc_content_jobs').select('*').order('project').order('job_key')
  return <ContentJobsClient initialJobs={jobs ?? []} />
}
