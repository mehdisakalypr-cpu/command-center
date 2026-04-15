import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/supabase-server'
import type { SecurityItem } from '@/lib/security/scores'
import ScoreMatrix from './components/ScoreMatrix'
import StackCard from './components/StackCard'
import IncidentTable from './components/IncidentTable'
import TodoBoard from './components/TodoBoard'

export const dynamic = 'force-dynamic'

const sb = () =>
  createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export default async function SecurityCockpitPage() {
  const ok = await isAdmin()
  if (!ok) redirect('/login?next=/admin/security')

  const { data, error } = await sb()
    .from('security_items')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(500)

  const items = (data ?? []) as SecurityItem[]

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', color: '#e6e6e6' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>🛡 Security Cockpit</h1>
        <p style={{ color: '#9aa', marginTop: 4, fontSize: 14 }}>
          Stack sécurité transverse · {items.length} items · OWASP ASVS 4.0
        </p>
      </header>

      {error && (
        <div style={{ padding: 12, background: '#4a1f1f', borderRadius: 8, marginBottom: 16 }}>
          Erreur chargement: {error.message}
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionH2}>Score Matrix</h2>
        <ScoreMatrix items={items} />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionH2}>Stack en place</h2>
        <StackCard items={items} />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionH2}>Incidents & backdoors</h2>
        <IncidentTable items={items} />
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionH2}>Todo Board</h2>
        <TodoBoard initialItems={items} />
      </section>
    </div>
  )
}

const sectionH2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  margin: '0 0 12px',
  color: '#f3f3f3',
  borderBottom: '1px solid #2a2f3a',
  paddingBottom: 6,
}
