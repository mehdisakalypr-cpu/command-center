'use client';
import { useMemo, useState } from 'react';
import { authFetch } from '@/lib/auth-v2/client-fetch';
import type { IdeaRow } from '../types';

const GOLD = '#C9A84C';
const BG = '#0A1A2E';
const FG = '#E6EEF7';
const DIM = '#9BA8B8';
const GOOD = '#6BCB77';
const WARN = '#FFB84C';
const BAD = '#FF6B6B';

type Props = { initialIdeas: IdeaRow[] };

type Priorities = Record<string, number | null>;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function BuildPriorityView({ initialIdeas }: Props) {
  const pushed = useMemo(
    () => initialIdeas.filter((i) => i.pushed_to_minato_at || i.minato_ticket_id),
    [initialIdeas],
  );

  const [priorities, setPriorities] = useState<Priorities>(() => {
    const p: Priorities = {};
    for (const i of pushed) p[i.id] = i.build_priority ?? null;
    return p;
  });
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => {
    return [...pushed].sort((a, b) => {
      const pa = priorities[a.id];
      const pb = priorities[b.id];
      if (pa != null && pb != null) return pa - pb;
      if (pa != null) return -1;
      if (pb != null) return 1;
      return (a.rank ?? 9999) - (b.rank ?? 9999);
    });
  }, [pushed, priorities]);

  async function persist(id: string, value: number | null) {
    setSaveState((s) => ({ ...s, [id]: 'saving' }));
    setError(null);
    try {
      const r = await authFetch(`/api/business-hunter/ideas/${id}/build-priority`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priority: value }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error ?? 'save failed');
      setSaveState((s) => ({ ...s, [id]: 'saved' }));
      setTimeout(() => setSaveState((s) => ({ ...s, [id]: 'idle' })), 800);
    } catch (e) {
      setSaveState((s) => ({ ...s, [id]: 'error' }));
      setError(String(e));
    }
  }

  function setPriority(id: string, value: number | null) {
    const clean =
      value === null
        ? null
        : Math.max(1, Math.min(9999, Math.round(value)));
    setPriorities((p) => ({ ...p, [id]: clean }));
    persist(id, clean);
  }

  function moveUp(id: string) {
    const idx = ordered.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const above = ordered[idx - 1];
    const current = priorities[id];
    const abovePrio = priorities[above.id];
    const newSelf = abovePrio != null ? abovePrio : idx;
    const newAbove = current != null ? current : idx + 1;
    setPriority(id, newSelf);
    setPriority(above.id, newAbove);
  }

  function moveDown(id: string) {
    const idx = ordered.findIndex((i) => i.id === id);
    if (idx < 0 || idx >= ordered.length - 1) return;
    const below = ordered[idx + 1];
    const current = priorities[id];
    const belowPrio = priorities[below.id];
    const newSelf = belowPrio != null ? belowPrio : idx + 2;
    const newBelow = current != null ? current : idx + 1;
    setPriority(id, newSelf);
    setPriority(below.id, newBelow);
  }

  function reset(id: string) {
    setPriority(id, null);
  }

  if (pushed.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: DIM, background: BG, borderRadius: 8, marginTop: 16 }}>
        Aucun projet n'a encore été poussé à Minato.
        <br />
        <span style={{ fontSize: 11 }}>Va sur l'onglet <strong>📂 Portfolio (split)</strong> et clique ▶ Minato sur un projet.</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: DIM, fontSize: 12, marginBottom: 12 }}>
        Projets en construction ({pushed.length}) — ordre d'exécution Minato.
        <br />
        <span style={{ fontSize: 10 }}>
          Rang <strong>1 = priorité max</strong>. Null = auto (basé sur le score Hisoka).
          Les workers Minato dépilent par <code>build_priority asc nulls last</code>.
        </span>
      </div>
      {error && (
        <div style={{ padding: 8, background: 'rgba(255,107,107,.1)', color: BAD, fontSize: 11, marginBottom: 8, borderRadius: 4 }}>
          ⚠ {error}
        </div>
      )}
      <div style={{ background: BG, borderRadius: 8, border: `1px solid rgba(201,168,76,.2)`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: FG, fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(201,168,76,.1)', borderBottom: `1px solid rgba(201,168,76,.2)` }}>
              <th style={th}>#</th>
              <th style={th}>Rang build</th>
              <th style={{ ...th, textAlign: 'left' }}>Projet</th>
              <th style={th}>Score Hisoka</th>
              <th style={th}>Autonomie</th>
              <th style={th}>LLC Gate</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((idea, idx) => {
              const prio = priorities[idea.id];
              const state = saveState[idea.id] ?? 'idle';
              return (
                <tr key={idea.id} style={{ borderBottom: '1px solid #1A2940' }}>
                  <td style={{ ...td, color: DIM, width: 30 }}>{idx + 1}</td>
                  <td style={{ ...td, width: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <button onClick={() => moveUp(idea.id)} disabled={idx === 0} style={arrowBtn(idx === 0)} title="Monter">
                        ▲
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={prio ?? ''}
                        placeholder="auto"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') setPriority(idea.id, null);
                          else {
                            const n = Number(v);
                            if (!Number.isNaN(n)) setPriority(idea.id, n);
                          }
                        }}
                        style={{
                          width: 56,
                          background: prio != null ? 'rgba(201,168,76,.15)' : '#112233',
                          color: prio != null ? GOLD : DIM,
                          border: `1px solid ${state === 'error' ? BAD : state === 'saved' ? GOOD : DIM}`,
                          padding: '3px 5px',
                          fontSize: 11,
                          borderRadius: 3,
                          textAlign: 'center',
                          fontWeight: prio != null ? 700 : 400,
                        }}
                      />
                      <button
                        onClick={() => moveDown(idea.id)}
                        disabled={idx === ordered.length - 1}
                        style={arrowBtn(idx === ordered.length - 1)}
                        title="Descendre"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'left' }}>
                    {idea.visibility === 'private' && <span style={{ color: BAD, marginRight: 4 }}>🔒</span>}
                    <strong style={{ color: prio === 1 ? GOOD : FG }}>{idea.name}</strong>
                    <div style={{ color: DIM, fontSize: 10 }}>
                      {idea.category}
                      {idea.tagline ? ` · ${idea.tagline.slice(0, 80)}${idea.tagline.length > 80 ? '…' : ''}` : ''}
                    </div>
                  </td>
                  <td style={{ ...td, color: GOLD, fontWeight: 700 }}>{Number(idea.score).toFixed(0)}</td>
                  <td style={{ ...td, color: idea.autonomy_score >= 0.9 ? GOOD : WARN }}>
                    {Number(idea.autonomy_score).toFixed(2)}
                  </td>
                  <td style={{ ...td, color: idea.llc_gate === 'blocked' ? BAD : idea.llc_gate === 'none' ? GOOD : WARN, fontSize: 10 }}>
                    {idea.llc_gate}
                  </td>
                  <td style={{ ...td, width: 100 }}>
                    <button
                      onClick={() => reset(idea.id)}
                      disabled={prio == null}
                      style={{
                        background: 'transparent',
                        color: prio == null ? '#1A2940' : DIM,
                        border: `1px solid ${prio == null ? '#1A2940' : DIM}`,
                        padding: '3px 7px',
                        fontSize: 10,
                        borderRadius: 3,
                        cursor: prio == null ? 'not-allowed' : 'pointer',
                      }}
                      title="Retirer le rang manuel (retour auto)"
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 10px',
  color: GOLD,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  textAlign: 'center',
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center',
  verticalAlign: 'middle',
};

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    background: 'transparent',
    color: disabled ? '#1A2940' : GOLD,
    border: `1px solid ${disabled ? '#1A2940' : GOLD}`,
    width: 24,
    height: 24,
    fontSize: 10,
    borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: 0,
  };
}
