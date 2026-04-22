'use client';
import { useState } from 'react';
import BenchmarkModal from './BenchmarkModal';
import PortfolioModal from './PortfolioModal';

export default function HeaderActions() {
  const [openBenchmark, setOpenBenchmark] = useState(false);
  const [openPortfolio, setOpenPortfolio] = useState(false);

  const btn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: '1px solid #C9A84C', color: '#C9A84C',
        padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginLeft: 12,
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      {btn('💼 Portfolio Mode', () => setOpenPortfolio(true))}
      {btn('📝 Benchmark my idea', () => setOpenBenchmark(true))}
      {openBenchmark && <BenchmarkModal onClose={() => setOpenBenchmark(false)} />}
      {openPortfolio && <PortfolioModal onClose={() => setOpenPortfolio(false)} />}
    </>
  );
}
