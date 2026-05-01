import { Resend } from 'resend'

export type Locale = 'fr' | 'en'

export type Brand = {
  productName: string
  productUrl: string
  fromAddress?: string
  supportEmail?: string
  postalAddress?: string
}

export type SendResult = { ok: true; id: string } | { ok: false; reason: string }

const FALLBACK_FROM = 'Gapup <noreply@gapup.io>'
const FALLBACK_POSTAL_FR = 'Gapup · Paris, France'
const FALLBACK_POSTAL_EN = 'Gapup · Paris, France'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function tr(locale: Locale, fr: string, en: string): string {
  return locale === 'fr' ? fr : en
}

type ChromeOpts = {
  brand: Brand
  locale: Locale
  unsubscribeUrl: string
  preheader?: string
}

export function emailChrome(content: string, opts: ChromeOpts): string {
  const { brand, locale, unsubscribeUrl, preheader } = opts
  const postal = brand.postalAddress ?? (locale === 'fr' ? FALLBACK_POSTAL_FR : FALLBACK_POSTAL_EN)
  const unsubLabel = tr(locale, 'Se désabonner', 'Unsubscribe')
  const productLabel = brand.productUrl.replace(/^https?:\/\//, '')

  const preheaderHtml = preheader
    ? `<div style="display:none;overflow:hidden;line-height:1px;max-height:0;max-width:0;opacity:0;color:transparent">${escapeHtml(preheader)}</div>`
    : ''

  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(brand.productName)}</title></head>
<body style="margin:0;padding:0;background:#040D1C">
${preheaderHtml}
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#040D1C;color:#E8E0D0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#0A1A2E;border:1px solid rgba(201,168,76,.15);border-radius:12px;overflow:hidden">
    <div style="padding:24px 28px 12px 28px;border-bottom:1px solid rgba(201,168,76,.1)">
      <a href="${escapeHtml(brand.productUrl)}" style="color:#C9A84C;font-weight:800;font-size:16px;letter-spacing:.05em;text-decoration:none">${escapeHtml(brand.productName)}</a>
    </div>
    <div style="padding:24px 28px 28px 28px;line-height:1.6;font-size:15px;color:#E8E0D0">
      ${content}
    </div>
    <div style="padding:18px 28px;border-top:1px solid rgba(201,168,76,.08);font-size:11px;color:#9BA8B8;line-height:1.7">
      ${escapeHtml(postal)}<br>
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9BA8B8;text-decoration:underline">${unsubLabel}</a>
      &nbsp;·&nbsp;<a href="${escapeHtml(brand.productUrl)}" style="color:#C9A84C;text-decoration:none">${escapeHtml(productLabel)}</a>
    </div>
  </div>
</div>
</body></html>`
}

export function button(label: string, href: string): string {
  return `<div style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#C9A84C;color:#040D1C;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-size:14px;letter-spacing:.02em">${escapeHtml(label)}</a></div>`
}

export async function sendEmail(opts: {
  brand: Brand
  to: string
  subject: string
  html: string
  replyTo?: string
  tags?: { name: string; value: string }[]
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, reason: 'RESEND_API_KEY absent' }
  if (!opts.to) return { ok: false, reason: 'no recipient' }
  const from = opts.brand.fromAddress || process.env.EMAIL_FROM || FALLBACK_FROM
  try {
    const resend = new Resend(key)
    const res = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      tags: opts.tags,
    } as any)
    if ((res as any).error) return { ok: false, reason: String((res as any).error.message ?? (res as any).error) }
    return { ok: true, id: String((res as any).data?.id ?? '') }
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? 'send failed' }
  }
}
