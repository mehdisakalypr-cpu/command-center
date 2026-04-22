'use client';
import { useState } from 'react';

export default function ForgeControls() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function action(path: 'forge' | 'pause' | 'resume') {
    setBusy(true);
    setMsg('…');
    try {
      const r = await fetch(`/api/business-hunter/aam/${path}`, { method: 'POST' });
      const j = await r.json();
      setMsg(
        j.ok
          ? path === 'forge'
            ? `✓ ${j.result?.verdict ?? 'done'}`
            : `✓ ${path}d`
          : `✗ ${j.error}`
      );
    } catch (e) {
      setMsg(`✗ ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
      <button
        onClick={() => action('forge')}
        disabled={busy}
        style={{
          background: busy ? '#555' : '#C9A84C',
          color: '#0A1A2E',
          fontWeight: 700,
          border: 'none',
          padding: '7px 14px',
          borderRadius: 4,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? '⚒ Forging…' : '▶ AAM, forge next'}
      </button>
      <button
        onClick={() => action('pause')}
        disabled={busy}
        style={{
          background: 'transparent',
          color: '#FF6B6B',
          border: '1px solid #FF6B6B',
          padding: '7px 14px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        ⏸ Pause
      </button>
      <button
        onClick={() => action('resume')}
        disabled={busy}
        style={{
          background: 'transparent',
          color: '#6BCB77',
          border: '1px solid #6BCB77',
          padding: '7px 14px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        ▶ Resume
      </button>
      {msg && (
        <span style={{ color: '#9BA8B8', fontSize: 12, alignSelf: 'center' }}>
          {msg}
        </span>
      )}
    </div>
  );
}
