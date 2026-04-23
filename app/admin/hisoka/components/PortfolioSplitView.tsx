'use client';
import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '@/lib/auth-v2/client-fetch';
import IdeaDetailClient from '../[slug]/IdeaDetailClient';
import type { IdeaRow } from '../types';

const SUPPORTED_LOCALES = [
  'en', 'fr', 'es', 'pt', 'ar', 'zh', 'de', 'tr', 'ja', 'ko', 'hi', 'ru', 'id', 'sw', 'it',
];

function detectBrowserLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  const raw = navigator.languages?.[0] ?? navigator.language ?? 'en';
  const base = raw.split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(base) ? base : 'en';
}

const GOLD = '#C9A84C';
const BG = '#0A1A2E';
const FG = '#E6EEF7';
const DIM = '#9BA8B8';
const GOOD = '#6BCB77';
const WARN = '#FFB84C';
const BAD = '#FF6B6B';

type Props = {
  initialIdeas: IdeaRow[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FullIdea = any;

export default function PortfolioSplitView({ initialIdeas }: Props) {
  const sorted = useMemo(
    () => [...initialIdeas].sort((a, b) => {
      const ra = a.rank ?? 9999;
      const rb = b.rank ?? 9999;
      if (ra !== rb) return ra - rb;
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    }),
    [initialIdeas],
  );

  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);
  const [filter, setFilter] = useState<'all' | 'private' | 'public' | 'top20'>('all');
  const [search, setSearch] = useState('');
  const [fullIdea, setFullIdea] = useState<FullIdea | null>(null);
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<string>('en');

  useEffect(() => {
    setLocale(detectBrowserLocale());
  }, []);
  const [minatoState, setMinatoState] = useState<
    Record<
      string,
      {
        status: 'idle' | 'pushing' | 'pushed' | 'error' | 'building' | 'done' | 'failed';
        ticketId?: string;
        error?: string;
        prUrl?: string;
      }
    >
  >(() => {
    const init: Record<string, { status: 'pushed'; ticketId?: string }> = {};
    for (const i of initialIdeas) {
      if (i.pushed_to_minato_at || i.minato_ticket_id) {
        init[i.id] = { status: 'pushed', ticketId: i.minato_ticket_id ?? undefined };
      }
    }
    return init;
  });

  useEffect(() => {
    const pushedIds = Object.entries(minatoState)
      .filter(([, v]) => v.status === 'pushed' || v.status === 'building')
      .map(([id]) => id);
    if (pushedIds.length === 0) return;

    let cancelled = false;
    async function poll() {
      for (const id of pushedIds) {
        if (cancelled) return;
        try {
          const r = await authFetch(`/api/business-hunter/ideas/${id}/minato-status`);
          const j = await r.json();
          if (cancelled || !j.ok) continue;
          const s = j.status as 'queued' | 'building' | 'done' | 'failed' | null;
          if (!s) continue;
          setMinatoState((prev) => ({
            ...prev,
            [id]: {
              status: s === 'queued' ? 'pushed' : s,
              ticketId: j.ticket_id ?? prev[id]?.ticketId,
              error: j.error ?? undefined,
              prUrl: j.pr_url ?? undefined,
            },
          }));
        } catch {
          // ignore transient errors
        }
      }
    }
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(minatoState).length]);

  async function launchWithMinato(ideaId: string, ideaName: string) {
    if (minatoState[ideaId]?.status === 'pushing') return;
    if (!confirm(`Lancer « ${ideaName} » avec Minato ? Ça crée un ticket dans la queue d'exécution.`)) return;
    setMinatoState((s) => ({ ...s, [ideaId]: { status: 'pushing' } }));
    try {
      const r = await authFetch(`/api/business-hunter/ideas/${ideaId}/push-to-minato`, { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        setMinatoState((s) => ({
          ...s,
          [ideaId]: { status: 'pushed', ticketId: j.ticket_id },
        }));
      } else {
        setMinatoState((s) => ({ ...s, [ideaId]: { status: 'error', error: j.error ?? 'push failed' } }));
      }
    } catch (e) {
      setMinatoState((s) => ({ ...s, [ideaId]: { status: 'error', error: String(e) } }));
    }
  }

  const filtered = useMemo(() => {
    let list = sorted;
    if (filter === 'private') list = list.filter((i) => i.visibility === 'private');
    if (filter === 'public') list = list.filter((i) => i.visibility !== 'private');
    if (filter === 'top20') list = list.filter((i) => i.rank != null && i.rank <= 20);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.tagline?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, filter, search]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    const qs = locale && locale !== 'en' ? `?locale=${encodeURIComponent(locale)}` : '';
    authFetch(`/api/business-hunter/ideas/${selectedId}${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok && j.idea) setFullIdea(j.idea);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, locale]);

  const counts = useMemo(
    () => ({
      total: sorted.length,
      top20: sorted.filter((i) => i.rank != null && i.rank <= 20).length,
      priv: sorted.filter((i) => i.visibility === 'private').length,
      pub: sorted.filter((i) => i.visibility !== 'private').length,
    }),
    [sorted],
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 360px) 1fr',
        gap: 16,
        marginTop: 16,
        alignItems: 'start',
      }}
    >
      {/* LEFT — List */}
      <div
        style={{
          background: BG,
          borderRadius: 8,
          border: `1px solid rgba(201,168,76,.2)`,
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          position: 'sticky',
          top: 12,
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: '1px solid rgba(201,168,76,.2)',
            background: BG,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
            Projets · {filtered.length}/{counts.total}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{
              width: '100%',
              background: '#112233',
              color: FG,
              border: `1px solid ${DIM}`,
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {([
              ['all', `Tous (${counts.total})`],
              ['top20', `Top20 (${counts.top20})`],
              ['public', `Public (${counts.pub})`],
              ['private', `Privé (${counts.priv})`],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                style={{
                  background: filter === v ? GOLD : 'transparent',
                  color: filter === v ? BG : DIM,
                  border: `1px solid ${filter === v ? GOLD : '#1A2940'}`,
                  padding: '3px 8px',
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          {filtered.map((idea) => {
            const selected = idea.id === selectedId;
            const isPrivate = idea.visibility === 'private';
            return (
              <div
                key={idea.id}
                onClick={() => setSelectedId(idea.id)}
                style={{
                  padding: 10,
                  borderBottom: '1px solid #1A2940',
                  cursor: 'pointer',
                  background: selected ? 'rgba(201,168,76,.1)' : 'transparent',
                  borderLeft: selected ? `3px solid ${GOLD}` : '3px solid transparent',
                  transition: 'background .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => setSelectedId(idea.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {idea.rank != null && (
                    <span
                      style={{
                        background: idea.rank <= 3 ? GOOD : idea.rank <= 10 ? GOLD : '#1A2940',
                        color: idea.rank <= 3 ? BG : idea.rank <= 10 ? BG : DIM,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 2,
                      }}
                    >
                      #{idea.rank}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: selected ? GOLD : FG,
                        fontSize: 12,
                        fontWeight: selected ? 700 : 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isPrivate && <span style={{ color: BAD, marginRight: 4 }}>🔒</span>}
                      {idea.name}
                    </div>
                    <div
                      style={{
                        color: DIM,
                        fontSize: 10,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {idea.category}
                      {idea.llc_gate && idea.llc_gate !== 'none' && (
                        <span style={{ color: idea.llc_gate === 'blocked' ? BAD : WARN, marginLeft: 5 }}>
                          · {idea.llc_gate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: DIM, textAlign: 'right' }}>
                    <div style={{ color: GOLD, fontWeight: 700 }}>{Number(idea.score).toFixed(0)}</div>
                    <div>
                      aut{' '}
                      <span style={{ color: idea.autonomy_score >= 0.9 ? GOOD : WARN }}>
                        {Number(idea.autonomy_score).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <MinatoLaunchButton
                    state={minatoState[idea.id]?.status ?? 'idle'}
                    prUrl={minatoState[idea.id]?.prUrl}
                    onLaunch={(e) => {
                      e.stopPropagation();
                      launchWithMinato(idea.id, idea.name);
                    }}
                  />
                </div>
                {minatoState[idea.id]?.status === 'error' && (
                  <div style={{ color: BAD, fontSize: 10, marginTop: 4, marginLeft: 22 }}>
                    ⚠ {minatoState[idea.id]?.error}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 20, color: DIM, fontSize: 12, textAlign: 'center' }}>Aucun projet</div>
          )}
        </div>
      </div>

      {/* RIGHT — Detail */}
      <div>
        {locale !== 'en' && (
          <div
            style={{
              fontSize: 10,
              color: DIM,
              padding: '4px 10px',
              background: 'rgba(201,168,76,.08)',
              border: `1px solid rgba(201,168,76,.2)`,
              borderRadius: 3,
              marginBottom: 8,
              display: 'inline-block',
            }}
            title="Analyses traduites à la volée (cache LLM) — retirer le paramètre ?locale pour voir la source EN"
          >
            🌐 Analyse traduite · {locale}
          </div>
        )}
        {loading && !fullIdea && (
          <div style={{ padding: 40, textAlign: 'center', color: DIM }}>Chargement…</div>
        )}
        {fullIdea && (
          <IdeaDetailClient key={`${fullIdea.id}:${locale}`} initialIdea={fullIdea} />
        )}
        {!loading && !fullIdea && selectedId && (
          <div style={{ padding: 40, textAlign: 'center', color: BAD }}>Projet introuvable.</div>
        )}
        {!selectedId && (
          <div style={{ padding: 40, textAlign: 'center', color: DIM }}>Sélectionne un projet à gauche ←</div>
        )}
      </div>
    </div>
  );
}

type MinatoState = 'idle' | 'pushing' | 'pushed' | 'error' | 'building' | 'done' | 'failed';

function MinatoLaunchButton({
  state,
  prUrl,
  onLaunch,
}: {
  state: MinatoState;
  prUrl?: string;
  onLaunch: (e: React.MouseEvent) => void;
}) {
  const cfg: Record<MinatoState, { label: string; bg: string; color: string; border: string; title: string }> = {
    idle: {
      label: '▶ Minato',
      bg: 'rgba(201,168,76,.15)',
      color: GOLD,
      border: GOLD,
      title: 'Créer un ticket Minato pour commencer la construction',
    },
    pushing: {
      label: '…',
      bg: 'rgba(201,168,76,.15)',
      color: GOLD,
      border: GOLD,
      title: 'Envoi en cours…',
    },
    pushed: {
      label: '✓ En queue',
      bg: 'rgba(107,203,119,.15)',
      color: GOOD,
      border: GOOD,
      title: 'Dans la queue Minato, en attente de claim par un worker',
    },
    building: {
      label: '⚙ Build…',
      bg: 'rgba(255,184,76,.18)',
      color: WARN,
      border: WARN,
      title: 'Un worker Minato construit le projet en ce moment',
    },
    done: {
      label: prUrl ? '✅ PR ↗' : '✅ Done',
      bg: 'rgba(107,203,119,.2)',
      color: GOOD,
      border: GOOD,
      title: prUrl ?? 'Construction terminée',
    },
    failed: {
      label: '⚠ Failed',
      bg: 'rgba(255,107,107,.2)',
      color: BAD,
      border: BAD,
      title: 'Le worker a échoué — cliquer pour relancer un ticket',
    },
    error: {
      label: '↻ Relancer',
      bg: 'rgba(255,107,107,.15)',
      color: BAD,
      border: BAD,
      title: 'Erreur au dernier push — cliquer pour réessayer',
    },
  };
  const c = cfg[state];
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'done' && prUrl) {
      window.open(prUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    onLaunch(e);
  };
  return (
    <button
      onClick={handleClick}
      disabled={state === 'pushing' || state === 'building'}
      title={c.title}
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: '3px 7px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
        cursor: state === 'pushing' || state === 'building' ? 'wait' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {c.label}
    </button>
  );
}
