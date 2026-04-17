'use client'

import { useEffect, useState } from 'react'

/**
 * /admin/api-keys — panneau de rotation des clés API free-tier.
 *
 * Objectif actuel : vérifier que l'infra round-robin Gemini fonctionne avant
 * que l'humain crée les N comptes free depuis le panel V/R. Chaque compte
 * ajoute ~1500 RPM de capacité pour `ftg:seo-factory` (cf. memory
 * reference_autoscale_scenarios.md).
 *
 * Ce que fait la page :
 *  - GET /api/admin/api-keys/rotation-test → compteur "X/N clés Gemini actives"
 *  - POST /api/admin/api-keys/rotation-test (n=5) → affiche quel alias a servi
 *    à chaque tirage + distribution (sanity check : idéalement équilibré).
 */

const GOLD = '#C9A84C'

type RegistryRow = {
  id: string
  project: string
  env_var_name: string
  status: 'active' | 'revoked' | 'exhausted'
  last_used_at: string | null
}

type Pick = { step: number; alias: string; env_var_name: string; project: string }

export default function ApiKeysAdminPage() {
  const [rows, setRows] = useState<RegistryRow[]>([])
  const [active, setActive] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState<Pick[]>([])
  const [distribution, setDistribution] = useState<Record<string, number>>({})
  const [testing, setTesting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setErr(null)
    const r = await fetch('/api/admin/api-keys/rotation-test', { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) setErr(j.error ?? 'load error')
    else {
      setRows(j.rows ?? [])
      setActive(j.active ?? 0)
      setTotal(j.total ?? 0)
    }
    setLoading(false)
  }

  async function runTest() {
    setTesting(true)
    setErr(null)
    const r = await fetch('/api/admin/api-keys/rotation-test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ n: 5 }),
    })
    const j = await r.json()
    if (!r.ok) setErr(j.error ?? 'test error')
    setPicks(j.picks ?? [])
    setDistribution(j.distribution ?? {})
    setTesting(false)
    await refresh()
  }

  useEffect(() => { refresh() }, [])

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>API Keys · Gemini Pool</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Round-robin sur <code>api_keys_registry</code>. 1 compte Gemini free ≈ 1500 RPM.
          Pour scaler : crée un compte via V/R, ajoute la clé en <code>GEMINI_API_KEY_N</code>,
          relance <code>npx tsx scripts/sync-api-keys-registry.ts</code>.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Stat label="Clés Gemini actives" value={`${active}/${total}`} color={active > 0 ? '#4ADE80' : '#F59E0B'} />
        <Stat label="Capacité théorique" value={`${(active * 1500).toLocaleString()} RPM`} color={GOLD} />
        <Stat label="Statut infra" value={active > 0 ? 'Ready' : 'En attente'} color={active > 0 ? '#4ADE80' : '#94A3B8'} />
      </section>

      <section style={{ marginBottom: 24 }}>
        <button
          onClick={runTest}
          disabled={testing || loading}
          style={{
            background: GOLD, color: '#0B0F1A', border: 'none', padding: '10px 18px',
            borderRadius: 8, fontWeight: 700, cursor: testing ? 'wait' : 'pointer',
            opacity: testing ? 0.6 : 1,
          }}
        >
          {testing ? 'Test en cours…' : 'Test rotation (5 tirages)'}
        </button>
        {err && <div style={{ color: '#F87171', marginTop: 12 }}>{err}</div>}
      </section>

      {picks.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, color: GOLD, marginBottom: 8 }}>Résultat du test</h2>
          <ol style={{ paddingLeft: 20, color: '#CBD5E1' }}>
            {picks.map(p => (
              <li key={p.step}>
                Tirage {p.step} → <strong style={{ color: '#E8EEF7' }}>{p.alias}</strong>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 12, color: '#94A3B8' }}>
            <strong>Distribution :</strong>{' '}
            {Object.entries(distribution).map(([a, n]) => `${a} ×${n}`).join(' · ')}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 18, color: GOLD, marginBottom: 8 }}>Registre (provider=gemini)</h2>
        {loading ? (
          <div style={{ color: '#94A3B8' }}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: '#94A3B8' }}>
            Aucune ligne. Lance <code>npx tsx scripts/sync-api-keys-registry.ts</code> après avoir
            ajouté au moins une <code>GEMINI_API_KEY</code> dans un <code>.env.local</code>.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ color: '#94A3B8', textAlign: 'left' }}>
                <th style={th}>Project</th>
                <th style={th}>Env var</th>
                <th style={th}>Status</th>
                <th style={th}>Last used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #1E293B' }}>
                  <td style={td}>{r.project}</td>
                  <td style={td}><code>{r.env_var_name}</code></td>
                  <td style={{ ...td, color: r.status === 'active' ? '#4ADE80' : '#F59E0B' }}>{r.status}</td>
                  <td style={{ ...td, color: '#94A3B8' }}>
                    {r.last_used_at ? new Date(r.last_used_at).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 600 }
const td: React.CSSProperties = { padding: '8px 6px' }

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 10, padding: 16 }}>
      <div style={{ color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color, fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  )
}
