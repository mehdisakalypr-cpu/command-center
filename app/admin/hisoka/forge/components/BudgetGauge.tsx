'use client';

export default function BudgetGauge({ costTodayEur }: { costTodayEur: number }) {
  const pct = Math.min(100, (costTodayEur / 0.5) * 100);
  const color = pct < 60 ? '#6BCB77' : pct < 90 ? '#FFB84C' : '#FF6B6B';

  return (
    <div
      style={{
        background: '#0A1A2E',
        border: '1px solid rgba(201,168,76,.15)',
        borderRadius: 6,
        padding: 10,
        marginBottom: 12,
      }}
    >
      <div style={{ color: '#9BA8B8', fontSize: 11, marginBottom: 4 }}>
        Budget AAM aujourd'hui — €{costTodayEur.toFixed(2)} / €0.50
      </div>
      <div
        style={{
          height: 6,
          background: '#112233',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
