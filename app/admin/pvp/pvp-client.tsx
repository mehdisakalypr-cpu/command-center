'use client'

import { useEffect, useMemo, useState } from 'react'

type Item = {
  id: string
  project: string
  domain: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  verification: 'manual' | 'upload' | 'test'
  test_id: string | null
  document_url: string | null
  document_name: string | null
  notes: string | null
  order_index: number
  verified_at: string | null
  last_test_result: { ok: boolean; details: string; at?: string } | null
}

const GOLD = '#C9A84C'
const PROJECT_LABELS: Record<string, string> = {
  global: 'Global (toutes sociétés)', ofa: 'One For All', ftg: 'Feel The Gap',
  cc: 'Command Center', shift: 'Shift Dynamics', estate: 'The Estate',
}
const DOMAIN_ICONS: Record<string, string> = {
  Legal: '⚖️', Finance: '💰', Payments: '💳', Compliance: '🛡️',
  Infra: '🏗️', Auth: '🔐', Ops: '🚀',
}
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  todo:        { bg: '#2A2F3B', color: '#94A3B8', label: 'À faire' },
  in_progress: { bg: '#1E3A5F', color: '#60A5FA', label: 'En cours' },
  blocked:     { bg: '#3F1D1D', color: '#F87171', label: 'Bloqué' },
  done:        { bg: '#1E3F2E', color: '#4ADE80', label: 'Validé' },
}

