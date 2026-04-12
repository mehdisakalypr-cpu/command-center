'use client'

import { useState, useMemo } from 'react'

type Product = 'ofa' | 'ftg' | 'estate' | 'shiftdynamics'
type ObjectiveType = 'mrr' | 'clients' | 'revenue'

const PRODUCT_DEFAULTS: Record<Product, {
  label: string
  avgMrrPerClient: number
  funnel: { id: string; label: string; defaultRate: number }[]
  agentsCapacity: { name: string; perDay: number }[]
  externalCosts: { name: string; unit: number; unitLabel: string }[]
}> = {
  ofa: {
    label: 'One For All',
    avgMrrPerClient: 14.98,
    funnel: [
      { id: 'enriched',   label: 'Lead → enrichi (score ≥ 2 canaux)',        defaultRate: 0.35 },
      { id: 'pitched',    label: 'Enrichi → pitché multi-canal',             defaultRate: 0.95 },
      { id: 'opened',     label: 'Pitché → ouvert/lu',                        defaultRate: 0.50 },
      { id: 'responded',  label: 'Ouvert → réponse engagée',                  defaultRate: 0.08 },
      { id: 'demo',       label: 'Réponse → demo/intérêt concret',            defaultRate: 0.45 },
      { id: 'paid',       label: 'Demo → client payant',                      defaultRate: 0.28 },
    ],
    agentsCapacity: [
      { name: 'lead-scout',      perDay: 5000 },
      { name: 'contact-finder',  perDay: 2000 },
      { name: 'site-generator',  perDay: 2000 },
      { name: 'pitcher',         perDay: 2500 },
    ],
    externalCosts: [
      { name: 'SerpAPI (contact-finder)', unit: 0.003, unitLabel: 'par requête' },
      { name: 'Hunter/Apollo email',      unit: 0.01,  unitLabel: 'par vérif' },
      { name: 'WhatsApp Business API',    unit: 50,    unitLabel: 'par mois fixe' },
      { name: 'Twilio SMS',               unit: 0.06,  unitLabel: 'par SMS' },
      { name: 'LLM perso pitches',        unit: 0.003, unitLabel: 'par pitch' },
    ],
  },
  ftg: {
    label: 'Feel The Gap',
    avgMrrPerClient: 49, // mix Data 29 / Strategy 99 / Premium 149
    funnel: [
      { id: 'sourced',    label: 'Prospect sourcé',                            defaultRate: 1 },
      { id: 'enriched',   label: 'Sourcé → contact trouvé (max canaux)',       defaultRate: 0.50 },
      { id: 'outreached', label: 'Contact → outreach envoyé',                  defaultRate: 0.90 },
      { id: 'responded',  label: 'Outreach → réponse',                         defaultRate: 0.05 },
      { id: 'demo',       label: 'Réponse → demo',                             defaultRate: 0.40 },
      { id: 'paid',       label: 'Demo → abonné (Data/Strategy/Premium)',      defaultRate: 0.20 },
    ],
    agentsCapacity: [
      { name: 'ftg-vc-scout',    perDay: 500 },
      { name: 'ftg-angel-scout', perDay: 300 },
      { name: 'ftg-founder-scout', perDay: 800 },
      { name: 'contact-finder',  perDay: 1500 },
      { name: 'email-nurture',   perDay: 3000 },
    ],
    externalCosts: [
      { name: 'SerpAPI',      unit: 0.003, unitLabel: 'par requête' },
      { name: 'LinkedIn Sales Nav', unit: 99,   unitLabel: 'par mois fixe' },
      { name: 'Apollo/Hunter',  unit: 0.01,  unitLabel: 'par vérif' },
    ],
  },
  estate: {
    label: 'The Estate',
    avgMrrPerClient: 199, // licence hôtel moyenne
    funnel: [
      { id: 'enriched',  label: 'Hôtel identifié → contact trouvé',            defaultRate: 0.40 },
      { id: 'pitched',   label: 'Contact → pitch envoyé',                      defaultRate: 0.95 },
      { id: 'responded', label: 'Pitch → réponse',                             defaultRate: 0.10 },
      { id: 'demo',      label: 'Réponse → demo produit',                      defaultRate: 0.50 },
      { id: 'paid',      label: 'Demo → licence signée',                       defaultRate: 0.25 },
    ],
    agentsCapacity: [
      { name: 'hotel-scout',     perDay: 300 },
      { name: 'contact-finder',  perDay: 500 },
      { name: 'demo-generator',  perDay: 500 },
    ],
    externalCosts: [
      { name: 'SerpAPI',  unit: 0.003, unitLabel: 'par requête' },
      { name: 'Apollo',   unit: 0.01,  unitLabel: 'par vérif' },
    ],
  },
  shiftdynamics: {
    label: 'Shift Dynamics',
    avgMrrPerClient: 2500, // consulting retainer
    funnel: [
      { id: 'enriched',  label: 'Entreprise cible → décideur trouvé',          defaultRate: 0.30 },
      { id: 'pitched',   label: 'Décideur → LinkedIn/email envoyé',            defaultRate: 0.90 },
      { id: 'responded', label: 'Envoi → réponse',                             defaultRate: 0.05 },
      { id: 'demo',      label: 'Réponse → call découverte',                   defaultRate: 0.60 },
      { id: 'paid',      label: 'Call → contrat signé',                        defaultRate: 0.15 },
    ],
    agentsCapacity: [
      { name: 'enterprise-scout', perDay: 200 },
      { name: 'contact-finder',   perDay: 500 },
    ],
    externalCosts: [
      { name: 'LinkedIn Sales Nav', unit: 99, unitLabel: 'par mois fixe' },
      { name: 'Apollo',           unit: 0.01, unitLabel: 'par vérif' },
    ],
  },
}

