import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Publish Health' }

const GOLD = '#C9A84C'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export default async function PublishHealthPage() {
  const sb = db()
  const [
    { count: claimed },
    { count: drafts },
    { data: draftSites },
  ] = await Promise.all([
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).eq('status', 'claimed'),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).eq('status', 'draft'),
    sb.from('generated_sites').select('id, slug, business_name, template, claimed_at').eq('status', 'draft').order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Publish Health</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Règle : 0 image manquante pour passer claimed. Les sites ici attendent que leurs images/sections soient complètes.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Stat label="Claimed (live)" value={(claimed ?? 0).toLocaleString()} color="#4ADE80" />
        <Stat label="Drafts (incomplets)" value={(drafts ?? 0).toLocaleString()} color="#F59E0B" />
        <Stat label="Ratio complet" value={`${claimed && (claimed + (drafts ?? 0)) ? Math.round((claimed / (claimed + (drafts ?? 0))) * 100) : 100}%`} color={GOLD} />
      </section>

      <section>
        <h2 style={{ fontSize: 12, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 10 }}>
          Drafts en attente d'images ({draftSites?.length ?? 0})
        </h2>
        {!draftSites?.length ? (
          <div style={{ padding: 20, color: '#94A3B8', background: '#071425', borderRadius: 10, textAlign: 'center' }}>
            ✨ Aucun site en draft. Tous les sites claimed passent le gate 100%.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {draftSites.map((s: any) => (
              <div key={s.id} style={{
                background: '#071425', border: '1px solid #F59E0B33', borderRadius: 10, padding: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{s.business_name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 }}>
                    /site/{s.slug} · template {s.template}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: '#F59E0B22', color: '#F59E0B', fontSize: 11, fontWeight: 700, letterSpacing: '.1em' }}>DRAFT</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#071425', border: `1px solid ${color}40`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  )
}
