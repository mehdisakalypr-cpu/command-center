import { createClient } from '@supabase/supabase-js'
import TasksClient from './TasksClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tasks & Tests · Command Center' }

export default async function TasksPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: tasks } = await db
    .from('cc_tasks')
    .select('*')
    .order('priority', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(500)

  return <TasksClient initialTasks={tasks ?? []} />
}