const C = {
  bg: '#040D1C', card: '#071425', border: 'rgba(201,168,76,.15)',
  gold: '#C9A84C', green: '#10B981', muted: '#5A6A7A', text: '#E8E0D0', red: '#F87171',
}

export default function SimulatorPage() {
  const [product, setProduct] = useState<Product>('ofa')
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>('mrr')
  const [objectiveValue, setObjectiveValue] = useState(10000)
  const [horizonDays, setHorizonDays] = useState(30)
  const [avgMrr, setAvgMrr] = useState(PRODUCT_DEFAULTS.ofa.avgMrrPerClient)
  const [funnel, setFunnel] = useState(PRODUCT_DEFAULTS.ofa.funnel)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  function onProductChange(p: Product) {
    setProduct(p)
    setAvgMrr(PRODUCT_DEFAULTS[p].avgMrrPerClient)
    setFunnel(PRODUCT_DEFAULTS[p].funnel)
  }

  const results = useMemo(() => {
    const paidNeeded = objectiveType === 'mrr'
      ? Math.ceil(objectiveValue / avgMrr)
      : objectiveType === 'clients'
      ? objectiveValue
      : Math.ceil(objectiveValue / 149) // revenue one-time hypothèse 149€
    const totalConv = funnel.reduce((acc, s) => acc * s.defaultRate, 1)
    const leadsNeeded = Math.ceil(paidNeeded / totalConv)
    const stageVolumes = funnel.reduce<{ id: string; label: string; volume: number }[]>((acc, s, i) => {
      const prev = i === 0 ? leadsNeeded : acc[i - 1].volume
      acc.push({ id: s.id, label: s.label, volume: Math.ceil(prev * s.defaultRate) })
      return acc
    }, [])
    const mrr = paidNeeded * avgMrr
    const ltvMonths = 18 // hypothèse
    const capacity = PRODUCT_DEFAULTS[product].agentsCapacity.reduce((acc, a) => {
      const need = a.name.includes('scout') ? leadsNeeded
        : a.name.includes('contact-finder') ? Math.ceil(leadsNeeded * (funnel[0]?.defaultRate || 0.35))
        : a.name.includes('pitcher') ? Math.ceil(leadsNeeded * 0.3)
        : a.name.includes('site-generator') ? Math.ceil(leadsNeeded * 0.4)
        : leadsNeeded
      const capTotal = a.perDay * horizonDays
      acc.push({ name: a.name, need, capacity: capTotal, ok: capTotal >= need })
      return acc
    }, [] as { name: string; need: number; capacity: number; ok: boolean }[])
    return { paidNeeded, leadsNeeded, stageVolumes, mrr, ltvMonths, capacity, totalConv }
  }, [objectiveType, objectiveValue, avgMrr, funnel, product, horizonDays])

  async function saveAndActivate() {
    setSaving(true)
    try {
      const res = await fetch('/api/simulator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product, objectiveType, objectiveValue, horizonDays, avgMrr, funnel, results,
        }),
      })
      const data = await res.json()
      if (res.ok) setSavedId(data.id)
      else alert(data.error || 'Erreur')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: 24, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Simulateur Business</h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
        Définis un objectif (MRR / clients / revenu) → le simulateur calcule le funnel, les capacités agents et les coûts.
        « Valider » enregistre le scénario et pousse les objectifs aux agents.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Colonne 1 — Entrées */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: C.gold, marginBottom: 16 }}>Objectif</h2>

          <Field label="Produit">
            <select value={product} onChange={e => onProductChange(e.target.value as Product)} style={selectStyle}>
              {Object.entries(PRODUCT_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>

          <Field label="Type d'objectif">
            <select value={objectiveType} onChange={e => setObjectiveType(e.target.value as ObjectiveType)} style={selectStyle}>
              <option value="mrr">MRR (revenus mensuels récurrents)</option>
              <option value="clients">Nombre de clients payants</option>
              <option value="revenue">Revenu total (one-time)</option>
            </select>
          </Field>

          <Field label={`Valeur (${objectiveType === 'mrr' ? '€/mois' : objectiveType === 'clients' ? 'clients' : '€ total'})`}>
            <input type="number" value={objectiveValue} onChange={e => setObjectiveValue(+e.target.value || 0)} style={inputStyle} />
          </Field>

          <Field label="Horizon (jours)">
            <input type="number" value={horizonDays} onChange={e => setHorizonDays(+e.target.value || 30)} style={inputStyle} />
          </Field>

          <Field label="MRR moyen par client (€)">
            <input type="number" step="0.01" value={avgMrr} onChange={e => setAvgMrr(+e.target.value || 0)} style={inputStyle} />
          </Field>

          <h2 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: C.gold, marginTop: 24, marginBottom: 12 }}>Hypothèses funnel (taux de conversion par étape)</h2>
          {funnel.map((s, i) => (
            <Field key={s.id} label={s.label}>
              <input
                type="number" step="0.01" min={0} max={1}
                value={s.defaultRate}
                onChange={e => {
                  const next = [...funnel]
                  next[i] = { ...s, defaultRate: Math.max(0, Math.min(1, +e.target.value || 0)) }
                  setFunnel(next)
                }}
                style={inputStyle}
              />
            </Field>
          ))}
        </div>

        {/* Colonne 2 — Résultats */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: C.green, marginBottom: 16 }}>Simulation</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Kpi label="Clients payants" value={results.paidNeeded.toLocaleString()} color={C.gold} />
            <Kpi label="MRR atteint" value={`${Math.round(results.mrr).toLocaleString()} €`} color={C.green} />
            <Kpi label="Leads à scouter" value={results.leadsNeeded.toLocaleString()} color={C.text} />
            <Kpi label="Conversion globale" value={`${(results.totalConv * 100).toFixed(3)} %`} color={C.text} />
          </div>

          <h3 style={subH}>Funnel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {results.stageVolumes.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 6 }}>
                <span style={{ color: C.muted }}>{s.label}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{s.volume.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <h3 style={subH}>Capacités agents ({horizonDays} jours)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {results.capacity.map(a => (
              <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: a.ok ? 'rgba(16,185,129,.05)' : 'rgba(248,113,113,.05)', border: `1px solid ${a.ok ? 'rgba(16,185,129,.2)' : 'rgba(248,113,113,.3)'}`, borderRadius: 6 }}>
                <span style={{ color: C.muted, fontFamily: 'monospace' }}>{a.name}</span>
                <span style={{ color: a.ok ? C.green : C.red, fontWeight: 600 }}>
                  {a.need.toLocaleString()} / {a.capacity.toLocaleString()} {a.ok ? '✓' : '⚠ goulot'}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={saveAndActivate}
            disabled={saving}
            style={{
              width: '100%', padding: '12px 16px', marginTop: 12,
              background: C.gold, color: '#000', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Enregistrement…' : 'Valider cet objectif & pousser aux agents'}
          </button>
          {savedId && (
            <p style={{ color: C.green, fontSize: 12, marginTop: 8 }}>
              ✓ Scénario <code>{savedId}</code> activé. Les agents liront cet objectif au prochain lancement.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#fff', fontSize: 13,
}
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'auto' }
const subH: React.CSSProperties = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5A6A7A', marginBottom: 6 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#9BA8B8', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  )
}
function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: '#5A6A7A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
