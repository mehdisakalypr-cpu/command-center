'use client'
import { useState, useTransition } from 'react'

/**
 * Shared "Actualiser" button — triggers POST /api/admin/refresh-dashboards which
 * recomputes cc_content_jobs counts and bumps last_refreshed_at. Used on
 * /admin/overview, /admin/simulator, /admin/tasks, /admin/content-jobs.
 *
 * Visual: gold pill with spinner + success flash.
 */
export function RefreshDashboardsButton({
  label = '🔄 Actualiser',
  size = 'sm',
  onRefreshed,
}: {
  label?: string
  size?: 'sm' | 'md'
  onRefreshed?: (res: { jobs: Array<{ job_key: string; before: number; after: number }> }) => void
}) {
  const [busy, startBusy] = useTransition()
  const [flash, setFlash] = useState<string | null>(null)

  function click() {
    startBusy(async () => {
      setFlash(null)
      try {
        const res = await fetch('/api/admin/refresh-dashboards', { method: 'POST' })
        const json = await res.json()
        if (res.ok && json.ok) {
          setFlash(`✅ ${(json.jobs ?? []).length} jobs à jour`)
          if (onRefreshed) onRefreshed(json)
          setTimeout(() => setFlash(null), 3500)
        } else {
          setFlash(`❌ ${json.error ?? 'erreur'}`)
          setTimeout(() => setFlash(null), 4000)
        }
      } catch (e: unknown) {
        setFlash(`❌ ${e instanceof Error ? e.message : String(e)}`)
        setTimeout(() => setFlash(null), 4000)
      }
    })
  }

  const padding = size === 'md' ? '0.55rem 1.1rem' : '0.4rem 0.85rem'
  const fontSize = size === 'md' ? 13 : 12

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={click}
        disabled={busy}
        title="Recalcule progression jobs + tasks"
        style={{
          padding,
          background: busy ? '#555' : '#C9A84C',
          color: '#07090F',
          border: 0,
          borderRadius: 6,
          fontWeight: 700,
          fontSize,
          cursor: busy ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {busy ? '⏳ Refresh…' : label}
      </button>
      {flash && (
        <span style={{ fontSize: 11, color: flash.startsWith('✅') ? '#10B981' : '#EF4444' }}>{flash}</span>
      )}
    </span>
  )
}
