'use client'

import { useState, useMemo, useEffect } from 'react'

type Product = 'ofa' | 'ftg' | 'estate' | 'shiftdynamics'
type ObjectiveType = 'mrr' | 'clients' | 'revenue'
type Tab = 'business' | 'velocity' | 'keys'

const PRODUCT_DEFAULTS: Record<Product, {
  label: string
  avgMrrPerClient: number
  funnel: { id: string; label: string; defaultRate: number }[]
  agentsCapacity: { name: string; perDay: number }[]
}> = {
  ofa: {
    label: 'One For All', avgMrrPerClient: 14.98,
    funnel: [
      { id: 'enriched',   label: 'Lead → enrichi (score ≥ 2 canaux)',    defaultRate: 0.35 },
      { id: 'pitched',    label: 'Enrichi → pitché multi-canal',         defaultRate: 0.95 },
      { id: 'opened',     label: 'Pitché → ouvert/lu',                   defaultRate: 0.50 },
      { id: 'responded',  label: 'Ouvert → réponse engagée',             defaultRate: 0.08 },
      { id: 'demo',       label: 'Réponse → demo/intérêt concret',       defaultRate: 0.45 },
      { id: 'paid',       label: 'Demo → client payant',                 defaultRate: 0.28 },
    ],
    agentsCapacity: [
      { name: 'lead-scout',      perDay: 5000 },
      { name: 'contact-finder',  perDay: 2000 },
      { name: 'site-generator',  perDay: 2000 },
      { name: 'pitcher',         perDay: 2500 },
    ],
  },
  ftg: {
    label: 'Feel The Gap', avgMrrPerClient: 49,
    funnel: [
      { id: 'sourced',    label: 'Prospect sourcé',                        defaultRate: 1 },
      { id: 'enriched',   label: 'Sourcé → contact trouvé (max canaux)',   defaultRate: 0.50 },
      { id: 'outreached', label: 'Contact → outreach envoyé',              defaultRate: 0.90 },
      { id: 'responded',  label: 'Outreach → réponse',                     defaultRate: 0.05 },
      { id: 'demo',       label: 'Réponse → demo',                         defaultRate: 0.40 },
      { id: 'paid',       label: 'Demo → abonné',                          defaultRate: 0.20 },
    ],
    agentsCapacity: [
      { name: 'ftg-vc-scout',    perDay: 500 },
      { name: 'ftg-angel-scout', perDay: 300 },
      { name: 'ftg-founder-scout', perDay: 800 },
      { name: 'contact-finder',  perDay: 1500 },
      { name: 'email-nurture',   perDay: 3000 },
    ],
  },
  estate: {
    label: 'The Estate', avgMrrPerClient: 199,
    funnel: [
      { id: 'enriched',  label: 'Hôtel identifié → contact trouvé',   defaultRate: 0.40 },
      { id: 'pitched',   label: 'Contact → pitch envoyé',             defaultRate: 0.95 },
      { id: 'responded', label: 'Pitch → réponse',                    defaultRate: 0.10 },
      { id: 'demo',      label: 'Réponse → demo produit',             defaultRate: 0.50 },
      { id: 'paid',      label: 'Demo → licence signée',              defaultRate: 0.25 },
    ],
    agentsCapacity: [
      { name: 'hotel-scout',    perDay: 300 },
      { name: 'contact-finder', perDay: 500 },
      { name: 'demo-generator', perDay: 500 },
    ],
  },
  shiftdynamics: {
    label: 'Shift Dynamics', avgMrrPerClient: 2500,
    funnel: [
      { id: 'enriched',  label: 'Entreprise cible → décideur trouvé', defaultRate: 0.30 },
      { id: 'pitched',   label: 'Décideur → LinkedIn/email envoyé',   defaultRate: 0.90 },
      { id: 'responded', label: 'Envoi → réponse',                    defaultRate: 0.05 },
      { id: 'demo',      label: 'Réponse → call découverte',          defaultRate: 0.60 },
      { id: 'paid',      label: 'Call → contrat signé',               defaultRate: 0.15 },
    ],
    agentsCapacity: [
      { name: 'enterprise-scout', perDay: 200 },
      { name: 'contact-finder',   perDay: 500 },
    ],
  },
}

const C = {
  bg: '#040D1C', card: '#071425', border: 'rgba(201,168,76,.15)',
  gold: '#C9A84C', green: '#10B981', muted: '#5A6A7A', text: '#E8E0D0', red: '#F87171', blue: '#60A5FA',
}

