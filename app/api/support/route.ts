import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// POST /api/support — Créer un ticket de support
// Appelable depuis The Estate, Shift Dynamics, Feel The Gap
// CORS ouvert pour les domaines autorisés
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') ?? ''
  const ALLOWED_ORIGINS = [
    'https://the-estate-fo.netlify.app',
    'https://consulting-on55melzp-mehdisakalypr-3843s-projects.vercel.app',
    'https://feel-the-gap.vercel.app',
    'https://feel-the-gap.duckdns.org',
    'https://command-center01.duckdns.org',
    'https://command-center-lemon-xi.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ]

  const corsHeaders = {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  const { name, email, project, subject, message, userId } = await req.json().catch(() => ({}))

  if (!email || !message || !project) {
    return NextResponse.json({ error: 'Champs requis : email, message, project' }, { status: 400 }, )
  }

  const ticketRef = `${project.toUpperCase().slice(0,3)}-${Date.now().toString(36).toUpperCase()}`

  // Insérer en Supabase
  const { error } = await sb.from('support_tickets').insert({
    ref:     ticketRef,
    project,
    name:    name    ?? null,
    email,
    subject: subject ?? `Support ${project}`,
    message,
    user_id: userId  ?? null,
    status:  'open',
  })

  if (error) {
    console.error('[support] supabase insert error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: corsHeaders })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    const projectLabels: Record<string, string> = {
      'the-estate':    'The Estate',
      'shift-dynamics':'Shift Dynamics',
      'feel-the-gap':  'Feel The Gap',
    }
    const projectLabel = projectLabels[project] ?? project

    // Email au client
    await resend.emails.send({
      from:    `${projectLabel} Support <onboarding@resend.dev>`,
      to:      email,
      subject: `[${ticketRef}] Votre demande a bien été reçue`,
      html: `
<div style="font-family:system-ui,sans-serif;background:#07090F;color:#e2e8f0;padding:40px 32px;max-width:600px;margin:0 auto">
  <div style="margin-bottom:24px;font-weight:800;font-size:18px;color:#C9A84C">${projectLabel}</div>
  <h2 style="font-size:20px;font-weight:700;margin-bottom:12px">Votre demande a bien été reçue</h2>
  <p style="color:rgba(255,255,255,.7);line-height:1.6">
    Bonjour${name ? ` ${name}` : ''},<br><br>
    Nous avons bien enregistré votre demande. Notre équipe vous répondra dans les meilleurs délais.
  </p>
  <div style="margin:20px 0;padding:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px">
    <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:8px">RÉFÉRENCE DE TICKET</div>
    <div style="font-size:18px;font-weight:700;font-family:monospace;color:#C9A84C">${ticketRef}</div>
    <div style="margin-top:12px;font-size:13px;color:rgba(255,255,255,.5)">Objet : ${subject ?? message.slice(0, 60)}</div>
  </div>
  <p style="font-size:13px;color:rgba(255,255,255,.4)">
    Conservez cette référence pour tout suivi de votre demande.
  </p>
</div>`,
    }).catch(err => console.error('[support] email client', err))

    // Email à l'admin
    await resend.emails.send({
      from:    `Support Bot <onboarding@resend.dev>`,
      to:      process.env.ADMIN_EMAIL!,
      subject: `[${ticketRef}] Nouveau ticket ${projectLabel} — ${subject ?? message.slice(0,40)}`,
      html: `
<div style="font-family:system-ui,sans-serif;background:#07090F;color:#e2e8f0;padding:32px;max-width:600px">
  <div style="color:#C9A84C;font-weight:700;margin-bottom:16px">${projectLabel} — Nouveau ticket support</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:8px 0;color:rgba(255,255,255,.4);font-size:13px;width:120px">Référence</td><td style="font-weight:700;font-family:monospace;color:#C9A84C">${ticketRef}</td></tr>
    <tr><td style="padding:8px 0;color:rgba(255,255,255,.4);font-size:13px">Nom</td><td>${name ?? '—'}</td></tr>
    <tr><td style="padding:8px 0;color:rgba(255,255,255,.4);font-size:13px">Email</td><td><a href="mailto:${email}" style="color:#3B82F6">${email}</a></td></tr>
    <tr><td style="padding:8px 0;color:rgba(255,255,255,.4);font-size:13px">Projet</td><td>${projectLabel}</td></tr>
    <tr><td style="padding:8px 0;color:rgba(255,255,255,.4);font-size:13px">Objet</td><td>${subject ?? '—'}</td></tr>
  </table>
  <div style="padding:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:14px;line-height:1.7;white-space:pre-wrap">${message}</div>
  <div style="margin-top:16px;font-size:12px;color:rgba(255,255,255,.3)">
    Répondre directement à cet email pour contacter le client.
  </div>
</div>`,
      replyTo: email,
    }).catch(err => console.error('[support] email admin', err))
  }

  return NextResponse.json({ ok: true, ref: ticketRef }, { headers: corsHeaders })
}

// OPTIONS — preflight CORS
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
