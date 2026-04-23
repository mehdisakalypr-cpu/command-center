'use client';

import { useEffect, useState } from 'react';
import { ProgressBar } from './ProgressBar';

type Idea = {
  id: string;
  rank: number | null;
  name: string | null;
  tagline: string | null;
  score: number | null;
  status: 'backlog' | 'ready' | 'in_progress' | 'blocked' | 'shipped';
  progress_pct: number;
  estimate_days_min: number | null;
  estimate_days_max: number | null;
  estimate_confidence: number | null;
  started_at: string | null;
  shipped_at: string | null;
  blocked_reason: string | null;
  worker_id: string | null;
  last_commit_sha: string | null;
  last_commit_at: string | null;
  hours_reuse: number | null;
  days_new_code: number | null;
  critical_path: string | null;
  human_gates: string[] | null;
  reuse_bricks: string[] | null;
  mrr_median: { m36?: number } | null;
  deployed_url: string | null;
};

type BuildEvent = {
  id: string;
  idea_id: string;
  event_type: string;
  progress_pct: number | null;
  message: string | null;
  commit_sha: string | null;
  worker_id: string | null;
  created_at: string;
};

type PowerMode = {
  mode: 'shaka_33' | 'ultra_instinct';
  workers_max: number;
  budget_cap_eur: number;
  daily_spend_cap_eur: number;
  activated_at: string;
  activated_by: string | null;
};

type PortfolioData = {
  ideas: Idea[];
  power_mode: PowerMode | null;
  events: BuildEvent[];
};

