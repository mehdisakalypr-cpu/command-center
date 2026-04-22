'use client';
import { useEffect, useRef, useState } from 'react';

type Props = { title: string; mermaid: string; defaultOpen?: boolean };

export default function ArchitectureDiagram({ title, mermaid, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!open || rendered.current || !ref.current) return;
    rendered.current = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      const m = (window as unknown as { mermaid?: { initialize: (c: unknown) => void; run: (c?: unknown) => void } }).mermaid;
      if (m) {
        m.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#C9A84C',
            primaryTextColor: '#0A1A2E',
            lineColor: '#9BA8B8',
            secondaryColor: '#112233',
            tertiaryColor: '#0A1A2E',
            background: '#0A1A2E',
          },
        });
        m.run({ querySelector: 'pre.mermaid' });
      }
    };
    document.head.appendChild(script);
  }, [open]);

  return (
    <div style={{ background: '#0A1A2E', border: '1px solid rgba(201,168,76,.15)', borderRadius: 8, marginTop: 16, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
              style={{ background: 'transparent', border: 'none', color: '#C9A84C', padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'left' }}>
        {open ? '▼' : '▶'} {title}
      </button>
      {open && (
        <div ref={ref} style={{ padding: 14, overflowX: 'auto' }}>
          <pre className="mermaid" style={{ background: 'transparent', color: '#E6EEF7', fontSize: 12 }}>{mermaid}</pre>
        </div>
      )}
    </div>
  );
}
