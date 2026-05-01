/**
 * Render every email template under lib/emails/ to standalone .html files
 * for visual review in a browser.
 *
 * Usage:  npx tsx scripts/preview-emails.ts
 * Output: /tmp/email-previews/{template}-{locale}.html
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Brand } from '../lib/emails/_base'
import { welcomeHtml, welcomeSubject } from '../lib/emails/welcome'
import { launchBonusHtml, launchBonusSubject } from '../lib/emails/launch-bonus'

const OUT = '/tmp/email-previews'
mkdirSync(OUT, { recursive: true })

const ftg: Brand = {
  productName: 'Feel The Gap',
  productUrl: 'https://feel-the-gap.vercel.app',
  fromAddress: 'Feel The Gap <outreach@ofaops.xyz>',
  supportEmail: 'support@gapup.io',
  postalAddress: 'Feel The Gap · Paris, France',
}

const aici: Brand = {
  productName: 'AICI',
  productUrl: 'https://aici.gapup.io',
  fromAddress: 'AICI <noreply@aici.gapup.io>',
  supportEmail: 'support@aici.gapup.io',
}

const renders: Array<{ name: string; locale: 'fr' | 'en'; subject: string; html: string }> = [
  {
    name: 'welcome',
    locale: 'fr',
    subject: welcomeSubject('fr', ftg),
    html: welcomeHtml(ftg, 'fr', {
      firstName: 'Aïssata',
      email: 'aissata@example.com',
      loginUrl: 'https://feel-the-gap.vercel.app/login',
      pricingUrl: 'https://feel-the-gap.vercel.app/offres',
      demoUrl: 'https://feel-the-gap.vercel.app/demo',
      unsubscribeUrl: 'https://feel-the-gap.vercel.app/account/notifications',
    }),
  },
  {
    name: 'welcome',
    locale: 'en',
    subject: welcomeSubject('en', aici),
    html: welcomeHtml(aici, 'en', {
      firstName: 'Sophie',
      email: 'sophie@example.com',
      loginUrl: 'https://aici.gapup.io/login',
      pricingUrl: 'https://aici.gapup.io/offres',
      demoUrl: 'https://aici.gapup.io/demo',
      unsubscribeUrl: 'https://aici.gapup.io/account/notifications',
    }),
  },
  {
    name: 'launch-bonus',
    locale: 'fr',
    subject: launchBonusSubject('fr', ftg, {
      firstName: 'Aïssata',
      email: 'aissata@example.com',
      pricingUrl: 'https://feel-the-gap.vercel.app/offres',
      unsubscribeUrl: 'https://feel-the-gap.vercel.app/account/notifications',
      launchDateIso: '2026-05-20',
      bonusPercent: 30,
      founderTier: 'all-access',
    }),
    html: launchBonusHtml(ftg, 'fr', {
      firstName: 'Aïssata',
      email: 'aissata@example.com',
      pricingUrl: 'https://feel-the-gap.vercel.app/offres',
      unsubscribeUrl: 'https://feel-the-gap.vercel.app/account/notifications',
      launchDateIso: '2026-05-20',
      bonusPercent: 30,
      founderTier: 'all-access',
    }),
  },
  {
    name: 'launch-bonus',
    locale: 'en',
    subject: launchBonusSubject('en', aici, {
      firstName: 'Sophie',
      email: 'sophie@example.com',
      pricingUrl: 'https://aici.gapup.io/offres',
      unsubscribeUrl: 'https://aici.gapup.io/account/notifications',
      launchDateIso: '2026-05-20',
      bonusPercent: 25,
      founderTier: 'bundle3',
    }),
    html: launchBonusHtml(aici, 'en', {
      firstName: 'Sophie',
      email: 'sophie@example.com',
      pricingUrl: 'https://aici.gapup.io/offres',
      unsubscribeUrl: 'https://aici.gapup.io/account/notifications',
      launchDateIso: '2026-05-20',
      bonusPercent: 25,
      founderTier: 'bundle3',
    }),
  },
]

const indexLines: string[] = ['<h1 style="font-family:system-ui">Email previews</h1><ul>']
for (const r of renders) {
  const file = `${r.name}-${r.locale}.html`
  writeFileSync(`${OUT}/${file}`, r.html)
  console.log(`✓ ${file}  ·  ${r.subject}`)
  indexLines.push(`<li><a href="${file}">${r.name} (${r.locale})</a> — <code>${r.subject}</code></li>`)
}
indexLines.push('</ul>')
writeFileSync(`${OUT}/index.html`, indexLines.join('\n'))
console.log(`\nIndex: ${OUT}/index.html  (open with a browser via scp / file://)`)
