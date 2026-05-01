import Link from 'next/link'
import type { Brand } from '@/lib/emails/_base'
import { welcomeHtml, welcomeSubject } from '@/lib/emails/welcome'
import { launchBonusHtml, launchBonusSubject } from '@/lib/emails/launch-bonus'

export const metadata = { title: 'Emails — Command Center' }
export const dynamic = 'force-dynamic'

const C = {
  bg: '#040D1C', card: '#0A1A2E', border: 'rgba(201,168,76,.2)',
  accent: '#C9A84C', text: '#E8E0D0', muted: '#9BA8B8',
  green: '#10B981', blue: '#3B82F6', purple: '#A78BFA',
}

const FTG_BRAND: Brand = {
  productName: 'Feel The Gap',
  productUrl: 'https://feel-the-gap.vercel.app',
  fromAddress: 'Feel The Gap <outreach@ofaops.xyz>',
  supportEmail: 'support@gapup.io',
  postalAddress: 'Feel The Gap · Paris, France',
}

const AICI_BRAND: Brand = {
  productName: 'AICI',
  productUrl: 'https://aici.gapup.io',
  fromAddress: 'AICI <noreply@aici.gapup.io>',
  supportEmail: 'support@aici.gapup.io',
}

const SAMPLE_WELCOME_FR = {
  firstName: 'Aïssata',
  email: 'aissata@example.com',
  loginUrl: 'https://feel-the-gap.vercel.app/login',
  pricingUrl: 'https://feel-the-gap.vercel.app/offres',
  demoUrl: 'https://feel-the-gap.vercel.app/demo',
  unsubscribeUrl: 'https://feel-the-gap.vercel.app/account/notifications',
}

const SAMPLE_WELCOME_EN = {
  firstName: 'Sophie',
  email: 'sophie@example.com',
  loginUrl: 'https://aici.gapup.io/login',
  pricingUrl: 'https://aici.gapup.io/offres',
  demoUrl: 'https://aici.gapup.io/demo',
  unsubscribeUrl: 'https://aici.gapup.io/account/notifications',
}

const SAMPLE_LAUNCH_BONUS_FR = {
  firstName: 'Aïssata',
  email: 'aissata@example.com',
  pricingUrl: 'https://feel-the-gap.vercel.app/offres',
  unsubscribeUrl: 'https://feel-the-gap.vercel.app/account/notifications',
  launchDateIso: '2026-05-20',
  bonusPercent: 30,
  founderTier: 'all-access' as const,
}

const SAMPLE_LAUNCH_BONUS_EN = {
  firstName: 'Sophie',
  email: 'sophie@example.com',
  pricingUrl: 'https://aici.gapup.io/offres',
  unsubscribeUrl: 'https://aici.gapup.io/account/notifications',
  launchDateIso: '2026-05-20',
  bonusPercent: 25,
  founderTier: 'bundle3' as const,
}

type Locale = 'fr' | 'en'

type TemplateCard = {
  name: string
  title: string
  description: string
  trigger: string
  status: 'draft' | 'ready' | 'live'
  subject: { fr: string; en: string }
  html: { fr: string; en: string } | null
  externalPreviewUrl?: string
  externalRepo?: string
}

function buildCards(): TemplateCard[] {
  return [
    {
      name: 'welcome',
      title: 'Welcome',
      description: 'Generic signup confirmation, sent immediately after a user creates an account on any portfolio SaaS. CTA = login + optional demo/pricing links.',
      trigger: 'POST /api/auth/signup → user.created',
      status: 'ready',
      subject: {
        fr: welcomeSubject('fr', FTG_BRAND),
        en: welcomeSubject('en', AICI_BRAND),
      },
      html: {
        fr: welcomeHtml(FTG_BRAND, 'fr', SAMPLE_WELCOME_FR),
        en: welcomeHtml(AICI_BRAND, 'en', SAMPLE_WELCOME_EN),
      },
    },
    {
      name: 'launch-bonus',
      title: 'Launch Bonus',
      description: 'Pre-launch founder pricing offer (−% locked for life). Sent in CRM reactivation sequence to accounts created before launch date 2026-05-20.',
      trigger: 'CRM scenario: signup + 1d, no subscription',
      status: 'ready',
      subject: {
        fr: launchBonusSubject('fr', FTG_BRAND, SAMPLE_LAUNCH_BONUS_FR),
        en: launchBonusSubject('en', AICI_BRAND, SAMPLE_LAUNCH_BONUS_EN),
      },
      html: {
        fr: launchBonusHtml(FTG_BRAND, 'fr', SAMPLE_LAUNCH_BONUS_FR),
        en: launchBonusHtml(AICI_BRAND, 'en', SAMPLE_LAUNCH_BONUS_EN),
      },
    },
    {
      name: 'trade-pulse',
      title: 'Trade Pulse',
      description: 'FTG-specific weekly digest: top 5 buying signals (country/industry/trigger/action), niches on the move, 7-day trends. Source disclaimer TARIC/Sirene/CH.',
      trigger: 'Cron: Lundi 08:00 Europe/Paris',
      status: 'draft',
      subject: {
        fr: 'Trade Pulse · 4 mai — Côte d\'Ivoire Onion import substitution',
        en: 'Trade Pulse · May 4 — Côte d\'Ivoire Onion import substitution',
      },
      html: null,
      externalPreviewUrl: 'https://feel-the-gap.vercel.app/admin/emails',
      externalRepo: '/var/www/feel-the-gap · lib/emails/trade-pulse.ts',
    },
  ]
}

