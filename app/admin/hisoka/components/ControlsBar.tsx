'use client';
import type { Envelope, Filters } from '../types';
import { ALL_CATEGORIES } from '../types';

type Props = {
  envelope: Envelope;
  filters: Filters;
  onEnvelope: (e: Envelope) => void;
  onFilters: (f: Filters) => void;
};

const CATEGORY_SHORT: Record<string, string> = {
  middleware_api: 'API',
  data_platform: 'Data',
  productized_service: 'Service',
  marketplace: 'Market',
  content_platform: 'Content',
  tool_utility: 'Tool',
  b2b_integration: 'B2B',
};

export default function ControlsBar({ envelope, filters, onEnvelope, onFilters }: Props) {
  function toggleCategory(c: string) {
    const cur = filters.categories ?? [...ALL_CATEGORIES];
    const next = cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c];
    onFilters({ ...filters, categories: next.length === ALL_CATEGORIES.length ? null : next });
  }
  const activeCats = filters.categories ?? [...ALL_CATEGORIES];

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50, background: '#0A1A2E',
      border: '1px solid rgba(201,168,76,.15)', borderRadius: 8, padding: 12, marginBottom: 12,
      display: 'grid', gap: 10,
    }}>
      {/* Sliders row */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: '#9BA8B8', display: 'flex', gap: 6, alignItems: 'center' }}>
          💰 Budget
          <input type="range" min={0} max={5000} step={500}
                 value={envelope.budgetEur}
                 onChange={e => onEnvelope({ ...envelope, budgetEur: Number(e.target.value) })}
                 style={{ width: 160, accentColor: '#C9A84C' }} />
          <span style={{ color: '#C9A84C', fontWeight: 600, width: 64, textAlign: 'right' }}>€{envelope.budgetEur}</span>
        </label>
        <label style={{ fontSize: 12, color: '#9BA8B8', display: 'flex', gap: 6, alignItems: 'center' }}>
          🔀 Fleet
          <input type="range" min={1} max={10} step={1}
                 value={envelope.workers}
                 onChange={e => onEnvelope({ ...envelope, workers: Number(e.target.value) })}
                 style={{ width: 140, accentColor: '#C9A84C' }} />
          <span style={{ color: '#C9A84C', fontWeight: 600, width: 56, textAlign: 'right' }}>{envelope.workers}w</span>
          <span style={{ color: '#9BA8B8', fontSize: 10 }}>(+€{envelope.workers * 200}/mo)</span>
        </label>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9BA8B8', marginRight: 4 }}>Categories:</span>
        {ALL_CATEGORIES.map(c => {
          const active = activeCats.includes(c);
          return (
            <button key={c} onClick={() => toggleCategory(c)}
                    style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 11,
                      background: active ? 'rgba(201,168,76,.2)' : 'transparent',
                      border: `1px solid ${active ? '#C9A84C' : 'rgba(255,255,255,.1)'}`,
                      color: active ? '#C9A84C' : '#9BA8B8',
                      cursor: 'pointer',
                    }}>
              {CATEGORY_SHORT[c] ?? c}
            </button>
          );
        })}
      </div>

      {/* Dropdowns row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: '#9BA8B8' }}>
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          Elasticity:
          <select value={filters.elasticity}
                  onChange={e => onFilters({ ...filters, elasticity: e.target.value as Filters['elasticity'] })}
                  style={{ background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: '2px 6px', fontSize: 11 }}>
            <option value="all">all</option>
            <option value="high">high only</option>
            <option value="exclude_flat">exclude flat</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          LLC gate:
          <select value={filters.llcGate}
                  onChange={e => onFilters({ ...filters, llcGate: e.target.value as Filters['llcGate'] })}
                  style={{ background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: '2px 6px', fontSize: 11 }}>
            <option value="all">all</option>
            <option value="doable_now">doable now only</option>
            <option value="post_expat_ok">post-expat OK</option>
          </select>
        </label>
      </div>
    </div>
  );
}
