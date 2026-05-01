import { Brand, Locale, SendResult, button, emailChrome, escapeHtml, sendEmail, tr } from './_base'

export type WelcomeVars = {
  firstName?: string
  email: string
  loginUrl: string
  unsubscribeUrl: string
  pricingUrl?: string
  demoUrl?: string
}

export function welcomeSubject(locale: Locale, brand: Brand): string {
  return tr(
    locale,
    `Bienvenue chez ${brand.productName} 👋`,
    `Welcome to ${brand.productName} 👋`,
  )
}

export function welcomeHtml(brand: Brand, locale: Locale, v: WelcomeVars): string {
  const greet = v.firstName ? `${tr(locale, 'Bonjour', 'Hi')} ${escapeHtml(v.firstName)},` : tr(locale, 'Bonjour,', 'Hi there,')

  const intro = tr(
    locale,
    `Merci d'avoir créé un compte sur <strong style="color:#E8E0D0">${escapeHtml(brand.productName)}</strong>. Tu peux maintenant accéder à ton espace personnel et explorer le service librement.`,
    `Thanks for joining <strong style="color:#E8E0D0">${escapeHtml(brand.productName)}</strong>. You can now access your account and explore the service freely.`,
  )

  const nextSteps = tr(
    locale,
    `<p style="margin:16px 0 8px;font-weight:600;color:#E8E0D0">Prochaines étapes</p>
<ol style="margin:0 0 16px 18px;padding:0;color:#9BA8B8;font-size:14px;line-height:1.8">
  <li>Connecte-toi à ton tableau de bord pour configurer ton profil</li>
  <li>Découvre la démo pour voir un exemple de rapport en conditions réelles</li>
  <li>Choisis une formule quand tu es prêt — pas d'essai, pas d'engagement caché</li>
</ol>`,
    `<p style="margin:16px 0 8px;font-weight:600;color:#E8E0D0">Next steps</p>
<ol style="margin:0 0 16px 18px;padding:0;color:#9BA8B8;font-size:14px;line-height:1.8">
  <li>Sign in to your dashboard to set up your profile</li>
  <li>Check the live demo to see what a real report looks like</li>
  <li>Pick a plan when you're ready — no trial, no hidden lock-in</li>
</ol>`,
  )

  const links: string[] = []
  if (v.demoUrl) {
    links.push(`<a href="${escapeHtml(v.demoUrl)}" style="color:#C9A84C;text-decoration:none">${tr(locale, 'Voir la démo →', 'See the demo →')}</a>`)
  }
  if (v.pricingUrl) {
    links.push(`<a href="${escapeHtml(v.pricingUrl)}" style="color:#C9A84C;text-decoration:none">${tr(locale, 'Voir les offres →', 'See pricing →')}</a>`)
  }
  const linksRow = links.length
    ? `<p style="margin:0;color:#9BA8B8;font-size:13px">${links.join(' &nbsp;·&nbsp; ')}</p>`
    : ''

  const support = tr(
    locale,
    `<p style="margin-top:18px;color:#9BA8B8;font-size:13px">Une question ? Réponds simplement à cet email${brand.supportEmail ? ` ou écris à <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#C9A84C;text-decoration:none">${escapeHtml(brand.supportEmail)}</a>` : ''}.</p>`,
    `<p style="margin-top:18px;color:#9BA8B8;font-size:13px">Any question? Just reply to this email${brand.supportEmail ? ` or reach <a href="mailto:${escapeHtml(brand.supportEmail)}" style="color:#C9A84C;text-decoration:none">${escapeHtml(brand.supportEmail)}</a>` : ''}.</p>`,
  )

  const content = `
    <p style="margin:0 0 12px">${greet}</p>
    <p style="margin:0 0 18px;color:#9BA8B8">${intro}</p>
    ${button(tr(locale, 'Accéder à mon compte', 'Open my account'), v.loginUrl)}
    ${nextSteps}
    ${linksRow}
    ${support}
  `

  return emailChrome(content, {
    brand,
    locale,
    unsubscribeUrl: v.unsubscribeUrl,
    preheader: tr(
      locale,
      `Ton compte ${brand.productName} est prêt. Voici comment commencer.`,
      `Your ${brand.productName} account is ready. Here's how to start.`,
    ),
  })
}

export async function sendWelcome(brand: Brand, locale: Locale, v: WelcomeVars): Promise<SendResult> {
  return sendEmail({
    brand,
    to: v.email,
    subject: welcomeSubject(locale, brand),
    html: welcomeHtml(brand, locale, v),
    tags: [{ name: 'template', value: 'welcome' }, { name: 'product', value: brand.productName }],
  })
}
