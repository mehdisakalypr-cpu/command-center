'use client';

import { useBusinesses } from '@/lib/businesses/context';
import { ALL_BUSINESSES_SLUG } from '@/lib/businesses/types';

const SOURCE_ICON: Record<string, string> = {
  hisoka: '🃏',
  ftg: '🌍',
  ofa: '🎨',
  estate: '🏨',
  shiftdynamics: '⚡',
  gapup: '📮',
  manual: '📌',
};

export function BusinessPicker() {
  const { businesses, loading, selectedSlug, setSelectedSlug, selected } = useBusinesses();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 8,
        background: 'rgba(201,168,76,.06)',
        border: '1px solid rgba(201,168,76,.2)',
        backdropFilter: 'blur(8px)',
      }}
      title={selected ? `Scope: ${selected.name}` : 'Scope: tous les business'}
    >
      <span style={{ fontSize: 14 }}>
        {selected ? (SOURCE_ICON[selected.source] ?? '🏷️') : '🌐'}
      </span>
      <select
        value={selectedSlug}
        onChange={e => setSelectedSlug(e.target.value)}
        disabled={loading}
        style={{
          background: 'transparent',
          color: '#E8E0D0',
          border: 'none',
          outline: 'none',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          paddingRight: 4,
          appearance: 'none',
        }}
      >
        <option value={ALL_BUSINESSES_SLUG} style={{ background: '#071425', color: '#E8E0D0' }}>
          🌐 Tous les business
        </option>
        {businesses.map(b => (
          <option key={b.slug} value={b.slug} style={{ background: '#071425', color: '#E8E0D0' }}>
            {SOURCE_ICON[b.source] ?? '🏷️'} {b.name}
          </option>
        ))}
      </select>
      <span style={{ color: '#5A6A7A', fontSize: 10 }}>▾</span>
    </div>
  );
}
