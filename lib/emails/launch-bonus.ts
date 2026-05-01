import { Brand, Locale, SendResult, button, emailChrome, escapeHtml, sendEmail, tr } from './_base'

export type LaunchBonusVars = {
  firstName?: string
  email: string
  pricingUrl: string
  unsubscribeUrl: string
  launchDateIso: string
  bonusPercent: number
  founderTier?: 'single' | 'bundle3' | 'pro10' | 'all-access'
}

const TIER_LABEL: Record<NonNullable<LaunchBonusVars['founderTier']>, { fr: string; en: string }> = {
  'single': { fr: 'Single (1 SaaS)', en: 'Single (1 SaaS)' },
  'bundle3': { fr: 'Bundle 3 SaaS', en: 'Bundle 3 SaaS' },
  'pro10': { fr: 'Pro Pack 10', en: 'Pro Pack 10' },
  'all-access': { fr: 'All-Access (tous les SaaS, présents + futurs)', en: 'All-Access (every SaaS, current + future)' },
}

export function launchBonusSubject(locale: Locale, brand: Brand, v: LaunchBonusVars): string {
  return tr(
    locale,
    `Pricing fondateur verrouillé — ${v.bonusPercent}% à vie sur ${brand.productName}`,
    `Founder pricing locked — ${v.bonusPercent}% for life on ${brand.productName}`,
  )
}

export function launchBonusHtml(brand: Brand, locale: Locale, v: LaunchBonusVars): string {
  const greet = v.firstName ? `${tr(locale, 'Bonjour', 'Hi')} ${escapeHtml(v.firstName)},` : tr(locale, 'Bonjour,', 'Hi there,')

  const launchDate = new Date(v.launchDateIso)
  const dateLabel = isNaN(launchDate.getTime())
    ? v.launchDateIso
    : launchDate.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  const intro = tr(
    locale,
    `Tu fais partie des comptes créés <strong style="color:#E8E0D0">avant le lancement officiel</strong> du ${escapeHtml(dateLabel)}. À ce titre, tu bénéficies d'une remise <strong style="color:#C9A84C">−${v.bonusPercent}%</strong> verrouillée à vie sur l'abonnement que tu choisis pendant la fenêtre fondateur.`,
    `You're one of the accounts created <strong style="color:#E8E0D0">before the official launch</strong> on ${escapeHtml(dateLabel)}. As a founder, you get a <strong style="color:#C9A84C">−${v.bonusPercent}%</strong> discount locked for life on the plan you choose during the founder window.`,
  )

  const tierBlock = v.founderTier
    ? `<div style="margin:14px 0;padding:14px 16px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:8px">
        <div style="font-size:11px;color:#C9A84C;letter-spacing:.18em;text-transform:uppercase">${tr(locale, 'Tier suggéré', 'Suggested tier')}</div>
        <div style="margin-top:4px;font-size:16px;font-weight:700;color:#E8E0D0">${escapeHtml(TIER_LABEL[v.founderTier][locale])}</div>
      </div>`
    : ''

  const conditions = tr(
    locale,
    `<p style="margin:18px 0 6px;font-weight:600;color:#E8E0D0">Conditions de la fenêtre fondateur</p>
<ul style="margin:0 0 16px 18px;padding:0;color:#9BA8B8;font-size:14px;line-height:1.8">
  <li>Remise <strong style="color:#E8E0D0">${v.bonusPercent}%</strong> appliquée tant que ton abonnement reste actif</li>
  <li>Toutes les durées éligibles (Mensuel, 12 / 24 / 36 mois)</li>
  <li>Aucun essai gratuit, aucun remboursement — abonnement immédiatement actif</li>
  <li>Fenêtre limitée : valable jusqu'à 14 jours après le lancement officiel</li>
</ul>`,
    `<p style="margin:18px 0 6px;font-weight:600;color:#E8E0D0">Founder window terms</p>
<ul style="margin:0 0 16px 18px;padding:0;color:#9BA8B8;font-size:14px;line-height:1.8">
  <li>Discount <strong style="color:#E8E0D0">${v.bonusPercent}%</strong> applied as long as your subscription stays active</li>
  <li>Every duration eligible (Monthly, 12 / 24 / 36 months)</li>
  <li>No free trial, no refund — subscription is active on day one</li>
  <li>Limited window: open up to 14 days after the official launch</li>
</ul>`,
  )

  const support = tr(
    locale,
    `<p style="margin-top:14px;color:#9BA8B8;font-size:13px">Tu peux répondre à cet email pour toute question${brand.supportEmail ? ` ou écrire à <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#C9A84C;text-decoration:none">${escapeHtml(brand.supportEmail)}</a>` : ''}.</p>`,
    `<p style="margin-top:14px;color:#9BA8B8;font-size:13px">Reply to this email anytime${brand.supportEmail ? ` or write to <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#C9A84C;text-decoration:none">${escapeHtml(brand.supportEmail)}</a>` : ''}.</p>`,
  )

  const content = `
    <p style="margin:0 0 12px">${greet}</p>
    <p style="margin:0 0 18px;color:#9BA8B8">${intro}</p>
    ${tierBlock}
    ${button(tr(locale, 'Activer mon pricing fondateur', 'Lock my founder price'), v.pricingUrl)}
    ${conditions}
    ${support}
  `

  return emailChrome(content, {
    brand,
    locale,
    unsubscribeUrl: v.unsubscribeUrl,
    preheader: tr(
      locale,
      `−${v.bonusPercent}% à vie sur ton abonnement ${brand.productName} si tu actives avant J+14.`,
      `−${v.bonusPercent}% for life on your ${brand.productName} plan if you lock in before D+14.`,
    ),
  })
}

export async function sendLaunchBonus(brand: Brand, locale: Locale, v: LaunchBonusVars): Promise<SendResult> {
  return sendEmail({
    brand,
    to: v.email,
    subject: launchBonusSubject(locale, brand, v),
    html: launchBonusHtml(brand, locale, v),
    tags: [
      { name: 'template', value: 'launch-bonus' },
      { name: 'product', value: brand.productName },
      { name: 'bonus', value: String(v.bonusPercent) },
    ],
  })
}
