'use client';

import { useEffect, useState } from 'react';

type PowerMode = {
  mode: 'shaka_33' | 'ultra_instinct';
  workers_max: number;
  budget_cap_eur: number;
  daily_spend_cap_eur: number;
};

export function PowerModeBadge() {
  const [pm, setPm] = useState<PowerMode | null>(null);

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const r = await fetch('/api/business-hunter/power-mode', { cache: 'no-store' });
        if (r.ok) setPm(await r.json());
      } catch {}
    };
    fetchMode();
    const i = setInterval(fetchMode, 30000);
    return () => clearInterval(i);
  }, []);

  if (!pm) return null;
  const isUI = pm.mode === 'ultra_instinct';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        background: isUI ? '#B91C1C' : '#1F2937',
        color: isUI ? '#FFFFFF' : '#9CA3AF',
        border: `1px solid ${isUI ? '#DC2626' : '#374151'}`,
        textTransform: 'uppercase',
      }}
      title={`${pm.workers_max} workers · cap ${pm.budget_cap_eur}€/mo · ${pm.daily_spend_cap_eur}€/jour`}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isUI ? '#FEE2E2' : '#6B7280',
          animation: isUI ? 'pulse 1.4s ease-in-out infinite' : 'none',
        }}
      />
      {isUI ? 'Ultra Instinct' : 'Shaka 33%'}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </span>
  );
}