export default function SimulatorPage() {
  const [tab, setTab] = useState<Tab>('business')
  return (
    <div style={{ padding: 24, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Simulateurs & Opérations</h1>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
        Pilote business (revenus/funnel), vitesse de production (leviers capacité) et registre des clés API.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {([
          ['business', '🎯 Business (objectif revenus)'],
          ['velocity', '⚡ Vitesse de production'],
          ['keys',     '🔑 Registre clés API'],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              background: tab === k ? C.card : 'transparent',
              color: tab === k ? C.gold : C.muted,
              border: `1px solid ${tab === k ? C.border : 'transparent'}`,
              borderBottom: tab === k ? 'none' : undefined,
              borderRadius: '8px 8px 0 0', cursor: 'pointer',
            }}>{label}</button>
        ))}
      </div>

      {tab === 'business' && <BusinessTab />}
      {tab === 'velocity' && <VelocityTab />}
      {tab === 'keys' && <KeysTab />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 * TAB 1 — BUSINESS (existant)
 * ═══════════════════════════════════════════════════════════════════════ */
// Max values per product × objective type (cibles M12 top 1%).
const OBJECTIVE_MAX: Record<Product, Record<ObjectiveType, number>> = {
  ofa:           { mrr: 450_000,   clients: 30_000, revenue: 5_000_000 },
  ftg:           { mrr: 1_000_000, clients: 20_408, revenue: 12_000_000 },
  estate:        { mrr: 500_000,   clients: 2_500,  revenue: 6_000_000 },
  shiftdynamics: { mrr: 250_000,   clients: 100,    revenue: 3_000_000 },
}

// Maps capacity-row display names → Giant Piccolo agent IDs. Keep in sync with
// the inline agentMap in BusinessTab and the allowlist in /api/minato/scale-agent.
const SCALE_AGENT_MAP: Record<string, string> = {
  // OFA
  'lead-scout':       'ofa:scout-osm',
  'contact-finder':   'ofa:enrich-contacts',
  'site-generator':   'ofa:generate-for-leads',
  'pitcher':          'ofa:outreach',
  'enterprise-scout': 'ofa:hyperscale-scout',
  'hotel-scout':      'ofa:hyperscale-scout',
  'demo-generator':   'ofa:generate-for-leads',
  // FTG
  'ftg-vc-scout':       'ftg:investors-scout',
  'ftg-angel-scout':    'ftg:investors-scout',
  'ftg-founder-scout':  'ftg:entrepreneur-scout',
  'email-nurture':      'ftg:email-nurture',
  'commerce-pitcher':   'ftg:commerce-pitcher',
  'exporters-scout':    'ftg:exporters-scout',
  'local-buyers-scout': 'ftg:local-buyers-scout',
  'web-scout':          'ftg:web-scout',
}

function BusinessTab() {
  const [product, setProduct] = useState<Product>('ofa')
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>('mrr')
  const [objectiveValue, setObjectiveValue] = useState(10000)
  const [horizonDays, setHorizonDays] = useState(30)
  const [avgMrr, setAvgMrr] = useState(PRODUCT_DEFAULTS.ofa.avgMrrPerClient)
  const [funnel, setFunnel] = useState(PRODUCT_DEFAULTS.ofa.funnel)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [maxMode, setMaxMode] = useState(false)
  const [savedValue, setSavedValue] = useState(10000)  // last manual value (toggle off → revient ici)
  const [maxPotential, setMaxPotential] = useState<{ value: number; leadsPerDay: number; clients: number; mrr: number; multiplier: number; max_enabled: boolean; processes: number; active_bg: number } | null>(null)
  const [maxLoading, setMaxLoading] = useState(false)
  const [loadedFromDb, setLoadedFromDb] = useState(false)
  // Giant Piccolo — live instance multiplier per agent (persisted via API spawn).
  const [scaledInstances, setScaledInstances] = useState<Record<string, number>>({})
  // Strategy panel state (opened when SCALE fails or user requests "find capacity").
  const [strategy, setStrategy] = useState<any | null>(null)
  const [strategyAgent, setStrategyAgent] = useState<string>('')
  async function openStrategy(agent: string, label: string) {
    setStrategyAgent(`${agent} (${label})`); setStrategy({ loading: true })
    try {
      const r = await fetch('/api/minato/strategy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent }) })
      setStrategy(await r.json())
    } catch (e: any) { setStrategy({ ok: false, error: String(e.message) }) }
  }
  // Load from localStorage so user sees the scaling they triggered earlier.
  useEffect(() => {
    try { const s = localStorage.getItem('ofa:scaledInstances'); if (s) setScaledInstances(JSON.parse(s)) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('ofa:scaledInstances', JSON.stringify(scaledInstances)) } catch {}
  }, [scaledInstances])

  // Restore last-validated scenario for the current product on mount + product change.
  useEffect(() => {
    let cancelled = false
    setLoadedFromDb(false)
    ;(async () => {
      try {
        const r = await fetch(`/api/simulator/save?product=${product}`, { cache: 'no-store' })
        const d = await r.json()
        if (cancelled || !d.ok || !d.active) return
        const a = d.active
        setObjectiveType(a.objectiveType ?? 'mrr')
        setObjectiveValue(a.objectiveValue ?? 10000)
        setSavedValue(a.objectiveValue ?? 10000)
        setHorizonDays(a.horizonDays ?? 30)
        if (typeof a.avgMrr === 'number') setAvgMrr(a.avgMrr)
        if (Array.isArray(a.funnel)) setFunnel(a.funnel)
        setMaxMode(!!a.maxMode)
        // NOTE: do NOT recompute fetchMaxPotential here — the value the user
        // validated IS the priority target. We only refresh the info banner
        // (multiplier, leads/j) without touching objectiveValue.
        if (a.maxMode) {
          fetch(`/api/compute/max-potential?product=${product}&objective=${a.objectiveType ?? 'mrr'}&horizon=${a.horizonDays ?? 30}`, { cache: 'no-store' })
            .then(r => r.json()).then(d => {
              if (!d?.ok) return
              setMaxPotential({
                value: d.value, leadsPerDay: d.leadsPerDay, clients: d.clients, mrr: d.mrr,
                multiplier: d.multiplier, max_enabled: d.compute.max_enabled, processes: d.compute.processes, active_bg: d.compute.active_bg,
              })
            }).catch(() => {})
        }
      } finally { if (!cancelled) setLoadedFromDb(true) }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  async function fetchMaxPotential(p: Product, o: ObjectiveType, days: number) {
    setMaxLoading(true)
    try {
      const r = await fetch(`/api/compute/max-potential?product=${p}&objective=${o}&horizon=${days}`, { cache: 'no-store' })
      const d = await r.json()
      if (d.ok) {
        setMaxPotential({
          value: d.value, leadsPerDay: d.leadsPerDay, clients: d.clients, mrr: d.mrr,
          multiplier: d.multiplier, max_enabled: d.compute.max_enabled, processes: d.compute.processes, active_bg: d.compute.active_bg,
        })
        return d.value as number
      }
    } catch {} finally { setMaxLoading(false) }
    return null
  }

  async function onProductChange(p: Product) {
    setProduct(p)
    setAvgMrr(PRODUCT_DEFAULTS[p].avgMrrPerClient)
    setFunnel(PRODUCT_DEFAULTS[p].funnel)
    if (maxMode) {
      const v = await fetchMaxPotential(p, objectiveType, horizonDays)
      setObjectiveValue(v ?? OBJECTIVE_MAX[p][objectiveType])
    }
  }

  async function onObjectiveTypeChange(t: ObjectiveType) {
    setObjectiveType(t)
    if (maxMode) {
      const v = await fetchMaxPotential(product, t, horizonDays)
      setObjectiveValue(v ?? OBJECTIVE_MAX[product][t])
    }
  }

  async function toggleMax() {
    if (maxMode) {
      // OFF → revient à la dernière valeur manuelle enregistrée
      setMaxMode(false)
      setObjectiveValue(savedValue)
      setMaxPotential(null)
    } else {
      // ON → mémorise la valeur courante puis passe au MAX dynamique (instant T)
      setSavedValue(objectiveValue)
      setMaxMode(true)
      const v = await fetchMaxPotential(product, objectiveType, horizonDays)
      setObjectiveValue(v ?? OBJECTIVE_MAX[product][objectiveType])
    }
  }

  const results = useMemo(() => {
    const paidNeeded = objectiveType === 'mrr' ? Math.ceil(objectiveValue / avgMrr)
      : objectiveType === 'clients' ? objectiveValue : Math.ceil(objectiveValue / 149)
    const totalConv = funnel.reduce((acc, s) => acc * s.defaultRate, 1)
    const leadsNeeded = Math.ceil(paidNeeded / totalConv)
    const stageVolumes = funnel.reduce<{ id: string; label: string; volume: number }[]>((acc, s, i) => {
      const prev = i === 0 ? leadsNeeded : acc[i - 1].volume
      acc.push({ id: s.id, label: s.label, volume: Math.ceil(prev * s.defaultRate) })
      return acc
    }, [])
    const mrr = paidNeeded * avgMrr
    const capacity = PRODUCT_DEFAULTS[product].agentsCapacity.map(a => {
      const need = a.name.includes('scout') ? leadsNeeded
        : a.name.includes('contact-finder') ? Math.ceil(leadsNeeded * (funnel[0]?.defaultRate || 0.35))
        : a.name.includes('pitcher') ? Math.ceil(leadsNeeded * 0.3)
        : a.name.includes('site-generator') ? Math.ceil(leadsNeeded * 0.4)
        : leadsNeeded
      const instances = scaledInstances[a.name] ?? 1
      const capTotal = a.perDay * horizonDays * instances
      return { name: a.name, need, capacity: capTotal, ok: capTotal >= need, instances }
    })
    return { paidNeeded, leadsNeeded, stageVolumes, mrr, capacity, totalConv }
  }, [objectiveType, objectiveValue, avgMrr, funnel, product, horizonDays, scaledInstances])

  async function saveAndActivate() {
    setSaving(true)
    try {
      const res = await fetch('/api/simulator/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, objectiveType, objectiveValue, horizonDays, avgMrr, funnel, results, maxMode }),
      })
      const data = await res.json()
      if (res.ok) setSavedId(data.id); else alert(data.error || 'Erreur')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={panelStyle}>
        <h2 style={headerGold}>Objectif</h2>
        <Field label="Produit">
          <select value={product} onChange={e => onProductChange(e.target.value as Product)} style={selectStyle}>
            {Object.entries(PRODUCT_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Type d'objectif">
          <select value={objectiveType} onChange={e => onObjectiveTypeChange(e.target.value as ObjectiveType)} style={selectStyle}>
            <option value="mrr">MRR (revenus mensuels récurrents)</option>
            <option value="clients">Nombre de clients payants</option>
            <option value="revenue">Revenu total (one-time)</option>
          </select>
        </Field>
        <Field label={`Valeur (${objectiveType === 'mrr' ? '€/mois' : objectiveType === 'clients' ? 'clients' : '€ total'})`}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              value={objectiveValue}
              disabled={maxMode}
              onChange={e => {
                const v = +e.target.value || 0
                setObjectiveValue(v)
                if (!maxMode) setSavedValue(v)
              }}
              style={{ ...inputStyle, flex: 1, opacity: maxMode ? 0.6 : 1 }}
            />
            <button
              type="button"
              onClick={toggleMax}
              title={maxMode
                ? `Cliquer pour revenir à ${savedValue.toLocaleString('fr-FR')}`
                : `Cliquer pour passer au MAX (${OBJECTIVE_MAX[product][objectiveType].toLocaleString('fr-FR')})`}
              style={{
                padding: '6px 14px',
                background: maxMode ? C.gold : 'transparent',
                color: maxMode ? C.bg : C.gold,
                border: `1px solid ${C.gold}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {maxMode ? '✓ MAX' : 'MAX'}
            </button>
          </div>
        </Field>
        <Field label="Horizon (jours)">
          <input type="number" value={horizonDays} onChange={e => {
            const v = +e.target.value || 30
            setHorizonDays(v)
            if (maxMode) fetchMaxPotential(product, objectiveType, v).then(nv => { if (nv !== null) setObjectiveValue(nv) })
          }} style={inputStyle} />
        </Field>
        {maxMode && maxPotential && (
          <div style={{ margin: '8px 0', padding: 10, background: 'rgba(201,168,76,.08)', border: `1px solid ${C.gold}`, borderRadius: 6, fontSize: 11, color: C.text, lineHeight: 1.6 }}>
            <div style={{ color: C.gold, fontWeight: 700, letterSpacing: '.08em', marginBottom: 4 }}>
              POTENTIEL MAX À T · 90% capacité (10% réserve cognitive){maxLoading ? ' · …' : ''}
            </div>
            <div>Multiplier compute: <b>×{maxPotential.multiplier}</b> (proc={maxPotential.processes}, bg={maxPotential.active_bg}, MAX sticky={maxPotential.max_enabled ? 'ON' : 'off'})</div>
            <div>Leads/j: <b>{maxPotential.leadsPerDay.toLocaleString('fr-FR')}</b> · Clients/horizon: <b>{maxPotential.clients.toLocaleString('fr-FR')}</b> · MRR garanti: <b>{maxPotential.mrr.toLocaleString('fr-FR')} €</b></div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              Réserve 10% = chat ↔ analyses ↔ rapports ↔ monitoring ↔ sécurité ↔ nouveaux projets
            </div>
          </div>
        )}
        <Field label="MRR moyen par client (€)">
          <input type="number" step="0.01" value={avgMrr} onChange={e => setAvgMrr(+e.target.value || 0)} style={inputStyle} />
        </Field>

        <h2 style={{ ...headerGold, marginTop: 24 }}>Funnel</h2>
        {funnel.map((s, i) => (
          <Field key={s.id} label={s.label}>
            <input type="number" step="0.01" min={0} max={1} value={s.defaultRate}
              onChange={e => {
                const next = [...funnel]
                next[i] = { ...s, defaultRate: Math.max(0, Math.min(1, +e.target.value || 0)) }
                setFunnel(next)
              }} style={inputStyle} />
          </Field>
        ))}
      </div>

      <div style={panelStyle}>
        <h2 style={{ ...headerGold, color: C.green }}>Simulation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Kpi label="Clients payants" value={results.paidNeeded.toLocaleString()} color={C.gold} />
          <Kpi label="MRR atteint" value={`${Math.round(results.mrr).toLocaleString()} €`} color={C.green} />
          <Kpi label="Leads à scouter" value={results.leadsNeeded.toLocaleString()} color={C.text} />
          <Kpi label="Conversion globale" value={`${(results.totalConv * 100).toFixed(3)} %`} color={C.text} />
        </div>
        <h3 style={subH}>Funnel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {results.stageVolumes.map(s => (
            <div key={s.id} style={rowStyle}>
              <span style={{ color: C.muted }}>{s.label}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{s.volume.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <h3 style={subH}>Capacités agents ({horizonDays} jours) · 🟢 Giant Piccolo</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {results.capacity.map(a => {
            // Map business-tab agent names to scalable allowlist agents.
            const agentMap: Record<string, string> = {
              // OFA
              'lead-scout': 'ofa:scout-osm',
              'contact-finder': 'ofa:enrich-contacts',
              'site-generator': 'ofa:generate-for-leads',
              'pitcher': 'ofa:outreach',
              'enterprise-scout': 'ofa:hyperscale-scout',
              'hotel-scout': 'ofa:hyperscale-scout',
              'demo-generator': 'ofa:generate-for-leads',
              // FTG
              'ftg-vc-scout': 'ftg:investors-scout',
              'ftg-angel-scout': 'ftg:investors-scout',
              'ftg-founder-scout': 'ftg:entrepreneur-scout',
              'email-nurture': 'ftg:email-nurture',
              'commerce-pitcher': 'ftg:commerce-pitcher',
              'exporters-scout': 'ftg:exporters-scout',
              'local-buyers-scout': 'ftg:local-buyers-scout',
              'web-scout': 'ftg:web-scout',
            }
            const scalable = agentMap[a.name]
            const instances = scaledInstances[a.name] ?? 1
            return (
              <div key={a.name} style={{
                ...rowStyle,
                background: a.ok ? 'rgba(16,185,129,.05)' : 'rgba(248,113,113,.05)',
                border: `1px solid ${a.ok ? 'rgba(16,185,129,.2)' : 'rgba(248,113,113,.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>
                    {a.name} {instances > 1 && <span style={{ color: C.gold, fontWeight: 700 }}>×{instances}</span>}
                  </span>
                  <span style={{ color: a.ok ? C.green : C.red, fontWeight: 600, fontSize: 11 }}>
                    {a.need.toLocaleString()} / {a.capacity.toLocaleString()} {a.ok ? '✓' : '⚠ goulot'}
                  </span>
                </div>
                {scalable && (
                  <ScaleButton
                    agent={scalable}
                    agentLabel={a.name}
                    factor={a.ok ? 1 : 3}
                    onScaled={(n) => setScaledInstances(s => ({ ...s, [a.name]: (s[a.name] ?? 1) * (a.ok ? (n > 1 ? n : 1) : 3) }))}
                    onNeedStrategy={openStrategy}
                  />
                )}
              </div>
            )
          })}
        </div>
        <button onClick={saveAndActivate} disabled={saving}
          style={{ width: '100%', padding: '12px 16px', background: C.gold, color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Enregistrement…' : 'Valider & pousser aux agents'}
        </button>
        {savedId && <p style={{ color: C.green, fontSize: 12, marginTop: 8 }}>✓ Scénario <code>{savedId}</code> activé.</p>}

        <ScenarioHistory product={product} refreshKey={savedId} />

        <MinatoScenarios
          product={product}
          horizonDays={horizonDays}
          onApply={async (s) => {
            // 1. Apply scenario params to the form state so capacity recomputes.
            setObjectiveType(s.objectiveType)
            setObjectiveValue(s.objectiveValue)
            setSavedValue(s.objectiveValue)
            setHorizonDays(s.horizonDays)
            setAvgMrr(s.avgMrr)
            setFunnel(s.funnel)
            setMaxMode(false)
            // 2. Persist + push to agent_targets via existing save endpoint.
            await fetch('/api/simulator/save', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product, objectiveType: s.objectiveType, objectiveValue: s.objectiveValue, horizonDays: s.horizonDays, avgMrr: s.avgMrr, funnel: s.funnel, results: s.results, maxMode: false }),
            })
            // 3. Auto-spawn scale requests for every goulot.
            for (const sug of s.scaleSuggestions ?? []) {
              const agentId = SCALE_AGENT_MAP[sug.name]
              if (!agentId) continue
              try {
                await fetch('/api/minato/scale-agent', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ agent: agentId, instances: sug.instances, requester: 'minato-scenario' }),
                })
              } catch {}
              // 4. Optimistically bump local instance multiplier so the
              //    capacity rows flip from goulot → green immediately.
              setScaledInstances(prev => ({ ...prev, [sug.name]: Math.max(prev[sug.name] ?? 1, sug.instances) }))
            }
          }}
        />

        {strategy && (
          <div style={{ marginTop: 16, padding: 14, background: 'rgba(96,165,250,.06)', border: `2px solid ${C.blue}`, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong style={{ color: C.blue, fontSize: 13 }}>🧠 MINATO STRATEGY · {strategyAgent}</strong>
              <button onClick={() => setStrategy(null)} style={{ background: 'transparent', color: C.muted, border: 'none', cursor: 'pointer', fontSize: 11 }}>fermer</button>
            </div>
            {strategy.loading && <div style={{ color: C.muted, fontSize: 11 }}>Analyse…</div>}
            {strategy.ok && (
              <>
                <div style={{ padding: 10, background: 'rgba(0,0,0,.3)', borderRadius: 6, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 4 }}>DIAGNOSTIC · {strategy.diagnosis.category}</div>
                  <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>{strategy.summary.message}</div>
                  {strategy.diagnosis.blocked_provider && <div style={{ fontSize: 11, color: C.red }}>Provider en goulot : <b>{strategy.diagnosis.blocked_provider}</b></div>}
                </div>

                {strategy.in_progress && strategy.in_progress.length > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                    Tâches en cours : {strategy.in_progress.map((j: any) => `${j.name}[${j.status}]`).join(' · ')}
                  </div>
                )}
                {strategy.mrr_target && (
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
                    Objectif MRR validé : {strategy.mrr_target.objectiveValue?.toLocaleString('fr-FR')} {strategy.mrr_target.objectiveType} sur {strategy.mrr_target.horizonDays}j ({strategy.mrr_target.product})
                  </div>
                )}

                {Object.entries(strategy.options).map(([k, opt]: [string, any]) => (
                  <div key={k} style={{
                    marginBottom: 10, padding: 10,
                    background: opt.recommended ? 'rgba(16,185,129,.08)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${opt.recommended ? C.green : 'rgba(255,255,255,.08)'}`,
                    borderRadius: 6,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <strong style={{ color: opt.recommended ? C.green : C.gold, fontSize: 12 }}>{opt.name} {opt.recommended && '⭐'}</strong>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {opt.monthly_eur === 0 ? '0 €' : `${opt.monthly_eur} €/mo`} · {opt.human_clicks ?? 0} clics · {opt.setup_min ?? 0} min
                      </span>
                    </div>
                    {opt.summary && <div style={{ fontSize: 10, color: C.text, marginBottom: 6 }}>{opt.summary}</div>}
                    {opt.actions_now && (
                      <div style={{ fontSize: 10, color: C.green, marginBottom: 4 }}>
                        ✓ déjà faisable : {opt.actions_now.map((a: any) => a.what).join(' · ')}
                      </div>
                    )}
                    {opt.actions && opt.actions.length > 0 && (
                      <ul style={{ fontSize: 10, color: C.text, margin: '4px 0 0 16px', paddingLeft: 0 }}>
                        {opt.actions.map((a: any, i: number) => (
                          <li key={i} style={{ marginBottom: 2 }}>
                            <b>{a.label}</b> — <a href={a.signup_url} target="_blank" rel="noreferrer" style={{ color: C.blue }}>signup</a> · {a.quota_gain}
                          </li>
                        ))}
                      </ul>
                    )}
                    {opt.subscriptions && opt.subscriptions.length > 0 && (
                      <ul style={{ fontSize: 10, color: C.text, margin: '4px 0 0 16px', paddingLeft: 0 }}>
                        {opt.subscriptions.map((s: any, i: number) => (
                          <li key={i} style={{ marginBottom: 2 }}>
                            <b>{s.name}</b> ({s.monthly_eur} €/mo) — <a href={s.signup} target="_blank" rel="noreferrer" style={{ color: C.blue }}>upgrade</a> · {s.gain}
                          </li>
                        ))}
                      </ul>
                    )}
                    {opt.composition && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                        Composition : {Object.entries(opt.composition).filter(([_, v]: any) => v && (Array.isArray(v) ? v.length : true)).map(([k]) => k).join(' + ')}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 9, color: C.green }}>+ {(opt.pros || []).join(' · ')}</span>
                    </div>
                    <div style={{ fontSize: 9, color: C.red }}>− {(opt.cons || []).join(' · ')}</div>
                  </div>
                ))}
              </>
            )}
            {strategy.ok === false && <div style={{ color: C.red, fontSize: 11 }}>{strategy.error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 * TAB 2 — VITESSE DE PRODUCTION
 * ═══════════════════════════════════════════════════════════════════════ */

// Providers — quotas gratuits réels par compte
const PROVIDERS = {
  huggingface: { label: 'HuggingFace FLUX',    unit: 'img', perAccountPerHour: 300,  kind: 'image' },
  cloudflare:  { label: 'Cloudflare FLUX',     unit: 'img', perAccountPerHour: 20,   kind: 'image' }, // ~500/jour
  together:    { label: 'Together FLUX Free',  unit: 'img', perAccountPerHour: 600,  kind: 'image' }, // 10 RPM
  pollinations:{ label: 'Pollinations (fallback)', unit: 'img', perAccountPerHour: 99999, kind: 'image' },
  gemini:      { label: 'Gemini 2.0 Flash',    unit: 'call', perAccountPerHour: 900, kind: 'llm' }, // 15 RPM
  groq:        { label: 'Groq Llama 3.3 70B',  unit: 'call', perAccountPerHour: 1800, kind: 'llm' },
  openrouter:  { label: 'OpenRouter free',     unit: 'call', perAccountPerHour: 300,  kind: 'llm' },
  serpapi:     { label: 'SerpAPI',             unit: 'query', perAccountPerHour: 4,  kind: 'search' }, // 100/mo free
} as const

// Tâches du pipeline OFA (par site)
const TASKS = [
  { id: 'scout',        label: 'Lead scouting (Google Maps + web)',     provider: 'serpapi',    unitsPerSite: 2,  defaultSecPerUnit: 3 },
  { id: 'classify',     label: 'Classification archétype (LLM)',        provider: 'gemini',     unitsPerSite: 1,  defaultSecPerUnit: 2 },
  { id: 'sections',     label: 'Section-content LLM (5 sections)',      provider: 'gemini',     unitsPerSite: 5,  defaultSecPerUnit: 3 },
  { id: 'products',     label: 'Product typology LLM',                  provider: 'groq',       unitsPerSite: 1,  defaultSecPerUnit: 2 },
  { id: 'process',      label: 'Process story LLM',                     provider: 'gemini',     unitsPerSite: 1,  defaultSecPerUnit: 2 },
  { id: 'img_hero',     label: 'Hero image FLUX',                       provider: 'huggingface',unitsPerSite: 1,  defaultSecPerUnit: 8 },
  { id: 'img_about',    label: 'About image FLUX',                      provider: 'huggingface',unitsPerSite: 1,  defaultSecPerUnit: 8 },
  { id: 'img_sections', label: 'Sections images FLUX (×5)',             provider: 'huggingface',unitsPerSite: 5,  defaultSecPerUnit: 8 },
  { id: 'img_products', label: 'Products images FLUX (×4)',             provider: 'huggingface',unitsPerSite: 4,  defaultSecPerUnit: 8 },
  { id: 'img_process',  label: 'Process story image FLUX',              provider: 'huggingface',unitsPerSite: 1,  defaultSecPerUnit: 8 },
] as { id: string; label: string; provider: string; unitsPerSite: number; defaultSecPerUnit: number }[]

function VelocityTab() {
  const [targetSites, setTargetSites] = useState(100000)
  const [horizonDays, setHorizonDays] = useState(7)
  const [workHoursPerDay, setWorkHoursPerDay] = useState(20) // 4h maintenance/buffer
  const [tasks, setTasks] = useState(TASKS.map(t => ({ ...t, secPerUnit: t.defaultSecPerUnit })))
  const [capacityPlan, setCapacityPlan] = useState<any | null>(null)
  const [scaleLog, setScaleLog] = useState<string | null>(null)

  async function findCapacity(provider?: string, gap?: number) {
    setCapacityPlan({ loading: true })
    try {
      const r = await fetch('/api/minato/find-capacity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, gap }),
      })
      setCapacityPlan(await r.json())
    } catch (e: any) {
      setCapacityPlan({ ok: false, error: String(e.message) })
    }
  }

  async function scaleAgent(agent: string, instances = 2) {
    setScaleLog(`Scaling ${agent} ×${instances}…`)
    try {
      const r = await fetch('/api/minato/scale-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, instances }),
      })
      const d = await r.json()
      if (d.ok) setScaleLog(`✓ ${agent} ×${d.instances} spawned (PIDs ${d.spawned.map((s:any)=>s.pid).join(',')})`)
      else setScaleLog(`✗ ${d.error ?? 'error'}`)
    } catch (e: any) { setScaleLog(`✗ ${e.message}`) }
  }

  // Map provider → agents that depend on it (Giant Piccolo quick-scale).
  const PROVIDER_TO_AGENTS: Record<string, string[]> = {
    cloudflare: ['ofa:generate-for-leads', 'ofa:fix-demos'],
    huggingface: ['ofa:generate-for-leads', 'ofa:fix-demos'],
    gemini: ['ofa:hyperscale-scout', 'ofa:generate-for-leads', 'ftg:seo-factory'],
    groq: ['ofa:hyperscale-scout', 'ofa:generate-for-leads'],
    together: ['ofa:generate-for-leads'],
    fal: ['ofa:generate-for-leads'],
    places: ['ofa:enrich-contacts'],
    resend: ['ofa:outreach'],
  }

  const { currentAccounts, scenarioAccounts } = useVelocityAccountsLoader()

  const results = useMemo(() => {
    const totalHours = horizonDays * workHoursPerDay
    const sitesPerHour = targetSites / totalHours

    // Pour chaque tâche : unités/heure nécessaires, puis comptes nécessaires selon provider
    const perTask = tasks.map(t => {
      const unitsPerHour = sitesPerHour * t.unitsPerSite
      // parallélisme théorique par compte = 3600/secPerUnit (1 worker séquentiel), mais provider quota prime
      const provider = PROVIDERS[t.provider as keyof typeof PROVIDERS]
      const quotaLimit = provider.perAccountPerHour
      const seqLimit = Math.floor(3600 / Math.max(1, t.secPerUnit))
      const effectivePerAccount = Math.min(quotaLimit, seqLimit)
      const accountsNeeded = Math.ceil(unitsPerHour / effectivePerAccount)
      const currentCount = currentAccounts[t.provider] || 0
      return {
        ...t,
        unitsPerHour: Math.round(unitsPerHour),
        quotaLimit,
        seqLimit,
        effectivePerAccount,
        accountsNeeded,
        currentCount,
        gap: accountsNeeded - currentCount,
      }
    })

    // Agrégation par provider (plusieurs tâches partagent le même pool)
    const byProvider: Record<string, { needed: number; current: number; gap: number; label: string }> = {}
    for (const t of perTask) {
      const p = t.provider
      byProvider[p] = byProvider[p] || { needed: 0, current: t.currentCount, gap: 0, label: PROVIDERS[p as keyof typeof PROVIDERS].label }
      byProvider[p].needed += t.accountsNeeded
    }
    for (const p of Object.keys(byProvider)) {
      byProvider[p].gap = Math.max(0, byProvider[p].needed - byProvider[p].current)
    }

    return { totalHours, sitesPerHour, perTask, byProvider }
  }, [tasks, targetSites, horizonDays, workHoursPerDay, currentAccounts])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={panelStyle}>
        <h2 style={headerGold}>Objectif de production</h2>
        <Field label="Nombre de sites à produire">
          <input type="number" value={targetSites} onChange={e => setTargetSites(+e.target.value || 0)} style={inputStyle} />
        </Field>
        <Field label="Horizon (jours)">
          <input type="number" value={horizonDays} onChange={e => setHorizonDays(+e.target.value || 1)} style={inputStyle} />
        </Field>
        <Field label="Heures de production /jour (infra dispo)">
          <input type="number" min={1} max={24} value={workHoursPerDay} onChange={e => setWorkHoursPerDay(Math.max(1, Math.min(24, +e.target.value || 20)))} style={inputStyle} />
        </Field>

        <h2 style={{ ...headerGold, marginTop: 20 }}>Leviers par tâche (temps/unité)</h2>
        <p style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
          Réduire le temps = plus de débit par compte (tant que le quota provider le permet).
        </p>
        {tasks.map((t, i) => (
          <Field key={t.id} label={`${t.label} — ${PROVIDERS[t.provider as keyof typeof PROVIDERS].unit}`}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" min={1} value={t.secPerUnit}
                onChange={e => {
                  const next = [...tasks]
                  next[i] = { ...t, secPerUnit: Math.max(1, +e.target.value || 1) }
                  setTasks(next)
                }} style={{ ...inputStyle, width: 80 }} />
              <span style={{ fontSize: 11, color: C.muted }}>s/unité · ×{t.unitsPerSite}/site</span>
            </div>
          </Field>
        ))}
      </div>

      <div style={panelStyle}>
        <h2 style={{ ...headerGold, color: C.green }}>Comptes API nécessaires</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Kpi label="Sites/heure" value={results.sitesPerHour.toFixed(1)} color={C.gold} />
          <Kpi label="Sites/jour" value={Math.round(results.sitesPerHour * workHoursPerDay).toLocaleString()} color={C.blue} />
        </div>

        <h3 style={subH}>Par provider (agrégé) · 🟢 Giant Piccolo</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {Object.entries(results.byProvider).map(([p, v]) => {
            const ok = v.gap === 0
            const agents = PROVIDER_TO_AGENTS[p] || []
            return (
              <div key={p} style={{
                ...rowStyle,
                background: ok ? 'rgba(16,185,129,.05)' : 'rgba(248,113,113,.05)',
                border: `1px solid ${ok ? 'rgba(16,185,129,.2)' : 'rgba(248,113,113,.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>{v.label}</span>
                  <span style={{ color: ok ? C.green : C.red, fontWeight: 600, fontSize: 11 }}>
                    {v.current} / {v.needed} {ok ? '✓' : `· gap=${v.gap}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {agents[0] && (
                    <button onClick={() => scaleAgent(agents[0], 2)} title={`Giant Piccolo — spawn 2× ${agents[0]}`}
                      style={{ padding: '4px 8px', background: 'transparent', color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 4, fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                      🚀 SCALE
                    </button>
                  )}
                  {!ok && (
                    <button onClick={() => findCapacity(p, v.gap)} title="Plan free-tier pour combler le gap"
                      style={{ padding: '4px 8px', background: 'transparent', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 4, fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                      🔎 FIND CAPACITY
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {scaleLog && (
          <div style={{ margin: '8px 0', padding: 8, background: 'rgba(201,168,76,.06)', border: `1px solid ${C.gold}`, borderRadius: 6, fontSize: 11, color: C.text, fontFamily: 'monospace' }}>
            {scaleLog}
          </div>
        )}

        {capacityPlan && (
          <div style={{ margin: '8px 0', padding: 12, background: 'rgba(96,165,250,.06)', border: `1px solid ${C.blue}`, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ color: C.blue, fontSize: 12 }}>Plan free-tier</strong>
              <button onClick={() => setCapacityPlan(null)} style={{ background: 'transparent', color: C.muted, border: 'none', cursor: 'pointer', fontSize: 11 }}>fermer</button>
            </div>
            {capacityPlan.loading && <div style={{ color: C.muted, fontSize: 11 }}>Génération…</div>}
            {capacityPlan.ok && (
              <>
                <div style={{ fontSize: 11, color: C.text, marginBottom: 8 }}>
                  Total: <b>{capacityPlan.summary.total_accounts_to_create}</b> comptes · <b>{capacityPlan.summary.total_time_min} min</b> · <b>{capacityPlan.summary.total_cost_eur}€</b>
                </div>
                {capacityPlan.plans.map((p: any) => (
                  <div key={p.provider} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <strong style={{ fontSize: 12, color: C.gold }}>{p.label}</strong>
                      <span style={{ fontSize: 10, color: C.muted }}>créer {p.accounts_to_create} × · actif {p.active_now}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{p.quota_gained}</div>
                    <a href={p.signup_url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 10 }}>{p.signup_url}</a>
                    <div style={{ fontSize: 10, color: C.text, marginTop: 4 }}>Alias: {p.aliases.join(', ')}</div>
                    <ol style={{ fontSize: 10, color: C.muted, margin: '4px 0 0 16px', paddingLeft: 0 }}>
                      {p.steps.map((s: string, i: number) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
                    </ol>
                  </div>
                ))}
              </>
            )}
            {capacityPlan.ok === false && <div style={{ color: C.red, fontSize: 11 }}>{capacityPlan.error}</div>}
          </div>
        )}

        <h3 style={subH}>Détail par tâche</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
          {results.perTask.map(t => (
            <div key={t.id} style={{ ...rowStyle, fontSize: 11, padding: '4px 8px' }}>
              <span style={{ color: C.muted }}>{t.label}</span>
              <span style={{ color: C.text, fontFamily: 'monospace' }}>
                {t.unitsPerHour.toLocaleString()}/h · {t.accountsNeeded} cpt ({t.effectivePerAccount}/h chacun)
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.25)', borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginBottom: 6 }}>💡 Lecture rapide</p>
          <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>
            Si un provider est en rouge → il faut créer le gap indiqué de nouveaux comptes gratuits (1 compte = 1 email).
            L'onglet <strong>Registre clés API</strong> sert à logger chaque compte avec un label (HF clé 1, etc).
            Les vraies clés restent en env vars sur Vercel/VPS, jamais dans la base.
          </p>
        </div>
      </div>
    </div>
  )
}

function useVelocityAccountsLoader() {
  const [currentAccounts, setCurrentAccounts] = useState<Record<string, number>>({})
  const [scenarioAccounts, setScenarioAccounts] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/admin/api-keys').then(r => r.json()).then(d => {
      const counts: Record<string, number> = {}
      for (const row of (d.rows || [])) {
        if (row.status === 'active') counts[row.provider] = (counts[row.provider] || 0) + 1
      }
      setCurrentAccounts(counts)
    }).catch(() => {})
  }, [])
  return { currentAccounts, scenarioAccounts }
}

/* ═══════════════════════════════════════════════════════════════════════
 * TAB 3 — REGISTRE CLÉS API
 * ═══════════════════════════════════════════════════════════════════════ */
type ApiKeyRow = {
  id: string; provider: string; label: string; status: string;
  env_var_name?: string; purpose?: string; daily_quota?: number; notes?: string;
  added_at?: string; last_used_at?: string; last_429_at?: string;
}

function KeysTab() {
  const [rows, setRows] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ provider: 'huggingface', label: '', env_var_name: '', purpose: 'image_gen', daily_quota: 0, notes: '' })

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/api-keys').then(x => x.json())
    setRows(r.rows || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addKey() {
    if (!form.label) return alert('Label requis')
    const r = await fetch('/api/admin/api-keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (r.ok) { setForm({ ...form, label: '', env_var_name: '', notes: '' }); load() }
  }

  async function setStatus(id: string, status: string) {
    await fetch('/api/admin/api-keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    load()
  }

  async function removeKey(id: string) {
    if (!confirm('Supprimer ce compte du registre ?')) return
    await fetch('/api/admin/api-keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  // Group by provider
  const byProvider = rows.reduce<Record<string, ApiKeyRow[]>>((acc, r) => {
    acc[r.provider] = acc[r.provider] || []; acc[r.provider].push(r); return acc
  }, {})

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
      <div style={panelStyle}>
        <h2 style={headerGold}>Ajouter un compte</h2>
        <Field label="Provider">
          <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} style={selectStyle}>
            {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Label (ex: HF clé 1)">
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={inputStyle} placeholder="HF clé 1" />
        </Field>
        <Field label="Nom env var (sur Vercel/VPS)">
          <input value={form.env_var_name} onChange={e => setForm({ ...form, env_var_name: e.target.value })} style={inputStyle} placeholder="HUGGINGFACE_API_KEY_1" />
        </Field>
        <Field label="Usage">
          <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} style={selectStyle}>
            <option value="image_gen">Image gen (FLUX)</option>
            <option value="llm_text">LLM texte</option>
            <option value="search">Search/scraping</option>
            <option value="scraping">Web scraping</option>
          </select>
        </Field>
        <Field label="Quota/jour (indicatif)">
          <input type="number" value={form.daily_quota} onChange={e => setForm({ ...form, daily_quota: +e.target.value || 0 })} style={inputStyle} />
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} placeholder="gmail alias +1" />
        </Field>
        <button onClick={addKey}
          style={{ width: '100%', padding: '10px 14px', background: C.gold, color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
          ＋ Ajouter au registre
        </button>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          ⚠️ Ce registre stocke UNIQUEMENT le label et le nom d'env var.<br/>
          La valeur secrète de la clé reste dans Vercel/VPS via <code>vercel env add</code> — jamais en base.
        </p>
      </div>

      <div style={panelStyle}>
        <h2 style={{ ...headerGold, color: C.green }}>Comptes enregistrés</h2>
        {loading && <p style={{ color: C.muted, fontSize: 12 }}>Chargement…</p>}
        {!loading && rows.length === 0 && <p style={{ color: C.muted, fontSize: 12 }}>Aucun compte enregistré. Ajoute-en à gauche.</p>}
        {Object.entries(byProvider).map(([p, list]) => {
          const active = list.filter(r => r.status === 'active').length
          return (
            <div key={p} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: C.gold, fontWeight: 600, fontSize: 12 }}>
                  {PROVIDERS[p as keyof typeof PROVIDERS]?.label || p}
                </span>
                <span style={{ color: C.muted, fontSize: 11 }}>{active} actif{active > 1 ? 's' : ''} / {list.length} total</span>
              </div>
              {list.map(r => (
                <div key={r.id} style={{ ...rowStyle, marginBottom: 4, fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: r.status === 'active' ? 'rgba(16,185,129,.15)' : r.status === 'rate_limited' ? 'rgba(251,191,36,.15)' : 'rgba(248,113,113,.15)',
                      color: r.status === 'active' ? C.green : r.status === 'rate_limited' ? '#FBBF24' : C.red,
                    }}>{r.status}</span>
                    <span style={{ color: C.text, fontWeight: 600 }}>{r.label}</span>
                    {r.env_var_name && <code style={{ color: C.muted, fontSize: 11 }}>{r.env_var_name}</code>}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={r.status} onChange={e => setStatus(r.id, e.target.value)}
                      style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,.04)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                      <option value="active">active</option>
                      <option value="rate_limited">rate_limited</option>
                      <option value="exhausted">exhausted</option>
                      <option value="revoked">revoked</option>
                    </select>
                    <button onClick={() => removeKey(r.id)}
                      style={{ fontSize: 10, padding: '2px 8px', background: 'transparent', color: C.red, border: `1px solid ${C.red}40`, borderRadius: 4, cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
 * UI helpers
 * ═══════════════════════════════════════════════════════════════════════ */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(201,168,76,.2)', borderRadius: 6, color: '#fff', fontSize: 13,
}
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'auto' }
const panelStyle: React.CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }
const headerGold: React.CSSProperties = { fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', color: C.gold, marginBottom: 16 }
const subH: React.CSSProperties = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5A6A7A', marginBottom: 6 }
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 6, alignItems: 'center' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#9BA8B8', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  )
}
type ScaleStatus = 'idle' | 'demandé' | 'spawning' | 'actif' | 'fini' | 'partiel' | 'err'

function ScaleButton({ agent, agentLabel, factor, onScaled, onNeedStrategy }: { agent: string; agentLabel: string; factor: number; onScaled: (instances: number) => void; onNeedStrategy?: (agent: string, label: string) => void }) {
  const requestStrategy = onNeedStrategy ?? (() => {})
  const [status, setStatus] = useState<ScaleStatus>('idle')
  const [pids, setPids] = useState<number[]>([])
  const [alive, setAlive] = useState<number[]>([])
  const [note, setNote] = useState<string>('')
  const [reqId, setReqId] = useState<number | null>(null)

  async function pollStatus(id: number, attempt = 0) {
    try {
      const r = await fetch(`/api/minato/scale-agent?id=${id}`, { cache: 'no-store' })
      const d = await r.json()
      if (!d.ok || !d.request) return
      const req = d.request
      const p = req.pids ?? []
      const a = req.alive_pids ?? []
      setPids(p); setAlive(a)
      if (req.status === 'pending') { setStatus('demandé'); setNote('en queue (worker VPS toutes les 60s)') }
      else if (req.status === 'spawning') { setStatus('spawning'); setNote(`PIDs ${p.slice(0, 3).join(',')}`) }
      else if (req.status === 'active') {
        setStatus('actif'); setNote(`${a.length}/${p.length} ✓`)
        onScaled(a.length)
        return
      }
      else if (req.status === 'completed') {
        setStatus('fini'); setNote(`${p.length}/${p.length} ✓ terminé proprement`)
        onScaled(p.length)
        return
      }
      else if (req.status === 'partial') { setStatus('partiel'); setNote(`${a.length}/${p.length} vivants`); onScaled(a.length) }
      else if (req.status === 'err') {
        setStatus('err'); setNote(req.error_msg?.slice(0, 40) ?? 'tous morts · stratégie requise')
        // Auto-open Minato strategy panel after a failure
        setTimeout(() => requestStrategy(agent, agentLabel), 800)
        return
      }
      // Continue polling for up to ~3 minutes
      if (attempt < 20 && req.status !== 'active' && req.status !== 'err') {
        setTimeout(() => pollStatus(id, attempt + 1), attempt < 3 ? 3000 : 10000)
      }
    } catch {}
  }

  async function go() {
    setStatus('demandé'); setNote('envoi requête à la queue VPS…')
    try {
      const r = await fetch('/api/minato/scale-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, instances: factor, requester: 'ui' }),
      })
      const d = await r.json()
      if (!d.ok) { setStatus('err'); setNote(String(d.error).slice(0, 40)); setTimeout(() => requestStrategy(agent, agentLabel), 800); return }
      setReqId(d.id)
      setNote(`req #${d.id} en queue · cron /1 min`)
      pollStatus(d.id, 0)
    } catch (e: any) { setStatus('err'); setNote(e.message?.slice(0, 40) ?? 'err') }
  }

  const palette: Record<ScaleStatus, { bg: string; fg: string; bd: string; icon: string }> = {
    idle:     { bg: 'transparent',       fg: '#C9A84C', bd: '#C9A84C', icon: '🚀' },
    demandé:  { bg: 'rgba(96,165,250,.15)', fg: '#60A5FA', bd: '#60A5FA', icon: '⏳' },
    spawning: { bg: 'rgba(201,168,76,.2)',  fg: '#C9A84C', bd: '#C9A84C', icon: '⚙️' },
    actif:    { bg: '#10B981',            fg: '#07090F', bd: '#10B981', icon: '✓' },
    fini:     { bg: 'rgba(16,185,129,.2)',fg: '#10B981', bd: '#10B981', icon: '✅' },
    partiel:  { bg: 'rgba(245,158,11,.2)', fg: '#F59E0B', bd: '#F59E0B', icon: '◐' },
    err:      { bg: '#F87171',            fg: '#07090F', bd: '#F87171', icon: '✗' },
  }
  const p = palette[status]
  const label = status === 'idle' ? `🚀 SCALE ×${factor}` : `${p.icon} ${status} ${note ? '· ' + note : ''}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button onClick={go} disabled={status === 'demandé' || status === 'spawning'}
        title={`Giant Piccolo — spawn ${factor}× ${agent} · ${agentLabel}`}
        style={{ padding: '4px 8px', background: p.bg, color: p.fg, border: `1px solid ${p.bd}`, borderRadius: 4, fontSize: 10, cursor: (status === 'demandé' || status === 'spawning') ? 'wait' : 'pointer', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 120, transition: 'all .2s' }}>
        {label}
      </button>
      {(status === 'actif' || status === 'partiel' || status === 'spawning') && pids.length > 0 && (
        <span style={{ fontSize: 9, color: '#5A6A7A', fontFamily: 'monospace' }}>
          pid: {pids.join(',')} {alive.length > 0 && `· alive: ${alive.join(',')}`}
        </span>
      )}
    </div>
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

type MinatoScenario = {
  tier: 'conservative' | 'balanced' | 'aggressive'
  label: string
  why: string
  objectiveType: 'mrr' | 'clients' | 'revenue'
  objectiveValue: number
  horizonDays: number
  avgMrr: number
  funnel: { id: string; label: string; defaultRate: number }[]
  results: { paidNeeded: number; leadsNeeded: number; mrr: number; capacity: { name: string; need: number; capacity: number; ok: boolean; perDay: number }[] }
  scaleSuggestions: { name: string; instances: number; reason: string }[]
}

function MinatoScenarios({ product, horizonDays, onApply }: {
  product: string
  horizonDays: number
  onApply: (s: MinatoScenario) => Promise<void> | void
}) {
  const [scenarios, setScenarios] = useState<MinatoScenario[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function generate() {
    setLoading(true); setErr(null); setApplied(null)
    try {
      const r = await fetch('/api/simulator/generate-scenarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, horizonDays }),
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error || 'erreur')
      setScenarios(d.scenarios)
    } catch (e: any) { setErr(e.message?.slice(0, 80) ?? 'erreur') }
    finally { setLoading(false) }
  }

  async function choose(s: MinatoScenario) {
    setApplying(s.tier)
    try { await onApply(s); setApplied(s.tier) }
    finally { setApplying(null) }
  }

  const tierColors: Record<string, string> = {
    conservative: '#60A5FA',
    balanced: '#C9A84C',
    aggressive: '#F87171',
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(201,168,76,.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={subH}>🧠 Scénarios Minato</h3>
        <button onClick={generate} disabled={loading}
          style={{ padding: '6px 12px', background: loading ? 'transparent' : '#C9A84C', color: loading ? '#C9A84C' : '#000', border: '1px solid #C9A84C', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? '… Minato réfléchit' : scenarios ? '🔄 Regénérer' : '⚡ Générer 3 scénarios'}
        </button>
      </div>
      {err && <p style={{ color: '#F87171', fontSize: 11 }}>✗ {err}</p>}
      {scenarios && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scenarios.map(s => {
            const color = tierColors[s.tier]
            const isApplied = applied === s.tier
            const isApplying = applying === s.tier
            const gouls = s.results.capacity.filter(c => !c.ok).length
            return (
              <div key={s.tier} style={{
                padding: 12, borderRadius: 8,
                background: isApplied ? 'rgba(16,185,129,.08)' : 'rgba(255,255,255,.02)',
                border: `1px solid ${isApplied ? 'rgba(16,185,129,.3)' : color + '40'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      {s.label}
                    </div>
                    <div style={{ color: '#E8E0D0', fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                      {s.objectiveValue.toLocaleString('fr-FR')} € MRR · {s.horizonDays}j
                    </div>
                    <div style={{ color: '#9BA8B8', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
                      {s.why}
                    </div>
                  </div>
                  <button onClick={() => choose(s)} disabled={isApplying || isApplied}
                    style={{
                      padding: '6px 12px',
                      background: isApplied ? '#10B981' : (isApplying ? 'transparent' : color),
                      color: isApplied || !isApplying ? '#000' : color,
                      border: `1px solid ${isApplied ? '#10B981' : color}`,
                      borderRadius: 6, fontSize: 11, fontWeight: 700,
                      cursor: isApplying || isApplied ? 'default' : 'pointer', whiteSpace: 'nowrap',
                    }}>
                    {isApplied ? '✓ Activé' : isApplying ? '…' : 'Choisir & scale'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: '#5A6A7A', flexWrap: 'wrap' }}>
                  <span>📊 {s.results.leadsNeeded.toLocaleString('fr-FR')} leads</span>
                  <span>🎯 {s.results.paidNeeded.toLocaleString('fr-FR')} payants</span>
                  {gouls > 0 ? (
                    <span style={{ color: '#F87171' }}>⚠ {gouls} goulot{gouls > 1 ? 's' : ''} → auto-scale</span>
                  ) : (
                    <span style={{ color: '#10B981' }}>✓ capacité OK</span>
                  )}
                </div>
                {s.scaleSuggestions.length > 0 && (
                  <div style={{ marginTop: 8, padding: 8, background: 'rgba(0,0,0,.2)', borderRadius: 4, fontSize: 10, color: '#9BA8B8' }}>
                    <div style={{ color: '#F59E0B', fontWeight: 700, marginBottom: 4 }}>Scale auto au clic :</div>
                    {s.scaleSuggestions.map(sug => (
                      <div key={sug.name} style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', color: '#C9A84C' }}>{sug.name}</span>
                        <span>×{sug.instances}</span>
                        <span style={{ color: '#5A6A7A' }}>({sug.reason})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScenarioHistory({ product, refreshKey }: { product: string; refreshKey: string | null }) {
  const [items, setItems] = useState<any[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  async function load() {
    try {
      const r = await fetch(`/api/simulator/list?product=${product}&limit=10`, { cache: 'no-store' })
      const d = await r.json()
      if (d.ok) setItems(d.scenarios)
    } catch {}
  }
  useEffect(() => { load() }, [product, refreshKey])
  async function activate(id: string) {
    setBusy(id)
    try {
      await fetch('/api/simulator/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarioId: id }) })
      await load()
    } finally { setBusy(null) }
  }
  if (!items.length) return null
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(201,168,76,.15)' }}>
      <h3 style={subH}>Historique ({items.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
        {items.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: s.isActive ? 'rgba(16,185,129,.06)' : 'transparent', borderRadius: 4, border: `1px solid ${s.isActive ? 'rgba(16,185,129,.2)' : 'transparent'}`, fontSize: 11 }}>
            <span style={{ color: '#5A6A7A', fontFamily: 'monospace' }}>{new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
            <span style={{ color: '#E8E0D0', flex: 1 }}>
              {s.objective_type} {s.objective_value.toLocaleString('fr-FR')} · {s.horizon_days}j
            </span>
            {s.isActive ? (
              <span style={{ color: '#10B981', fontWeight: 700, fontSize: 10 }}>● ACTIF</span>
            ) : (
              <button onClick={() => activate(s.id)} disabled={busy === s.id} style={{ padding: '3px 8px', background: 'transparent', color: '#C9A84C', border: '1px solid rgba(201,168,76,.3)', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                {busy === s.id ? '…' : 'Activer'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
