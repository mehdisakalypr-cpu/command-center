import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Orchestrator OFA' }

const GOLD = '#C9A84C'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export default async function OrchestratorPage() {
  const sb = db()
  const [
    { count: totalLeads },
    { count: classifiedLeads },
    { count: totalTypo },
    { count: totalSources },
    { count: totalPatterns },
    { count: totalImages },
    { count: pendingImages },
    { count: totalProducts },
    { count: totalSites },
    { count: emailedSites },
  ] = await Promise.all([
    sb.from('commerce_leads').select('id', { head: true, count: 'exact' }),
    sb.from('commerce_leads').select('id', { head: true, count: 'exact' }).not('typology_id', 'is', null),
    sb.from('typology_tree').select('id', { head: true, count: 'exact' }),
    sb.from('typology_sources').select('id', { head: true, count: 'exact' }),
    sb.from('typology_patterns').select('id', { head: true, count: 'exact' }),
    sb.from('typology_images').select('id', { head: true, count: 'exact' }),
    sb.from('typology_images').select('id', { head: true, count: 'exact' }).eq('source', 'pending'),
    sb.from('product_instances').select('id', { head: true, count: 'exact' }),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).eq('status', 'claimed'),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).not('outreach_sent_at', 'is', null),
  ])

  const pct = (a: number | null, b: number | null) => b ? Math.round(((a ?? 0) / b) * 100) : 0

  const phases = [
    { n: 1, name: 'Classifier leads', done: classifiedLeads ?? 0, total: totalLeads ?? 0, color: '#4ADE80' },
    { n: 2, name: 'Product scout (Google reviews)', done: totalProducts ?? 0, total: (classifiedLeads ?? 0), color: '#60A5FA' },
    { n: 3, name: 'Mine typology sources', done: totalSources ?? 0, total: Math.min(totalTypo ?? 0, 40), color: '#F59E0B' },
    { n: 4, name: 'Distill patterns', done: totalPatterns ?? 0, total: (totalSources ?? 0) * 3, color: '#A78BFA' },
    { n: 5, name: 'Generate images', done: (totalImages ?? 0) - (pendingImages ?? 0), total: totalImages ?? 0, color: '#FB923C' },
    { n: 6, name: 'Sites claimed', done: totalSites ?? 0, total: totalLeads ?? 0, color: GOLD },
  ]

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Orchestrator OFA</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Pipeline Deep Typology Builder · 6 phases séquentielles + ongoing
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {phases.map(p => {
          const percent = pct(p.done, p.total)
          return (
            <div key={p.n} style={{
              background: '#071425', border: `1px solid ${p.color}33`,
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#7D8BA0', letterSpacing: '.15em', textTransform: 'uppercase' }}>
                    Phase {p.n}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginTop: 2 }}>{p.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: p.color }}>
                    {(p.done ?? 0).toLocaleString()} <span style={{ opacity: .5, fontSize: 14 }}>/ {(p.total ?? 0).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{percent}%</div>
                </div>
              </div>
              <div style={{ height: 6, background: '#1A2332', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percent}%`, background: p.color, transition: 'width .5s' }} />
              </div>
            </div>
          )
        })}
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 12, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 10 }}>
          Totaux
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <Stat label="Emails envoyés" value={(emailedSites ?? 0).toLocaleString()} />
          <Stat label="Typologies uniques" value={(totalTypo ?? 0).toLocaleString()} />
          <Stat label="Leads avec produits" value={(totalProducts ?? 0).toLocaleString()} />
        </div>
      </section>

      <section style={{ marginTop: 24, background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 12, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: '.2em', marginBottom: 10 }}>
          Commandes (VPS)
        </h2>
        <pre style={{ color: '#CBD5E1', fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
{`# Voir le log
tail -f /tmp/ofa-orchestrate.log

# Relancer l'orchestrator si arrêté
nohup bash /var/www/site-factory/scripts/orchestrate-all.sh &

# Phase 3 manuelle
cd /var/www/site-factory && npx tsx scripts/mine-all-typologies.ts --top=40

# Générer un batch depuis leads (12 pays mix)
cd /var/www/site-factory && npx tsx scripts/generate-for-leads.ts --limit=50`}
        </pre>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#071425', border: `1px solid ${GOLD}30`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, marginTop: 4 }}>{value}</div>
    </div>
  )
}