function StatusPill({ status }: { status: TemplateCard['status'] }) {
  const map = {
    live: { color: C.green, bg: 'rgba(16,185,129,.15)', label: '● Live' },
    ready: { color: C.blue, bg: 'rgba(59,130,246,.15)', label: '● Ready' },
    draft: { color: C.purple, bg: 'rgba(167,139,250,.15)', label: '○ Draft' },
  }[status]
  return (
    <span style={{
      fontSize: 9, padding: '3px 8px', borderRadius: 999,
      letterSpacing: '.1em', textTransform: 'uppercase',
      background: map.bg, color: map.color,
    }}>{map.label}</span>
  )
}

export default async function EmailsHubPage({ searchParams }: { searchParams: Promise<{ locale?: string; preview?: string }> }) {
  const sp = await searchParams
  const locale: Locale = sp.locale === 'en' ? 'en' : 'fr'
  const previewName = sp.preview ?? null
  const cards = buildCards()
  const previewCard = previewName ? cards.find(c => c.name === previewName) ?? null : null

  return (
    <div style={{ color: C.text, padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ fontSize: 11, color: C.accent, letterSpacing: '.2em', textTransform: 'uppercase' }}>Comms · Cross-product</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 8px' }}>📧 Emails</h1>
      <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 18, maxWidth: 760 }}>
        Templates Resend partagés par le portfolio. Chaque template expose <code style={{ color: C.text }}>send&lt;Name&gt;()</code>{' '}
        depuis <code style={{ color: C.text }}>lib/emails/</code> et tag automatique <code style={{ color: C.text }}>template=&lt;name&gt;</code>{' '}
        pour analytics Resend. Branchements à finaliser : <code style={{ color: C.text }}>/api/auth/signup</code>,{' '}
        CRM scénario 5-emails, <code style={{ color: C.text }}>/api/cron/trade-pulse-weekly</code>.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase' }}>Locale preview</span>
        <Link
          href={{ pathname: '/admin/emails', query: { locale: 'fr', ...(previewName ? { preview: previewName } : {}) } }}
          style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 6,
            background: locale === 'fr' ? C.accent : 'transparent',
            color: locale === 'fr' ? C.bg : C.text,
            border: `1px solid ${C.border}`, textDecoration: 'none', fontWeight: 600,
          }}
        >🇫🇷 FR</Link>
        <Link
          href={{ pathname: '/admin/emails', query: { locale: 'en', ...(previewName ? { preview: previewName } : {}) } }}
          style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 6,
            background: locale === 'en' ? C.accent : 'transparent',
            color: locale === 'en' ? C.bg : C.text,
            border: `1px solid ${C.border}`, textDecoration: 'none', fontWeight: 600,
          }}
        >🇬🇧 EN</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 28 }}>
        {cards.map((c) => {
          const isExternal = !c.html && c.externalPreviewUrl
          const previewHref = isExternal
            ? c.externalPreviewUrl
            : `/admin/emails?locale=${locale}&preview=${c.name}#preview`
          return (
            <div key={c.name} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{c.title}</div>
                <StatusPill status={c.status} />
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{c.description}</div>
              <div style={{ fontSize: 11, color: C.accent, fontFamily: 'Menlo, monospace' }}>{c.trigger}</div>
              <div style={{ fontSize: 12, color: C.text, marginTop: 6, padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 6 }}>
                <span style={{ color: C.muted, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>Subject ({locale})</span><br />
                {c.subject[locale]}
              </div>
              {c.externalRepo && (
                <div style={{ fontSize: 11, color: C.muted, fontFamily: 'Menlo, monospace' }}>{c.externalRepo}</div>
              )}
              <div style={{ marginTop: 'auto' }}>
                {isExternal ? (
                  <a href={previewHref} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>
                    Open preview in FTG ↗
                  </a>
                ) : (
                  <Link href={previewHref} style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>
                    Render preview →
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {previewCard && previewCard.html && (
        <div id="preview" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase' }}>Preview · {locale.toUpperCase()}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{previewCard.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Subject: <span style={{ color: C.text }}>{previewCard.subject[locale]}</span></div>
            </div>
            <Link href={{ pathname: '/admin/emails', query: { locale } }}
              style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>✕ Close</Link>
          </div>
          <iframe
            srcDoc={previewCard.html[locale]}
            sandbox=""
            title={`${previewCard.title} preview ${locale}`}
            style={{ width: '100%', height: 720, border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff' }}
          />
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10 }}>🔌 Wiring restant</div>
        <ul style={{ fontSize: 13, lineHeight: 1.9, color: C.text, margin: 0, paddingLeft: 20 }}>
          <li><code style={{ color: C.accent }}>sendWelcome()</code> → handler <code style={{ color: C.muted }}>/api/auth/signup</code> de chaque SaaS portfolio</li>
          <li><code style={{ color: C.accent }}>sendLaunchBonus()</code> → CRM scénario 5-emails (J+1 si pas de subscription)</li>
          <li><code style={{ color: C.accent }}>sendTradePulse()</code> → cron <code style={{ color: C.muted }}>/api/cron/trade-pulse-weekly</code> (Lundi 08:00 Europe/Paris)</li>
        </ul>
      </div>
    </div>
  )
}
