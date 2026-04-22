'use client';
import { useState } from 'react';
import BenchmarkModal from './BenchmarkModal';

export default function HeaderActions() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
              style={{
                background: 'transparent', border: '1px solid #C9A84C', color: '#C9A84C',
                padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginLeft: 12,
              }}>
        📝 Benchmark my idea
      </button>
      {open && <BenchmarkModal onClose={() => setOpen(false)} />}
    </>
  );
}
