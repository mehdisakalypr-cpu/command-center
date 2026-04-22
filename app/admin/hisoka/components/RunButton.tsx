'use client';
import { useState } from 'react';

export default function RunButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true); setMsg('🃏 Hunting…');
    try {
      const r = await fetch('/api/business-hunter/run', { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        setMsg(`✓ ${j.ideas_upserted} upserted · €${Number(j.cost_eur).toFixed(2)} · reload to see`);
      } else {
        setMsg(`✗ ${j.error ?? 'failed'}`);
      }
    } catch (e) {
      setMsg(`✗ ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button
        onClick={run}
        disabled={busy}
        style={{
          background: busy ? '#333' : '#C9A84C', color: '#0A1A2E', fontWeight: 700,
          border: 'none', padding: '8px 16px', borderRadius: 6, cursor: busy ? 'wait' : 'pointer',
        }}>
        {busy ? '⏳ Hunting…' : '▶ Hisoka, run'}
      </button>
      {msg && <span style={{ color: '#9BA8B8', fontSize: 13 }}>{msg}</span>}
    </div>
  );
}
