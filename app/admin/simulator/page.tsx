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

  function onProductChange(p: Product) {
    setProduct(p)
    setAvgMrr(PRODUCT_DEFAULTS[p].avgMrrPerClient)
    setFunnel(PRODUCT_DEFAULTS[p].funnel)
    if (maxMode) setObjectiveValue(OBJECTIVE_MAX[p][objectiveType])
  }

  function onObjectiveTypeChange(t: ObjectiveType) {
    setObjectiveType(t)
    if (maxMode) setObjectiveValue(OBJECTIVE_MAX[product][t])
  }

  function toggleMax() {
    if (maxMode) {
      // OFF → revient à la dernière valeur manuelle
      setMaxMode(false)
      setObjectiveValue(savedValue)
    } else {
      // ON → mémorise la valeur courante puis passe au MAX
      setSavedValue(objectiveValue)
      setMaxMode(true)
      setObjectiveValue(OBJECTIVE_MAX[product][objectiveType])
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
      const capTotal = a.perDay * horizonDays
      return { name: a.name, need, capacity: capTotal, ok: capTotal >= need }
    })
    return { paidNeeded, leadsNeeded, stageVolumes, mrr, capacity, totalConv }
  }, [objectiveType, objectiveValue, avgMrr, funnel, product, horizonDays])

  async function saveAndActivate() {
    setSaving(true)
    try {
      const res = await fetch('/api/simulator/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, objectiveType, objectiveValue, horizonDays, avgMrr, funnel, results }),
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
          <input type="number" value={horizonDays} onChange={e => setHorizonDays(+e.target.value || 30)} style={inputStyle} />
        </Field>
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
        <h3 style={subH}>Capacités agents ({horizonDays} jours)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {results.capacity.map(a => (
            <div key={a.name} style={{
              ...rowStyle,
              background: a.ok ? 'rgba(16,185,129,.05)' : 'rgba(248,113,113,.05)',
              border: `1px solid ${a.ok ? 'rgba(16,185,129,.2)' : 'rgba(248,113,113,.3)'}`,
            }}>
              <span style={{ color: C.muted, fontFamily: 'monospace' }}>{a.name}</span>
              <span style={{ color: a.ok ? C.green : C.red, fontWeight: 600 }}>
                {a.need.toLocaleString()} / {a.capacity.toLocaleString()} {a.ok ? '✓' : '⚠ goulot'}
              </span>
            </div>
          ))}
        </div>
        <button onClick={saveAndActivate} disabled={saving}
          style={{ width: '100%', padding: '12px 16px', background: C.gold, color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Enregistrement…' : 'Valider & pousser aux agents'}
        </button>
        {savedId && <p style={{ color: C.green, fontSize: 12, marginTop: 8 }}>✓ Scénario <code>{savedId}</code> activé.</p>}
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

        <h3 style={subH}>Par provider (agrégé)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {Object.entries(results.byProvider).map(([p, v]) => {
            const ok = v.gap === 0
            return (
              <div key={p} style={{
                ...rowStyle,
                background: ok ? 'rgba(16,185,129,.05)' : 'rgba(248,113,113,.05)',
                border: `1px solid ${ok ? 'rgba(16,185,129,.2)' : 'rgba(248,113,113,.3)'}`,
              }}>
                <span style={{ color: C.muted }}>{v.label}</span>
                <span style={{ color: ok ? C.green : C.red, fontWeight: 600, fontSize: 12 }}>
                  {v.current} / {v.needed} {ok ? '✓' : `· créer ${v.gap} compte${v.gap > 1 ? 's' : ''}`}
                </span>
              </div>
            )
          })}
        </div>

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
function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: '#5A6A7A', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
