'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type DemoRequest = {
  id: string
  email: string
  full_name: string
  company: string | null
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  parcours: string[] | null
  created_at: string
  reviewed_at: string | null
}

type TourStep = {
  id: string
  parcours: string
  step_order: number
  title_fr: string
  title_en: string
  body_fr: string
  body_en: string
  target_url: string
  target_id: string | null
  position: string
  published: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PARCOURS_OPTIONS = [
  { key: 'entrepreneur', label: 'Entrepreneur', icon: '🧭', color: '#C9A84C' },
  { key: 'influenceur',  label: 'Influenceur',  icon: '🎤', color: '#A78BFA' },
  { key: 'financeur',    label: 'Financeur',    icon: '🏦', color: '#34D399' },
  { key: 'investisseur', label: 'Investisseur', icon: '📈', color: '#60A5FA' },
]

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,.15)',  text: '#F59E0B', label: 'En attente' },
  approved: { bg: 'rgba(16,185,129,.15)',  text: '#10B981', label: 'Approuvé' },
  rejected: { bg: 'rgba(239,68,68,.15)',   text: '#EF4444', label: 'Refusé' },
}

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const
type Filter = typeof FILTERS[number]

// ── Shared style helpers ──────────────────────────────────────────────────────

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100%',
    background: '#040D1C',
    color: '#E8E0D0',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    background: '#071425',
    borderBottom: '1px solid rgba(201,168,76,.15)',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  } as React.CSSProperties,
  title: {
    fontSize: '.7rem',
    letterSpacing: '.16em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
    fontWeight: 600,
  },
  body: {
    flex: 1,
    padding: '20px 24px',
    overflow: 'auto',
  } as React.CSSProperties,
  card: {
    background: '#0A1A2E',
    border: '1px solid rgba(255,255,255,.06)',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 10,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '7px 10px',
    background: '#071425',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 6,
    color: '#E8E0D0',
    fontSize: '.75rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '7px 10px',
    background: '#071425',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 6,
    color: '#E8E0D0',
    fontSize: '.75rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  label: {
    display: 'block',
    fontSize: '.6rem',
    color: '#5A6A7A',
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
    marginBottom: 4,
  },
  btn: (bg: string, text: string, border: string) => ({
    padding: '7px 16px',
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 6,
    color: text,
    fontSize: '.68rem',
    fontWeight: 600,
    letterSpacing: '.04em',
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    transition: 'opacity .15s',
  } as React.CSSProperties),
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: '.58rem',
    fontWeight: 700,
    background: STATUS_META[color]?.bg ?? 'rgba(90,106,122,.15)',
    color: STATUS_META[color]?.text ?? '#9BA8B8',
  } as React.CSSProperties),
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    background: 'rgba(0,0,0,.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    background: '#071425',
    border: '1px solid rgba(201,168,76,.2)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  } as React.CSSProperties,
  modalWide: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    background: '#071425',
    border: '1px solid rgba(201,168,76,.2)',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  } as React.CSSProperties,
  toast: (ok: boolean) => ({
    position: 'fixed' as const,
    top: 16,
    right: 24,
    zIndex: 100,
    background: ok ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
    border: `1px solid ${ok ? 'rgba(16,185,129,.35)' : 'rgba(239,68,68,.35)'}`,
    color: ok ? '#10B981' : '#EF4444',
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: '.72rem',
    fontWeight: 600,
    boxShadow: '0 4px 24px rgba(0,0,0,.4)',
  }),
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return <div style={S.toast(ok)}>{msg}</div>
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function DemoParcoursPage() {
  const [tab, setTab] = useState<'demandes' | 'parcours'>('demandes')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => setToast({ msg, ok })

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px',
    borderRadius: 6,
    border: active ? '1px solid rgba(201,168,76,.35)' : '1px solid transparent',
    background: active ? 'rgba(201,168,76,.1)' : 'transparent',
    color: active ? '#C9A84C' : '#5A6A7A',
    fontSize: '.72rem',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    letterSpacing: '.04em',
    transition: 'all .15s',
  } as React.CSSProperties)

  return (
    <div style={S.page}>
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}

      {/* Tabs */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', gap: 6 }}>
        <button style={tabStyle(tab === 'demandes')} onClick={() => setTab('demandes')}>
          Demandes
        </button>
        <button style={tabStyle(tab === 'parcours')} onClick={() => setTab('parcours')}>
          Parcours
        </button>
      </div>

      {/* Content */}
      <div style={S.body}>
        {tab === 'demandes'
          ? <DemandesTab showToast={showToast} />
          : <ParcoursTab showToast={showToast} />
        }
      </div>
    </div>
  )
}

