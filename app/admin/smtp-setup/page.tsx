import CopyButton from '../payments/copy-button'

export const metadata = { title: 'SMTP Setup · Resend × Supabase' }

const GOLD = '#C9A84C'

const SMTP_HOST = 'smtp.resend.com'
const SMTP_PORT = '465'
const SMTP_USER = 'resend'
const SUPABASE_URL = 'https://supabase.com/dashboard/project/jebuagyeapkltyjitosm/auth/templates'

export default function SmtpSetupPage() {
  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: 960 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>SMTP Setup — Resend × Supabase</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Débloque les emails illimités pour reset password, email verification, magic link.
          2 minutes de setup dans Supabase Auth.
        </p>
      </header>

      <div style={{ background: '#3F1D1D', border: '1px solid #F8717140', borderRadius: 10, padding: 14, marginBottom: 20, color: '#FCA5A5', fontSize: 13 }}>
        <b>Actuellement :</b> Supabase tape sur son SMTP par défaut (3-4 emails/heure, gratuit). D'où les "no code reçu" quand tu demandes forgot password. Avec Resend tu passes à 100 emails/jour free puis 50k/mois sur Pro ($20/mo).
      </div>

      <Step n={1} title="Récupère ta clé API Resend">
        <p style={{ color: '#CBD5E1', lineHeight: 1.6 }}>
          Va sur <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>resend.com/api-keys</a> et copie ta clé (ou crée-en une "supabase-auth"). Format <code>re_...</code>.
        </p>
      </Step>

      <Step n={2} title="Vérifie ton domaine Resend">
        <p style={{ color: '#CBD5E1', lineHeight: 1.6 }}>
          Sur <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>resend.com/domains</a> → "Add Domain". Indique ton domaine (ex: <code>one-for-all.app</code> quand tu l'auras). Resend te donne 3 enregistrements DNS (TXT SPF, TXT DKIM, MX) à ajouter chez ton registrar (Namecheap/OVH).
        </p>
        <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
          Tant que tu n'as pas de domaine custom, tu peux tester avec <code>onboarding@resend.dev</code> (limité à ton propre email).
        </p>
      </Step>

      <Step n={3} title="Configure Supabase SMTP">
        <p style={{ color: '#CBD5E1', lineHeight: 1.6, marginBottom: 16 }}>
          Ouvre <a href={SUPABASE_URL} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>Supabase Dashboard → Auth → Email Templates → SMTP Settings ↗</a>, active "Enable Custom SMTP" et remplis avec les valeurs ci-dessous (bouton Copier sur chaque).
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Sender email" value="auth@ton-domaine.com" hint="remplace ton-domaine par le domaine vérifié Resend" />
          <Field label="Sender name" value="One For All" />
          <Field label="Host" value={SMTP_HOST} />
          <Field label="Port" value={SMTP_PORT} hint="SSL (587 pour TLS)" />
          <Field label="Username" value={SMTP_USER} />
          <Field label="Password" value="re_... (ta clé Resend)" hint="NE PAS partager — met ta vraie clé Resend ici" sensitive />
          <Field label="Minimum interval between emails" value="60" hint="en secondes, protection anti-spam" />
        </div>
      </Step>

      <Step n={4} title="Clique Save en bas de la page Supabase">
        <p style={{ color: '#CBD5E1', lineHeight: 1.6 }}>
          Supabase teste la connexion automatiquement. Tu verras une bannière verte si c'est bon.
        </p>
      </Step>

      <Step n={5} title="Teste un forgot password">
        <p style={{ color: '#CBD5E1', lineHeight: 1.6 }}>
          Va sur <a href="https://cc-dashboard.vercel.app/auth/forgot" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>cc-dashboard.vercel.app/auth/forgot</a>, entre un email valide, clique "Envoyer le code". Le code doit arriver en &lt; 10 secondes.
        </p>
      </Step>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#071425', border: '1px solid rgba(201,168,76,.2)', borderRadius: 12, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: GOLD, color: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, flexShrink: 0,
        }}>{n}</div>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff' }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 42 }}>{children}</div>
    </section>
  )
}

function Field({ label, value, hint, sensitive }: { label: string; value: string; hint?: string; sensitive?: boolean }) {
  return (
    <div style={{ background: '#0b0e16', border: '1px solid rgba(201,168,76,.15)', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 14, fontFamily: 'ui-monospace, Menlo, monospace', color: sensitive ? '#F59E0B' : '#fff', wordBreak: 'break-all' }}>
            {value}
          </div>
        </div>
        {!sensitive && <CopyButton text={value} />}
      </div>
      {hint && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{hint}</div>}
    </div>
  )
}