const CHECKPOINTS = [
  { pct: 10, label: 'Spec' },
  { pct: 20, label: 'Migration DB' },
  { pct: 35, label: 'API routes' },
  { pct: 55, label: 'UI base' },
  { pct: 70, label: 'Intégrations' },
  { pct: 85, label: 'Smoke tests' },
  { pct: 95, label: 'Deploy preview' },
  { pct: 100, label: 'Shipped' },
];

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  backlog:     { bg: '#374151', fg: '#E5E7EB', label: 'Backlog' },
  ready:       { bg: '#065F46', fg: '#A7F3D0', label: 'Ready' },
  in_progress: { bg: '#1E40AF', fg: '#BFDBFE', label: 'En cours' },
  blocked:     { bg: '#9A3412', fg: '#FED7AA', label: 'Bloqué' },
  shipped:     { bg: '#111827', fg: '#F9FAFB', label: 'Shippé' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function PortfolioView({ initial }: { initial: PortfolioData }) {
  const [data, setData] = useState<PortfolioData>(initial);
  const [tab, setTab] = useState<'pipeline' | 'services'>('pipeline');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch('/api/business-hunter/portfolio', { cache: 'no-store' });
        if (r.ok) setData(await r.json());
      } catch {}
    };
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, []);

  const ideas = [...data.ideas].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const stats = ideas.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const eventsByIdea = data.events.reduce((acc, e) => {
    (acc[e.idea_id] ??= []).push(e);
    return acc;
  }, {} as Record<string, BuildEvent[]>);

  const selected = selectedId ? ideas.find((i) => i.id === selectedId) ?? null : null;
  const selectedEvents = selected ? (eventsByIdea[selected.id] ?? []).slice(0, 20) : [];

  const statsRow = (
    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#9CA3AF' }}>
      <span><strong style={{ color: '#F9FAFB' }}>{stats.shipped ?? 0}</strong> shippés</span>
      <span>·</span>
      <span><strong style={{ color: '#BFDBFE' }}>{stats.in_progress ?? 0}</strong> en cours</span>
      <span>·</span>
      <span><strong style={{ color: '#FED7AA' }}>{stats.blocked ?? 0}</strong> bloqués</span>
      <span>·</span>
      <span><strong style={{ color: '#A7F3D0' }}>{stats.ready ?? 0}</strong> prêts</span>
      <span>·</span>
      <span><strong style={{ color: '#9CA3AF' }}>{stats.backlog ?? 0}</strong> backlog</span>
    </div>
  );

  const servicesIdeas = ideas.filter((i) => i.status === 'in_progress' || i.status === 'shipped');

  return (
    <div style={{ color: '#E6EEF7' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #1F2937' }}>
        <button
          onClick={() => setTab('pipeline')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            color: tab === 'pipeline' ? '#C9A84C' : '#9CA3AF',
            borderBottom: tab === 'pipeline' ? '2px solid #C9A84C' : '2px solid transparent',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Pipeline ({ideas.length})
        </button>
        <button
          onClick={() => setTab('services')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            color: tab === 'services' ? '#C9A84C' : '#9CA3AF',
            borderBottom: tab === 'services' ? '2px solid #C9A84C' : '2px solid transparent',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Services E2E ({servicesIdeas.length})
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '10px 0' }}>{statsRow}</div>
      </div>

      {tab === 'pipeline' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 12,
          }}
        >
          {ideas.map((idea) => {
            const status = STATUS_COLORS[idea.status] ?? STATUS_COLORS.backlog;
            return (
              <div
                key={idea.id}
                onClick={() => setSelectedId(idea.id)}
                style={{
                  padding: 14,
                  background: '#0F1A2E',
                  border: '1px solid #1F2937',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#C9A84C')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1F2937')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>#{idea.rank ?? '?'} · {Number(idea.score ?? 0).toFixed(1)} pts</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', marginTop: 2 }}>{idea.name ?? 'Sans nom'}</div>
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      background: status.bg,
                      color: status.fg,
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: '#9CA3AF', minHeight: 30, marginBottom: 10 }}>
                  {idea.tagline ?? '—'}
                </div>

                <ProgressBar pct={idea.progress_pct ?? 0} status={idea.status} />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
                  <span>
                    {idea.estimate_days_min !== null && idea.estimate_days_max !== null
                      ? `${idea.estimate_days_min}–${idea.estimate_days_max}j · ${idea.estimate_confidence ?? 0}% conf`
                      : 'estimation —'}
                  </span>
                  {idea.last_commit_at && (
                    <span>commit {timeAgo(idea.last_commit_at)}</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                  {(idea.human_gates ?? []).map((g) => (
                    <span key={g} style={{ fontSize: 10, padding: '2px 6px', background: '#7F1D1D', color: '#FECACA', borderRadius: 4 }}>
                      🚧 {g}
                    </span>
                  ))}
                  {(idea.reuse_bricks ?? []).slice(0, 4).map((b) => (
                    <span key={b} style={{ fontSize: 10, padding: '2px 6px', background: '#1F2937', color: '#9CA3AF', borderRadius: 4 }}>
                      {b}
                    </span>
                  ))}
                  {(idea.reuse_bricks ?? []).length > 4 && (
                    <span style={{ fontSize: 10, padding: '2px 6px', background: '#1F2937', color: '#9CA3AF', borderRadius: 4 }}>
                      +{(idea.reuse_bricks ?? []).length - 4}
                    </span>
                  )}
                </div>

                {idea.blocked_reason && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#FED7AA', fontStyle: 'italic' }}>
                    {idea.blocked_reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {servicesIdeas.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
              Aucun service en cours. Bascule en Ultra Instinct ON pour démarrer les idées ready-now.
            </div>
          )}
          {servicesIdeas.map((idea) => {
            const events = (eventsByIdea[idea.id] ?? []).slice(0, 10);
            const status = STATUS_COLORS[idea.status] ?? STATUS_COLORS.backlog;
            return (
              <div
                key={idea.id}
                style={{
                  padding: 16,
                  background: '#0F1A2E',
                  border: '1px solid #1F2937',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>#{idea.rank ?? '?'}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>{idea.name}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{idea.tagline}</div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      background: status.bg,
                      color: status.fg,
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <ProgressBar pct={idea.progress_pct ?? 0} status={idea.status} />
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {CHECKPOINTS.map((cp) => {
                    const hit = (idea.progress_pct ?? 0) >= cp.pct;
                    return (
                      <div
                        key={cp.pct}
                        style={{
                          flex: 1,
                          minWidth: 80,
                          padding: '6px 8px',
                          background: hit ? '#065F46' : '#1F2937',
                          color: hit ? '#A7F3D0' : '#6B7280',
                          borderRadius: 6,
                          fontSize: 10,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{hit ? '✓' : '○'} {cp.pct}%</div>
                        <div style={{ marginTop: 2 }}>{cp.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase' }}>Chemin critique</div>
                    <div style={{ color: '#E6EEF7' }}>{idea.critical_path ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase' }}>Worker</div>
                    <div style={{ color: '#E6EEF7' }}>{idea.worker_id ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase' }}>Estimation</div>
                    <div style={{ color: '#E6EEF7' }}>
                      {idea.estimate_days_min}–{idea.estimate_days_max}j · conf {idea.estimate_confidence}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 10, textTransform: 'uppercase' }}>Dernier commit</div>
                    <div style={{ color: '#E6EEF7' }}>
                      {idea.last_commit_sha ? `${idea.last_commit_sha.slice(0, 7)} · ${timeAgo(idea.last_commit_at)}` : '—'}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1F2937', paddingTop: 10 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>Timeline (10 derniers)</div>
                  {events.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>Aucun événement.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {events.map((e) => (
                        <div key={e.id} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                          <span style={{ color: '#6B7280', minWidth: 50 }}>{timeAgo(e.created_at)}</span>
                          <span style={{ color: '#C9A84C', minWidth: 90, fontWeight: 600 }}>{e.event_type}</span>
                          <span style={{ color: '#9CA3AF', flex: 1 }}>{e.message ?? ''}</span>
                          {e.commit_sha && (
                            <span style={{ color: '#6B7280', fontFamily: 'ui-monospace, monospace' }}>{e.commit_sha.slice(0, 7)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div
          onClick={() => setSelectedId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#0F1A2E',
              border: '1px solid #C9A84C',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>#{selected.rank} · {Number(selected.score ?? 0).toFixed(1)} pts</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB' }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{selected.tagline}</div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #374151',
                  color: '#9CA3AF',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>

            <ProgressBar pct={selected.progress_pct ?? 0} status={selected.status} />

            <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>
              Timeline complète
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedEvents.length === 0 && (
                <div style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic' }}>Aucun événement.</div>
              )}
              {selectedEvents.map((e) => (
                <div key={e.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#6B7280', minWidth: 70 }}>{new Date(e.created_at).toLocaleTimeString('fr-FR')}</span>
                  <span style={{ color: '#C9A84C', minWidth: 100, fontWeight: 600 }}>{e.event_type}</span>
                  <span style={{ color: '#9CA3AF', flex: 1 }}>{e.message ?? ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
