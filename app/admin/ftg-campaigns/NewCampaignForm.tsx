'use client'

import { useState } from 'react'

const C = {
  card: '#0A1A2E', border: 'rgba(201,168,76,.15)', gold: '#C9A84C',
  text: '#E8E0D0', muted: '#9BA8B8', dim: '#5A6A7A',
  blue: '#3B82F6', green: '#10B981', red: '#EF4444',
}

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  entrepreneur_cold: {
    subject: '{{firstName}}, gap import {{topProduct}} en {{topCountry}} = {{topGapMillion}}M USD',
    body:
      "Bonjour {{firstName}},\n\n" +
      "Je regardais les données d'import de votre secteur et j'ai remarqué qu'{{topCountry}} importe {{topProduct}} pour {{topGapMillion}}M USD/an — avec seulement {{topCompetitors}} fournisseurs principaux.\n\n" +
      "Avec votre background en {{segment}}, vous pourriez positionner une offre directe qui capterait 10-15% de ce gap en 18 mois.\n\n" +
      "On a modélisé 3 scénarios pour ce marché (garanti/médian/high) avec:\n" +
      "- Méthodes de production locales validées\n" +
      "- 5-8 clients B2B déjà identifiés par nom\n" +
      "- Business plan chiffré à l'euro près\n\n" +
      "Je peux vous envoyer le dossier complet (30 min à lire) si ça vous parle. Répondez juste \"oui\" ou \"non\".\n\n" +
      "{{myFirstName}}",
  },
  trading_company_cold: {
    subject: 'Question sur {{topProduct}} — côté {{topCountry}}',
    body:
      "Bonjour {{firstName}},\n\n" +
      "J'ai vu sur LinkedIn que {{companyName}} travaillait sur des flux {{segmentContext}}.\n\n" +
      "Une data qu'on a remontée pourrait vous intéresser : {{topCountry}} importe {{topGapMillion}}M USD de {{topProduct}}/an avec un gap non-couvert de {{topCompetitorGap}}%.\n\n" +
      "Si vous êtes sur ce segment ou envisagez d'y aller, on a la cartographie complète (suppliers, buyers, pricing benchmarks, 3 scénarios d'entrée). 5 min pour vous le résumer au tél ?\n\n" +
      "{{myFirstName}}",
  },
  custom: { subject: '', body: '' },
}

export default function NewCampaignForm() {
  const [name, setName] = useState('')
  const [segment, setSegment] = useState<string>('entrepreneur')
  const [provider, setProvider] = useState<string>('instantly')
  const [channel, setChannel] = useState<string>('email_cold')
  const [templateKey, setTemplateKey] = useState<keyof typeof TEMPLATES>('entrepreneur_cold')
  const [subject, setSubject] = useState(TEMPLATES.entrepreneur_cold.subject)
  const [body, setBody] = useState(TEMPLATES.entrepreneur_cold.body)
  const [gapMatchMin, setGapMatchMin] = useState(50)
  const [budget, setBudget] = useState(500)
  const [countries, setCountries] = useState('USA,CHN,DEU,JPN')
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  function applyTemplate(key: keyof typeof TEMPLATES) {
    setTemplateKey(key)
    setSubject(TEMPLATES[key].subject)
    setBody(TEMPLATES[key].body)
  }

  async function submit() {
    setState('busy'); setMsg(null)
    try {
      const res = await fetch('/api/ftg-campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name, channel, segment, provider,
          template_subject: subject, template_body: body,
          gap_match_min: gapMatchMin,
          budget_eur: budget,
          country_iso_filter: countries.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'error')
      setState('ok')
      setMsg(`✓ Campagne créée (id: ${json.id.slice(0, 8)})`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      setState('err'); setMsg(`✗ ${e.message}`)
    }
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <Field label="Nom campagne">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Founders USA — semiconductors April" style={input} />
        </Field>
        <Field label="Template">
          <select value={templateKey} onChange={(e) => applyTemplate(e.target.value as any)} style={input}>
            <option value="entrepreneur_cold">Entrepreneur cold (avec gap data)</option>
            <option value="trading_company_cold">Trading company cold</option>
            <option value="custom">Custom (free)</option>
          </select>
        </Field>

        <Field label="Segment cible">
          <select value={segment} onChange={(e) => setSegment(e.target.value)} style={input}>
            <option value="entrepreneur">Entrepreneur</option>
            <option value="trading_company">Trading company</option>
            <option value="investor">Investor</option>
            <option value="student">Student</option>
          </select>
        </Field>
        <Field label="Provider">
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={input}>
            <option value="instantly">📧 Instantly.ai (cold email)</option>
            <option value="apollo">🚀 Apollo.io (sequences)</option>
            <option value="phantombuster">👻 PhantomBuster (LinkedIn)</option>
            <option value="custom">🛠️ Custom (manual)</option>
          </select>
        </Field>

        <Field label="Channel">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} style={input}>
            <option value="email_cold">Email cold</option>
            <option value="linkedin_inmail">LinkedIn InMail</option>
            <option value="linkedin_connect">LinkedIn Connect + note</option>
            <option value="multi">Multi-channel</option>
          </select>
        </Field>
        <Field label={`Gap match score min : ${gapMatchMin}`}>
          <input type="range" min={0} max={100} value={gapMatchMin} onChange={(e) => setGapMatchMin(Number(e.target.value))} style={{ ...input, padding: 0 }} />
        </Field>

        <Field label="Countries ISO3 (comma-separated)">
          <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="USA,CHN,DEU,JPN" style={input} />
        </Field>
        <Field label="Budget €">
          <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={input} />
        </Field>
      </div>

      <Field label="Subject template (avec {{variables}})">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} style={input} />
      </Field>

      <Field label="Body template">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ ...input, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
      </Field>

      <div style={{ fontSize: 11, color: C.dim, marginTop: 4, marginBottom: '1rem' }}>
        Variables disponibles : <code>{'{{firstName}}'}</code>, <code>{'{{companyName}}'}</code>, <code>{'{{topProduct}}'}</code>, <code>{'{{topCountry}}'}</code>, <code>{'{{topGapMillion}}'}</code>, <code>{'{{segment}}'}</code>, <code>{'{{myFirstName}}'}</code>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button onClick={submit} disabled={state === 'busy' || !name || !subject || !body} style={{
          padding: '0.75rem 1.5rem',
          background: state === 'busy' ? C.dim : `linear-gradient(135deg, ${C.gold}, #B8953A)`,
          color: '#000', border: 0, borderRadius: 6, fontWeight: 700, cursor: 'pointer',
        }}>
          {state === 'busy' ? '⌛ Création…' : '🚀 Créer (draft)'}
        </button>
        {msg && <span style={{ color: state === 'ok' ? C.green : C.red, fontSize: 13 }}>{msg}</span>}
      </div>

      <div style={{ marginTop: '1rem', fontSize: 11, color: C.dim }}>
        La campagne est créée en <code>draft</code>. Elle envoie uniquement quand tu l'actives depuis la liste ci-dessous
        (button "Activate" à venir). Exige que {provider === 'instantly' ? 'INSTANTLY_API_KEY' : provider === 'apollo' ? 'APOLLO_API_KEY' : 'la clé provider'} soit configurée côté FTG.
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: '#040D1C',
  border: '1px solid rgba(201,168,76,.2)',
  borderRadius: 4,
  color: '#E8E0D0',
  fontSize: 13,
}
