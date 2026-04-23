'use client';
import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '@/lib/auth-v2/client-fetch';
import IdeaDetailClient from '../[slug]/IdeaDetailClient';
import type { IdeaRow } from '../types';

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
    authFetch(`/api/business-hunter/ideas/${selectedId}`)
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
  }, [selectedId]);

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
                </div>
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
        {loading && !fullIdea && (
          <div style={{ padding: 40, textAlign: 'center', color: DIM }}>Chargement…</div>
        )}
        {fullIdea && (
          <IdeaDetailClient key={fullIdea.id} initialIdea={fullIdea} />
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
