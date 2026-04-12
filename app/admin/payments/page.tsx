import CopyButton from './copy-button'

export const metadata = { title: 'Payments — Admin' }

const GOLD = '#C9A84C'

type Card = { label: string; number: string; desc: string; category: string }
const CARDS: Card[] = [
  { category: 'Succès', label: 'Visa',                      number: '4242 4242 4242 4242', desc: 'Paiement OK, toutes zones' },
  { category: 'Succès', label: 'Visa (debit)',              number: '4000 0566 5566 5556', desc: 'Debit succès' },
  { category: 'Succès', label: 'Mastercard',                number: '5555 5555 5555 4444', desc: 'MC succès' },
  { category: 'Succès', label: 'American Express',          number: '3782 822463 10005',   desc: 'Amex succès' },
  { category: 'Succès', label: 'Discover',                  number: '6011 1111 1111 1117', desc: 'Discover succès' },
  { category: 'Décline', label: 'Generic decline',          number: '4000 0000 0000 0002', desc: 'Refusé (card_declined)' },
  { category: 'Décline', label: 'Insufficient funds',       number: '4000 0000 0000 9995', desc: 'Fonds insuffisants' },
  { category: 'Décline', label: 'Expired card',             number: '4000 0000 0000 0069', desc: 'Carte expirée' },
  { category: 'Décline', label: 'Incorrect CVC',            number: '4000 0000 0000 0127', desc: 'CVC incorrect' },
  { category: 'Décline', label: 'Processing error',         number: '4000 0000 0000 0119', desc: 'Erreur processeur' },
  { category: '3D Secure', label: 'Auth required (OK)',     number: '4000 0027 6000 3184', desc: '3DS challenge → succès' },
  { category: '3D Secure', label: 'Auth required (FAIL)',   number: '4000 0082 6000 3178', desc: '3DS challenge → échec' },
  { category: '3D Secure', label: '3DS2 frictionless',      number: '4000 0000 0000 3055', desc: 'Pas de challenge' },
  { category: 'Fraude', label: 'Stolen card (Radar)',       number: '4100 0000 0000 0019', desc: 'Bloqué par Radar' },
  { category: 'Fraude', label: 'High-risk',                 number: '4000 0000 0000 4954', desc: 'Radar flag risque élevé' },
  { category: 'SEPA', label: 'SEPA Debit succès',           number: 'DE89 3704 0044 0532 0130 00', desc: 'Compte IBAN test OK' },
  { category: 'SEPA', label: 'SEPA Debit échec',            number: 'DE62 3704 0044 0532 0130 00', desc: 'Débit échoué' },
]

const EXP = { month: '12', year: '34', cvc: '123', cvcAmex: '1234', zipUS: '10001', zipFR: '75001' }

const PROJECTS: { name: string; url: string; pricingUrl: string; dashboard: string }[] = [
  {
    name: 'One For All (OFA)',
    url: 'https://site-factory-delta.vercel.app',
    pricingUrl: 'https://site-factory-delta.vercel.app/pricing',
    dashboard: 'https://dashboard.stripe.com/test/dashboard',
  },
]

export default function PaymentsPage() {
  const byCat = CARDS.reduce<Record<string, Card[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c); return acc
  }, {})

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Payments</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Cheat sheet Stripe test · cartes, champs, projets, webhook.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Field label="Expiration" value={`${EXP.month}/${EXP.year}`} hint="MM/YY — n'importe quel futur" />
        <Field label="CVC" value={EXP.cvc} hint={`Amex: ${EXP.cvcAmex}`} />
        <Field label="Code postal (US)" value={EXP.zipUS} hint="N'importe lequel valide" />
        <Field label="Code postal (FR)" value={EXP.zipFR} hint="N'importe lequel valide" />
      </section>

      {Object.entries(byCat).map(([cat, items]) => (
        <section key={cat} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, color: '#7D8BA0', marginBottom: 10 }}>
            {cat}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
            {items.map((c) => <CardRow key={c.number} card={c} />)}
          </div>
        </section>
      ))}

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, color: '#7D8BA0', marginBottom: 10 }}>
          Projets configurés
        </h2>
        {PROJECTS.map((p) => (
          <div key={p.name} style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{p.name}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={p.pricingUrl} label="Pricing" />
              <Link href={p.url} label="Site prod" />
              <Link href={p.dashboard} label="Stripe dashboard (test)" />
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, color: '#7D8BA0', marginBottom: 10 }}>
          Astuces rapides
        </h2>
        <ul style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 1.6, paddingLeft: 18 }}>
          <li>Les paiements test n'apparaissent jamais côté compte bancaire — ils restent dans Stripe test.</li>
          <li>Pour simuler un email réel côté Checkout, utilise <code>test+abc@example.com</code>.</li>
          <li>Dashboard webhook : onglet <b>Evénements</b> pour voir les POST reçus et rejouer si besoin.</li>
          <li>Passer en LIVE : remplacer les clés <code>sk_test_</code>/<code>pk_test_</code> par <code>sk_live_</code>/<code>pk_live_</code> dans Vercel env vars — zéro change de code.</li>
          <li>Les cartes ci-dessus ne marchent qu'en mode test (toggle Test ON dans le dashboard Stripe).</li>
        </ul>
      </section>
    </div>
  )
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: '#7D8BA0', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
        <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 18, fontWeight: 700 }}>{value}</div>
        <CopyButton text={value} />
      </div>
      {hint && <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>{hint}</div>}
    </div>
  )
}

function CardRow({ card }: { card: Card }) {
  return (
    <div style={{ background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{card.label}</div>
        <CopyButton text={card.number.replace(/\s/g, '')} />
      </div>
      <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 15, letterSpacing: 1, color: GOLD }}>
        {card.number}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: '#94A3B8' }}>{card.desc}</div>
    </div>
  )
}

function Link({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      fontSize: 12, fontWeight: 600, color: GOLD, padding: '6px 10px',
      border: `1px solid ${GOLD}33`, borderRadius: 8, textDecoration: 'none',
    }}>
      ↗ {label}
    </a>
  )
}
