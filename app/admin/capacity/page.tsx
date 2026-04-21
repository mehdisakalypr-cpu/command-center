import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Capacity · OFA' }

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const OFA_BASE = process.env.OFA_PUBLIC_BASE_URL || 'https://one-for-all-app.vercel.app'

const GOLD = '#C9A84C'

function endOfMonthISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
}

function daysLeftInMonth(): number {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (24 * 3600 * 1000)))
}

export default async function CapacityPage() {
  const sb = db()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const sinceMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: sitesToday }, { count: emailsToday }, { count: enrichedToday },
    { count: sitesMTD }, { count: emailsMTD }, { count: enrichedMTD },
    { count: totalLeads }, { count: totalWithEmail },
    { count: totalSitesClaimed }, { count: totalEmailsEver },
  ] = await Promise.all([
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).gte('claimed_at', since24h),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).gte('outreach_sent_at', since24h),
    sb.from('commerce_leads').select('id', { head: true, count: 'exact' }).gte('enriched_at', since24h),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).gte('claimed_at', sinceMonth),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).gte('outreach_sent_at', sinceMonth),
    sb.from('commerce_leads').select('id', { head: true, count: 'exact' }).gte('enriched_at', sinceMonth),
    sb.from('commerce_leads').select('id', { head: true, count: 'exact' }),
    sb.from('commerce_leads').select('id', { head: true, count: 'exact' }).not('email', 'is', null),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).eq('status', 'claimed'),
    sb.from('generated_sites').select('id', { head: true, count: 'exact' }).not('outreach_sent_at', 'is', null),
  ])

  const days = daysLeftInMonth()
  const capSitesPerDay = 350
  const capEmailsPerDay = 2000 // Resend Pro / domaine vérifié
  const capEnrichPerDay = 500  // Places API rate-safe

  const projectedSitesEOM = Math.min((sitesMTD ?? 0) + days * capSitesPerDay, totalWithEmail ?? 0)
  const projectedEmailsEOM = (emailsMTD ?? 0) + days * capEmailsPerDay
  const estimatedConversions = Math.round(projectedEmailsEOM * 0.03)
  const estimatedRevenue = estimatedConversions * 159

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Capacity</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>Pipeline OFA · {days} jours restants dans le mois.</p>
      </header>

      {/* Today */}
      <Section title="Aujourd'hui (dernières 24h)">
        <Grid>
          <Stat label="Sites générés" value={sitesToday ?? 0} cap={capSitesPerDay} />
          <Stat label="Emails envoyés" value={emailsToday ?? 0} cap={capEmailsPerDay} />
          <Stat label="Leads enrichis" value={enrichedToday ?? 0} cap={capEnrichPerDay} />
        </Grid>
      </Section>

      {/* Month-to-date */}
      <Section title="Mois en cours (MTD)">
        <Grid>
          <Stat label="Sites générés" value={sitesMTD ?? 0} />
          <Stat label="Emails envoyés" value={emailsMTD ?? 0} />
          <Stat label="Leads enrichis" value={enrichedMTD ?? 0} />
        </Grid>
      </Section>

      {/* Projection */}
      <Section title="Projection fin de mois">
        <Grid>
          <Stat label="Sites projetés" value={projectedSitesEOM.toLocaleString()} hint={`cap ${capSitesPerDay}/j × ${days}j + MTD`} />
          <Stat label="Emails projetés" value={projectedEmailsEOM.toLocaleString()} hint={`cap ${capEmailsPerDay}/j × ${days}j + MTD`} />
          <Stat label="Conversions est. @3%" value={estimatedConversions.toLocaleString()} hint="à ajuster selon taux réel" />
          <Stat label="Revenu est." value={`$${estimatedRevenue.toLocaleString()}`} hint="conversions × $159" accent />
        </Grid>
      </Section>

      {/* Totals */}
      <Section title="Cumulé (since inception)">
        <Grid>
          <Stat label="Leads en base" value={(totalLeads ?? 0).toLocaleString()} />
          <Stat label="Leads avec email" value={(totalWithEmail ?? 0).toLocaleString()} hint={`${totalLeads ? Math.round((totalWithEmail ?? 0) / totalLeads * 100) : 0}%`} />
          <Stat label="Sites claimed" value={(totalSitesClaimed ?? 0).toLocaleString()} />
          <Stat label="Emails envoyés" value={(totalEmailsEver ?? 0).toLocaleString()} />
        </Grid>
      </Section>

      {/* Runbook */}
      <Section title="Commandes (VPS)">
        <pre style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 16, color: '#CBD5E1', fontSize: 12, overflowX: 'auto' }}>
{`# 1) Enrichir 500 leads (Google Places)
cd /var/www/site-factory && npx tsx agents/reviews-checker.ts --limit=500

# 2) Générer 350 sites depuis leads top-score
cd /var/www/site-factory && npx tsx scripts/generate-for-leads.ts --limit=350

# 3) Pitch 100 sites par Resend
cd /var/www/site-factory && npx tsx scripts/outreach-for-sites.ts --limit=100 --dry  # vérif
cd /var/www/site-factory && npx tsx scripts/outreach-for-sites.ts --limit=100         # live

# Cron VPS recommandé (exécuté quotidiennement) :
# 0 7 * * * cd /var/www/site-factory && npx tsx agents/reviews-checker.ts --limit=500 >> /var/log/ofa-enrich.log 2>&1
# 0 9 * * * cd /var/www/site-factory && npx tsx scripts/generate-for-leads.ts --limit=350 >> /var/log/ofa-generate.log 2>&1
# 0 12 * * * cd /var/www/site-factory && npx tsx scripts/outreach-for-sites.ts --limit=100 >> /var/log/ofa-outreach.log 2>&1`}
        </pre>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.2em', color: '#7D8BA0', marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{children}</div>
}
function Stat({ label, value, cap, hint, accent }: { label: string; value: number | string; cap?: number; hint?: string; accent?: boolean }) {
  const pct = typeof value === 'number' && cap ? Math.min(100, Math.round(value / cap * 100)) : null
  return (
    <div style={{
      background: '#071425', border: `1px solid ${accent ? GOLD : 'rgba(201,168,76,.15)'}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ? GOLD : '#E8EEF7', marginTop: 4 }}>{value}</div>
      {cap && typeof value === 'number' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 5, background: '#1A2332', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct ?? 0}%`, background: GOLD }} />
          </div>
          <div style={{ fontSize: 10, color: '#7D8BA0', marginTop: 4 }}>{pct}% du cap ({cap.toLocaleString()})</div>
        </div>
      )}
      {hint && !cap && <div style={{ fontSize: 11, color: '#7D8BA0', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
