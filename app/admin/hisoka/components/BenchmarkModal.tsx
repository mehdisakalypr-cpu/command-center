'use client';
import { useState } from 'react';

export default function BenchmarkModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const r = await fetch('/api/business-hunter/benchmark', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const j = await r.json();
    setResult(j.ok ? (j.note ?? 'saved') : `error: ${j.error}`);
    setBusy(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0A1A2E', padding: 24, borderRadius: 8, width: 480, color: '#E6EEF7' }}>
        <h3 style={{ color: '#C9A84C', marginBottom: 10 }}>📝 Benchmark My Idea</h3>
        <textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))} rows={6}
                  placeholder="Décris ton idée en 1-2 phrases…" style={{ width: '100%', background: '#112233', color: '#E6EEF7', border: '1px solid rgba(201,168,76,.2)', padding: 8 }} />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#9BA8B8', border: '1px solid #444', padding: '6px 12px', borderRadius: 4 }}>Annuler</button>
          <button onClick={submit} disabled={busy || text.length < 10}
                  style={{ background: '#C9A84C', color: '#0A1A2E', fontWeight: 700, border: 'none', padding: '6px 12px', borderRadius: 4 }}>
            {busy ? '…' : 'Analyser'}
          </button>
        </div>
        {result && <div style={{ marginTop: 12, fontSize: 12, color: '#6BCB77' }}>{result}</div>}
      </div>
    </div>
  );
}