// ── Tab 1: Demandes ───────────────────────────────────────────────────────────

function DemandesTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [requests, setRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<DemoRequest | null>(null)
  const [modalParcours, setModalParcours] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const url = filter === 'all'
        ? '/api/admin/demo-parcours'
        : `/api/admin/demo-parcours?status=${filter}`
      const res = await fetch(url)
      const j = await res.json()
      setRequests(j.requests ?? [])
    } catch {
      showToast('Erreur de chargement.', false)
    } finally {
      setLoading(false)
    }
  }, [filter, showToast])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  function openDetail(req: DemoRequest) {
    setSelected(req)
    setModalParcours(req.parcours ?? [])
  }

  function toggleParcours(key: string) {
    setModalParcours(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function updateRequest(status: string, parcours?: string[]) {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/demo-parcours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, status, parcours: parcours ?? modalParcours }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      const label = status === 'approved' ? 'approuvée' : status === 'rejected' ? 'refusée' : 'mise à jour'
      showToast(`Demande ${label}.`)
      setSelected(null)
      fetchRequests()
    } catch (err) {
      showToast((err as Error).message, false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteRequest(id: string) {
    if (!confirm('Supprimer cette demande ?')) return
    try {
      const res = await fetch(`/api/admin/demo-parcours?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      showToast('Demande supprimée.')
      setSelected(null)
      fetchRequests()
    } catch {
      showToast('Erreur de suppression.', false)
    }
  }

  const filterBtnStyle = (active: boolean) => ({
    padding: '5px 14px',
    borderRadius: 5,
    border: active ? '1px solid rgba(201,168,76,.3)' : '1px solid transparent',
    background: active ? 'rgba(201,168,76,.08)' : 'transparent',
    color: active ? '#C9A84C' : '#5A6A7A',
    fontSize: '.62rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all .15s',
  } as React.CSSProperties)

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f} style={filterBtnStyle(filter === f)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Toutes' : STATUS_META[f].label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: '#5A6A7A', fontSize: '.72rem', padding: '20px 0' }}>Chargement...</div>
      )}

      {!loading && requests.length === 0 && (
        <div style={{ color: '#5A6A7A', fontSize: '.72rem', padding: '40px 0', textAlign: 'center' }}>
          Aucune demande.
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div style={{ background: '#0A1A2E', border: '1px solid rgba(201,168,76,.12)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                {['Email', 'Nom', 'Entreprise', 'Date', 'Statut', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: '#5A6A7A', fontSize: '.58rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const s = STATUS_META[req.status] ?? STATUS_META.pending
                return (
                  <tr
                    key={req.id}
                    onClick={() => openDetail(req)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,.03)', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', color: '#E8E0D0', fontFamily: 'monospace', fontSize: '.68rem' }}>{req.email}</td>
                    <td style={{ padding: '10px 14px', color: '#9BA8B8' }}>{req.full_name}</td>
                    <td style={{ padding: '10px 14px', color: '#5A6A7A' }}>{req.company ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#5A6A7A', fontSize: '.62rem' }}>
                      {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: '.58rem', fontWeight: 700, background: s.bg, color: s.text }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); deleteRequest(req.id) }}
                        style={{ background: 'none', border: 'none', color: '#5A6A7A', cursor: 'pointer', fontSize: '.8rem', padding: 2 }}
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail panel / modal ── */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 22px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#E8E0D0', marginBottom: 3 }}>
                    {selected.full_name}
                  </div>
                  <div style={{ fontSize: '.65rem', color: '#5A6A7A', fontFamily: 'monospace' }}>{selected.email}</div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', color: '#5A6A7A', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {/* Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, padding: '12px 14px', background: 'rgba(255,255,255,.02)', borderRadius: 6 }}>
                <div>
                  <div style={S.label as React.CSSProperties}>Entreprise</div>
                  <div style={{ fontSize: '.72rem', color: '#9BA8B8' }}>{selected.company ?? '—'}</div>
                </div>
                <div>
                  <div style={S.label as React.CSSProperties}>Statut</div>
                  <span style={S.badge(selected.status)}>{STATUS_META[selected.status]?.label ?? selected.status}</span>
                </div>
                <div>
                  <div style={S.label as React.CSSProperties}>Soumis le</div>
                  <div style={{ fontSize: '.72rem', color: '#9BA8B8' }}>
                    {new Date(selected.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                {selected.reviewed_at && (
                  <div>
                    <div style={S.label as React.CSSProperties}>Revu le</div>
                    <div style={{ fontSize: '.72rem', color: '#9BA8B8' }}>
                      {new Date(selected.reviewed_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                )}
              </div>

              {selected.message && (
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 6, fontSize: '.72rem', color: '#9BA8B8', marginBottom: 16, lineHeight: 1.5 }}>
                  {selected.message}
                </div>
              )}

              {/* Parcours checkboxes */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ ...S.label as React.CSSProperties, marginBottom: 10 }}>Parcours à activer</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {PARCOURS_OPTIONS.map(p => {
                    const checked = modalParcours.includes(p.key)
                    return (
                      <button
                        key={p.key}
                        onClick={() => toggleParcours(p.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${checked ? p.color + '50' : 'rgba(255,255,255,.06)'}`,
                          background: checked ? `${p.color}12` : 'rgba(255,255,255,.02)',
                          color: checked ? p.color : '#5A6A7A',
                          fontSize: '.72rem',
                          fontWeight: checked ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          transition: 'all .15s',
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                        <span style={{ flex: 1 }}>{p.label}</span>
                        {checked && <span style={{ color: p.color, fontSize: '.7rem' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={saving}
                  onClick={() => updateRequest('approved')}
                  style={{ ...S.btn('rgba(16,185,129,.15)', '#10B981', 'rgba(16,185,129,.35)'), flex: 1, opacity: saving ? .5 : 1 }}
                >
                  {saving ? '...' : 'Valider'}
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateRequest('rejected', [])}
                  style={{ ...S.btn('rgba(239,68,68,.15)', '#EF4444', 'rgba(239,68,68,.35)'), flex: 1, opacity: saving ? .5 : 1 }}
                >
                  Refuser
                </button>
                <button
                  disabled={saving}
                  onClick={() => updateRequest('approved', [])}
                  style={{ ...S.btn('rgba(90,106,122,.15)', '#9BA8B8', 'rgba(90,106,122,.3)'), opacity: saving ? .5 : 1 }}
                >
                  Désactiver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tab 2: Parcours (Tour steps) ──────────────────────────────────────────────

function ParcoursTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [selectedParcours, setSelectedParcours] = useState('entrepreneur')
  const [steps, setSteps] = useState<TourStep[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStep, setEditingStep] = useState<TourStep | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchSteps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/demo-parcours/steps?parcours=${selectedParcours}`)
      const j = await res.json()
      setSteps(j.steps ?? [])
    } catch {
      showToast('Erreur de chargement des étapes.', false)
    } finally {
      setLoading(false)
    }
  }, [selectedParcours, showToast])

  useEffect(() => { fetchSteps() }, [fetchSteps])

  function newStep() {
    const maxOrder = steps.reduce((m, s) => Math.max(m, s.step_order), 0)
    setEditingStep({
      id: '',
      parcours: selectedParcours,
      step_order: maxOrder + 1,
      title_fr: '',
      title_en: '',
      body_fr: '',
      body_en: '',
      target_url: '',
      target_id: null,
      position: 'bottom',
      published: true,
    })
  }

  async function saveStep() {
    if (!editingStep) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { ...editingStep }
      if (!editingStep.id) delete body.id
      const res = await fetch('/api/admin/demo-parcours/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      showToast('Étape sauvegardée.')
      setEditingStep(null)
      fetchSteps()
    } catch (err) {
      showToast((err as Error).message, false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteStep(id: string) {
    if (!confirm('Supprimer cette étape ?')) return
    try {
      const res = await fetch(`/api/admin/demo-parcours/steps?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      showToast('Étape supprimée.')
      fetchSteps()
    } catch {
      showToast('Erreur de suppression.', false)
    }
  }

  const meta = PARCOURS_OPTIONS.find(p => p.key === selectedParcours)!

  const parcoursTabStyle = (active: boolean, color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 7,
    border: `1px solid ${active ? color + '50' : 'rgba(255,255,255,.06)'}`,
    background: active ? `${color}12` : 'rgba(255,255,255,.02)',
    color: active ? color : '#5A6A7A',
    fontSize: '.68rem',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all .15s',
  } as React.CSSProperties)

  const fieldStyle: React.CSSProperties = {
    ...S.input,
    marginBottom: 0,
  }

  const textareaStyle: React.CSSProperties = {
    ...S.textarea,
    marginBottom: 0,
  }

  return (
    <>
      {/* Parcours selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {PARCOURS_OPTIONS.map(p => (
          <button
            key={p.key}
            style={parcoursTabStyle(selectedParcours === p.key, p.color)}
            onClick={() => { setSelectedParcours(p.key); setEditingStep(null) }}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: '.7rem', color: '#5A6A7A' }}>
          {steps.length} étape{steps.length !== 1 ? 's' : ''} —{' '}
          <span style={{ color: meta.color }}>Parcours {meta.label}</span>
        </div>
        <button
          onClick={newStep}
          style={S.btn('rgba(201,168,76,.12)', '#C9A84C', 'rgba(201,168,76,.35)')}
        >
          + Nouvelle étape
        </button>
      </div>

      {/* Step list */}
      {loading && (
        <div style={{ color: '#5A6A7A', fontSize: '.72rem', padding: '20px 0' }}>Chargement...</div>
      )}

      {!loading && steps.length === 0 && !editingStep && (
        <div style={{ color: '#5A6A7A', fontSize: '.72rem', padding: '40px 0', textAlign: 'center' }}>
          Aucune étape pour ce parcours.
        </div>
      )}

      {!loading && steps.map(step => (
        <div key={step.id} style={S.card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 6, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${meta.color}20`, color: meta.color,
              fontSize: '.72rem', fontWeight: 700,
            }}>
              {step.step_order}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#E8E0D0', marginBottom: 2 }}>
                {step.title_fr || '(sans titre)'}
                {!step.published && (
                  <span style={{ marginLeft: 8, fontSize: '.58rem', color: '#5A6A7A', background: 'rgba(255,255,255,.05)', padding: '1px 6px', borderRadius: 3 }}>
                    brouillon
                  </span>
                )}
              </div>
              <div style={{ fontSize: '.65rem', color: '#5A6A7A', fontFamily: 'monospace' }}>{step.target_url}</div>
              {step.target_id && (
                <div style={{ fontSize: '.6rem', color: '#3A4A5A', fontFamily: 'monospace', marginTop: 1 }}>#{step.target_id}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => setEditingStep({ ...step })}
                style={S.btn('rgba(255,255,255,.04)', '#9BA8B8', 'rgba(255,255,255,.08)')}
              >
                Modifier
              </button>
              <button
                onClick={() => deleteStep(step.id)}
                style={S.btn('rgba(239,68,68,.08)', '#EF4444', 'rgba(239,68,68,.2)')}
              >
                Suppr
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ── Edit / Create step modal ── */}
      {editingStep && (
        <div style={S.overlay} onClick={() => setEditingStep(null)}>
          <div style={S.modalWide} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '22px 24px' }}>
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#E8E0D0' }}>
                  {editingStep.id ? "Modifier l'étape" : 'Nouvelle étape'}
                </div>
                <button
                  onClick={() => setEditingStep(null)}
                  style={{ background: 'none', border: 'none', color: '#5A6A7A', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Order + Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label as React.CSSProperties}>Ordre</label>
                  <input
                    type="number"
                    value={editingStep.step_order}
                    onChange={e => setEditingStep({ ...editingStep, step_order: parseInt(e.target.value) || 0 })}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={S.label as React.CSSProperties}>Position</label>
                  <select
                    value={editingStep.position}
                    onChange={e => setEditingStep({ ...editingStep, position: e.target.value })}
                    style={{ ...fieldStyle, cursor: 'pointer' }}
                  >
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              {/* Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label as React.CSSProperties}>Titre (FR) *</label>
                  <input
                    type="text"
                    value={editingStep.title_fr}
                    onChange={e => setEditingStep({ ...editingStep, title_fr: e.target.value })}
                    style={fieldStyle}
                    placeholder="Bienvenue sur la carte"
                  />
                </div>
                <div>
                  <label style={S.label as React.CSSProperties}>Titre (EN)</label>
                  <input
                    type="text"
                    value={editingStep.title_en}
                    onChange={e => setEditingStep({ ...editingStep, title_en: e.target.value })}
                    style={fieldStyle}
                    placeholder="Welcome to the map"
                  />
                </div>
              </div>

              {/* Bodies */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label as React.CSSProperties}>Corps (FR)</label>
                  <textarea
                    value={editingStep.body_fr}
                    onChange={e => setEditingStep({ ...editingStep, body_fr: e.target.value })}
                    rows={3}
                    style={textareaStyle}
                  />
                </div>
                <div>
                  <label style={S.label as React.CSSProperties}>Corps (EN)</label>
                  <textarea
                    value={editingStep.body_en}
                    onChange={e => setEditingStep({ ...editingStep, body_en: e.target.value })}
                    rows={3}
                    style={textareaStyle}
                  />
                </div>
              </div>

              {/* URLs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label as React.CSSProperties}>URL cible *</label>
                  <input
                    type="text"
                    value={editingStep.target_url}
                    onChange={e => setEditingStep({ ...editingStep, target_url: e.target.value })}
                    style={{ ...fieldStyle, fontFamily: 'monospace' }}
                    placeholder="/map"
                  />
                </div>
                <div>
                  <label style={S.label as React.CSSProperties}>ID élément cible</label>
                  <input
                    type="text"
                    value={editingStep.target_id ?? ''}
                    onChange={e => setEditingStep({ ...editingStep, target_id: e.target.value || null })}
                    style={{ ...fieldStyle, fontFamily: 'monospace' }}
                    placeholder="ftg-country-panel"
                  />
                </div>
              </div>

              {/* Published toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingStep.published}
                    onChange={e => setEditingStep({ ...editingStep, published: e.target.checked })}
                    style={{ accentColor: '#C9A84C', width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: '.72rem', color: '#9BA8B8' }}>Publié</span>
                </label>
              </div>

              {/* Save / Cancel */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setEditingStep(null)}
                  style={S.btn('transparent', '#5A6A7A', 'rgba(255,255,255,.08)')}
                >
                  Annuler
                </button>
                <button
                  onClick={saveStep}
                  disabled={saving || !editingStep.title_fr || !editingStep.target_url}
                  style={{
                    ...S.btn('#C9A84C', '#040D1C', '#C9A84C'),
                    opacity: (saving || !editingStep.title_fr || !editingStep.target_url) ? .5 : 1,
                    cursor: (saving || !editingStep.title_fr || !editingStep.target_url) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
