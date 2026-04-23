export function ProgressBar({ pct, status }: { pct: number; status?: string }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  const color =
    status === 'shipped' ? '#111827' :
    status === 'blocked' ? '#F59E0B' :
    status === 'in_progress' ? '#3B82F6' :
    status === 'ready' ? '#10B981' : '#9CA3AF';

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: 8,
          background: '#1F2937',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: color,
            transition: 'width 0.35s ease',
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'right' }}>
        {clamped}%
      </div>
    </div>
  );
}
