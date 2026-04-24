'use client'
import { useMemo, useState, useTransition } from 'react'

const GOLD = '#C9A84C'
const BG = '#07090F'
const CARD = '#0F172A'
const BORDER = 'rgba(201,168,76,.2)'
const MUTED = '#94A3B8'

export type Task = {
  id: string
  project: string
  category: string
  owner: string
  priority: string
  status: string
  title: string
  description: string | null
  url: string | null
  platform: string | null
  blocked_by: string | null
  due_date: string | null
  tags: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

const PROJECTS = ['all', 'ftg', 'ofa', 'cc', 'estate', 'shift', 'optimus', 'hisoka', 'aam', 'general'] as const
const OWNERS   = ['all', 'user', 'claude', 'shared'] as const
const CATEGORIES = ['all', 'test', 'dev', 'ops', 'legal', 'content', 'marketing', 'design', 'infra'] as const
const STATUSES = ['all', 'pending', 'in_progress', 'done', 'blocked'] as const
const PRIORITIES = ['all', 'critical', 'high', 'medium', 'low'] as const

const PRIO_COLOR: Record<string, string> = {
  critical: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', in_progress: '#3B82F6', done: '#10B981', blocked: '#EF4444',
}
const OWNER_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  user:   { label: '👤 Moi',    color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  claude: { label: '🤖 Claude', color: GOLD,       bg: 'rgba(201,168,76,0.1)' },
  shared: { label: '🤝 Shared', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
}
const PROJECT_LABEL: Record<string, string> = {
  ftg: 'FTG', ofa: 'OFA', cc: 'CC', estate: 'Estate', shift: 'Shift',
  optimus: 'Optimus', hisoka: 'Hisoka', aam: 'AAM', general: 'Général',
}

export default function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [project, setProject] = useState<string>('all')
  const [owner, setOwner] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [priority, setPriority] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [hideDone, setHideDone] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, startSaving] = useTransition()

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (hideDone && t.status === 'done') return false
      if (project !== 'all' && t.project !== project) return false
      if (owner !== 'all' && t.owner !== owner) return false
      if (category !== 'all' && t.category !== category) return false
      if (status !== 'all' && t.status !== status) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !(t.description ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [tasks, project, owner, category, status, priority, search, hideDone])

  const counts = useMemo(() => {
    const c = { total: tasks.length, pending: 0, in_progress: 0, done: 0, blocked: 0, critical_open: 0 }
    for (const t of tasks) {
      if (t.status in c) (c as Record<string, number>)[t.status]++
      if (t.priority === 'critical' && t.status !== 'done') c.critical_open++
    }
    return c
  }, [tasks])

  async function updateStatus(id: string, newStatus: Task['status']) {
    startSaving(async () => {
      const res = await fetch('/api/admin/tasks', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t.id === id
          ? { ...t, status: newStatus, updated_at: new Date().toISOString(), completed_at: newStatus === 'done' ? new Date().toISOString() : null }
          : t))
      }
    })
  }

  async function addTask(form: Record<string, string>) {
    const res = await fetch('/api/admin/tasks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (res.ok && json.task) {
      setTasks((prev) => [json.task as Task, ...prev])
      setAddOpen(false)
    }
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#E2E8F0', padding: '1.5rem 2rem', fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, display: 'flex', alignItems: 'end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, color: GOLD, margin: 0 }}>📋 Tasks &amp; Tests</h1>
            <p style={{ color: MUTED, fontSize: 13, margin: '4px 0 0' }}>
              Checklist unifiée multi-projets · tests à exécuter + work à faire pour toi et Claude
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            style={{ padding: '0.5rem 1rem', background: GOLD, color: BG, border: 0, borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
          >
            + Ajouter
          </button>
        </header>

        {/* Counts */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <Counter label="Total"       value={counts.total} color="#fff" />
          <Counter label="Pending"     value={counts.pending} color={STATUS_COLOR.pending} />
          <Counter label="In progress" value={counts.in_progress} color={STATUS_COLOR.in_progress} />
          <Counter label="Done"        value={counts.done} color={STATUS_COLOR.done} />
          <Counter label="Blocked"     value={counts.blocked} color={STATUS_COLOR.blocked} />
          <Counter label="Critical ⚠️" value={counts.critical_open} color={PRIO_COLOR.critical} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, fontSize: 12, alignItems: 'center' }}>
          <FilterSelect label="Projet"   value={project}  options={PROJECTS}  onChange={setProject} labelMap={{ all: 'Tous', ...PROJECT_LABEL }} />
          <FilterSelect label="Owner"    value={owner}    options={OWNERS}    onChange={setOwner}   labelMap={{ all: 'Tous', user: '👤 Moi', claude: '🤖 Claude', shared: '🤝 Shared' }} />
          <FilterSelect label="Type"     value={category} options={CATEGORIES} onChange={setCategory} labelMap={{ all: 'Tous' }} />
          <FilterSelect label="Statut"   value={status}   options={STATUSES}  onChange={setStatus}  labelMap={{ all: 'Tous' }} />
          <FilterSelect label="Priorité" value={priority} options={PRIORITIES} onChange={setPriority} labelMap={{ all: 'Toutes' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Recherche titre/desc"
            style={{ padding: '0.4rem 0.7rem', background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, color: '#E2E8F0', fontSize: 12, minWidth: 200 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Masquer done
          </label>
          <span style={{ marginLeft: 'auto', color: MUTED }}>{filtered.length}/{tasks.length}</span>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: MUTED, background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              Aucune tâche · change les filtres ou ajoute une nouvelle.
            </div>
          )}
          {filtered.map((t) => {
            const ownerBadge = OWNER_BADGE[t.owner] ?? { label: t.owner, color: MUTED, bg: 'rgba(255,255,255,0.05)' }
            return (
              <div key={t.id} style={{
                background: t.status === 'done' ? 'rgba(16,185,129,0.04)' : CARD,
                border: `1px solid ${t.status === 'done' ? 'rgba(16,185,129,0.3)' : BORDER}`,
                borderLeft: `3px solid ${PRIO_COLOR[t.priority] ?? MUTED}`,
                padding: '0.75rem 1rem', borderRadius: 8,
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'start',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: '#cbd5e1' }}>
                      {PROJECT_LABEL[t.project] ?? t.project}
                    </span>
                    <span style={{ fontSize: 10, padding: '1px 6px', background: ownerBadge.bg, color: ownerBadge.color, borderRadius: 4 }}>
                      {ownerBadge.label}
                    </span>
                    <span style={{ fontSize: 10, color: MUTED }}>· {t.category}</span>
                    {t.platform && t.platform !== 'n/a' && <span style={{ fontSize: 10, color: MUTED }}>· {t.platform}</span>}
                    {t.due_date && <span style={{ fontSize: 10, color: '#F59E0B' }}>📅 {t.due_date}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, textDecoration: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? 0.6 : 1 }}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4, whiteSpace: 'pre-wrap' }}>{t.description}</div>
                  )}
                  {t.blocked_by && (
                    <div style={{ fontSize: 11, color: STATUS_COLOR.blocked, marginTop: 4 }}>🚧 Bloqué par : {t.blocked_by}</div>
                  )}
                  {t.url && (
                    <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#60A5FA', marginTop: 4, display: 'inline-block' }}>
                      {t.url} ↗
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
                  <select
                    value={t.status}
                    disabled={saving}
                    onChange={(e) => updateStatus(t.id, e.target.value as Task['status'])}
                    style={{ padding: '0.35rem 0.5rem', background: BG, border: `1px solid ${STATUS_COLOR[t.status] ?? BORDER}`, color: STATUS_COLOR[t.status] ?? '#E2E8F0', borderRadius: 5, fontSize: 11, fontWeight: 600 }}
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="in_progress">🔄 In progress</option>
                    <option value="done">✅ Done</option>
                    <option value="blocked">🚧 Blocked</option>
                  </select>
                  <span style={{ fontSize: 9, color: MUTED, textAlign: 'right' }}>
                    {new Date(t.updated_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {addOpen && <AddModal onClose={() => setAddOpen(false)} onSubmit={addTask} />}
    </div>
  )
}

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, padding: '0.4rem 0.75rem', borderRadius: 6 }}>
      <span style={{ color: MUTED, fontSize: 10 }}>{label}</span>{' '}
      <b style={{ color }}>{value}</b>
    </div>
  )
}

function FilterSelect<T extends readonly string[]>({ label, value, options, onChange, labelMap = {} }: {
  label: string
  value: string
  options: T
  onChange: (v: string) => void
  labelMap?: Record<string, string>
}) {
  return (
    <label style={{ display: 'flex', gap: 4, alignItems: 'center', color: MUTED }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '0.3rem 0.5rem', background: BG, border: `1px solid ${BORDER}`, color: '#E2E8F0', borderRadius: 5, fontSize: 11 }}
      >
        {options.map((opt) => <option key={opt} value={opt}>{labelMap[opt] ?? opt}</option>)}
      </select>
    </label>
  )
}

function AddModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (f: Record<string, string>) => void }) {
  const [form, setForm] = useState({
    project: 'ftg', category: 'test', owner: 'user', priority: 'medium',
    title: '', description: '', url: '', platform: 'n/a',
  })
  const canSubmit = form.title.trim().length > 0
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '1.5rem', width: 560, maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <h2 style={{ color: GOLD, fontSize: 18, margin: 0 }}>Ajouter une tâche</h2>
        <input
          placeholder="Titre (obligatoire)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={{ padding: '0.5rem 0.7rem', background: BG, border: `1px solid ${BORDER}`, color: '#E2E8F0', borderRadius: 5 }}
        />
        <textarea
          placeholder="Description (optionnelle)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          style={{ padding: '0.5rem 0.7rem', background: BG, border: `1px solid ${BORDER}`, color: '#E2E8F0', borderRadius: 5, resize: 'vertical' }}
        />
        <input
          placeholder="URL à tester ou lien (optionnel)"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          style={{ padding: '0.5rem 0.7rem', background: BG, border: `1px solid ${BORDER}`, color: '#E2E8F0', borderRadius: 5 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            ['project', PROJECTS.filter((p) => p !== 'all')],
            ['category', CATEGORIES.filter((c) => c !== 'all')],
            ['owner', OWNERS.filter((o) => o !== 'all')],
            ['priority', PRIORITIES.filter((p) => p !== 'all')],
          ] as const).map(([key, opts]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: MUTED }}>
              {key}
              <select
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={{ padding: '0.4rem 0.6rem', background: BG, border: `1px solid ${BORDER}`, color: '#E2E8F0', borderRadius: 5 }}
              >
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: `1px solid ${BORDER}`, color: '#E2E8F0', borderRadius: 5, cursor: 'pointer' }}>
            Annuler
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onSubmit(form)}
            style={{ padding: '0.5rem 1rem', background: canSubmit ? GOLD : '#555', color: BG, border: 0, borderRadius: 5, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  )
}
