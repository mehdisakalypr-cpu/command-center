'use client';
import { useState, type ReactNode } from 'react';

const GOLD = '#C9A84C';
const BG = '#0A1A2E';
const DIM = '#9BA8B8';

type View = 'split' | 'table' | 'build';

export default function HisokaViewSwitcher({
  splitView,
  tableView,
  buildView,
}: {
  splitView: ReactNode;
  tableView: ReactNode;
  buildView: ReactNode;
}) {
  const [view, setView] = useState<View>('split');
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {([
          ['split', '📂 Portfolio (split)'],
          ['table', '📊 Tableau filtres'],
          ['build', '🏗 Priorité Build'],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? GOLD : 'transparent',
              color: view === v ? BG : DIM,
              border: `1px solid ${view === v ? GOLD : '#1A2940'}`,
              padding: '5px 12px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: view === v ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'split' && splitView}
      {view === 'table' && tableView}
      {view === 'build' && buildView}
    </div>
  );
}