export default function PvpClient() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'blocked' | 'done'>('all')
  const [error, setError] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/pvp', { credentials: 'include' })
      if (!res.ok) {
        setError(`Impossible de charger (HTTP ${res.status}). Applique d'abord la migration 20260412140000.`)
        setItems([])
        return
      }
      const data = await res.json()
      setItems(data.items ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function patch(id: string, body: Partial<Item>) {
    const res = await fetch('/api/admin/pvp', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setItems(cur => cur.map(i => i.id === id ? item : i))
    }
  }

  async function runTest(id: string, testId: string) {
    await patch(id, { status: 'in_progress' as const })
    const res = await fetch('/api/admin/pvp/test', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, testId }),
    })
    const { result } = await res.json()
    await load()
    alert(`${result.ok ? '✅' : '❌'} ${result.details}`)
  }

  async function upload(id: string, file: File) {
    const form = new FormData()
    form.append('file', file)
    form.append('itemId', id)
    const res = await fetch('/api/admin/pvp/upload', {
      method: 'POST', credentials: 'include', body: form,
    })
    if (res.ok) await load()
    else { const e = await res.json(); alert('Upload échoué: ' + e.error) }
  }

  const grouped = useMemo(() => {
    const byProject: Record<string, Record<string, Item[]>> = {}
    const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)
    for (const it of filtered) {
      (byProject[it.project] ??= {})
      ;(byProject[it.project][it.domain] ??= []).push(it)
    }
    return byProject
  }, [items, filter])

  const counts = useMemo(() => {
    const c = { total: items.length, todo: 0, in_progress: 0, blocked: 0, done: 0 }
    for (const i of items) c[i.status]++
    return c
  }, [items])

  const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0

  return (
    <div style={{ color: '#E8EEF7', padding: '24px 32px', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: GOLD }}>Pre-prod vs Prod</h1>
        <p style={{ color: '#94A3B8', margin: '6px 0 0' }}>
          Checklist go-live classée par domaine. {counts.done}/{counts.total} validés ({progress}%).
        </p>
        <div style={{ height: 8, background: '#1A2332', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${GOLD}, #E8C97A)`, transition: 'width .3s' }} />
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['all','todo','in_progress','blocked','done'] as const).map(k => {
          const label = k === 'all' ? `Tout (${counts.total})` : `${STATUS_STYLES[k].label} (${counts[k]})`
          const active = filter === k
          return (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: `1px solid ${active ? GOLD : 'rgba(201,168,76,.2)'}`,
              background: active ? 'rgba(201,168,76,.15)' : 'transparent',
              color: active ? GOLD : '#CBD5E1', cursor: 'pointer',
            }}>{label}</button>
          )
        })}
      </div>

      {error && (
        <div style={{ padding: 16, background: '#3F1D1D', border: '1px solid #F8717130', borderRadius: 12, color: '#F87171', marginBottom: 20 }}>
          {error}
        </div>
      )}
      {loading && <div style={{ color: '#94A3B8' }}>Chargement…</div>}

      {Object.entries(grouped).map(([project, domains]) => (
        <section key={project} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: GOLD, marginBottom: 12 }}>
            {PROJECT_LABELS[project] ?? project}
          </h2>
          {Object.entries(domains).map(([domain, its]) => {
            const groupKey = `${project}:${domain}`
            const open = openGroups[groupKey] ?? true
            const doneCount = its.filter(i => i.status === 'done').length
            return (
              <div key={domain} style={{ marginBottom: 10, background: '#071425', border: '1px solid rgba(201,168,76,.15)', borderRadius: 12, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenGroups(s => ({ ...s, [groupKey]: !open }))}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#E8EEF7', fontSize: 14, fontWeight: 600, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{DOMAIN_ICONS[domain] ?? '📌'}</span>
                  <span>{domain}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
                    {doneCount}/{its.length}
                  </span>
                  <span style={{ fontSize: 10, color: '#7D8BA0' }}>{open ? '▾' : '▸'}</span>
                </button>
                {open && its.map(item => <ItemRow key={item.id} item={item} onPatch={patch} onTest={runTest} onUpload={upload} />)}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}

function ItemRow({ item, onPatch, onTest, onUpload }: {
  item: Item
  onPatch: (id: string, b: Partial<Item>) => Promise<void>
  onTest: (id: string, testId: string) => Promise<void>
  onUpload: (id: string, file: File) => Promise<void>
}) {
  const s = STATUS_STYLES[item.status]
  const [testing, setTesting] = useState(false)
  const [uploading, setUploading] = useState(false)

  return (
    <div style={{ borderTop: '1px solid rgba(201,168,76,.08)', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', minWidth: 240 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
          {item.description && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{item.description}</div>}
          {item.document_name && item.document_url && (
            <a href={item.document_url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block', marginTop: 6, fontSize: 11, color: GOLD, textDecoration: 'underline',
            }}>📎 {item.document_name}</a>
          )}
          {item.last_test_result && (
            <div style={{
              marginTop: 6, fontSize: 11, padding: '4px 8px', borderRadius: 6,
              background: item.last_test_result.ok ? '#1E3F2E' : '#3F1D1D',
              color: item.last_test_result.ok ? '#4ADE80' : '#F87171',
              display: 'inline-block',
            }}>
              {item.last_test_result.ok ? '✅' : '❌'} {item.last_test_result.details}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={item.status}
            onChange={e => onPatch(item.id, { status: e.target.value as Item['status'] })}
            style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: s.bg, color: s.color, border: `1px solid ${s.color}40`, cursor: 'pointer',
            }}
          >
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#071425', color: '#E8EEF7' }}>{v.label}</option>
            ))}
          </select>

          {item.verification === 'test' && item.test_id && (
            <button
              disabled={testing}
              onClick={async () => { setTesting(true); await onTest(item.id, item.test_id!); setTesting(false) }}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'transparent', border: `1px solid ${GOLD}80`, color: GOLD, cursor: 'pointer',
              }}
            >
              {testing ? '…' : '🧪 Tester'}
            </button>
          )}

          {item.verification === 'upload' && (
            <label style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: `1px solid ${GOLD}80`, color: GOLD, cursor: 'pointer', background: 'transparent',
            }}>
              {uploading ? '…' : '📎 Upload'}
              <input
                type="file" style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setUploading(true); await onUpload(item.id, f); setUploading(false)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
