export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-neutral-950">
      <div className="saas-blob saas-blob-1" />
      <div className="saas-blob saas-blob-2" />
      <div className="saas-blob saas-blob-3" />
      <div className="saas-grid" />
      <style>{`
        .saas-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(120px);
          opacity: 0.35;
          mix-blend-mode: screen;
          will-change: transform;
        }
        .saas-blob-1 {
          width: 600px; height: 600px;
          top: -150px; left: -150px;
          background: radial-gradient(circle, #10b981 0%, transparent 70%);
          animation: saas-drift-1 22s ease-in-out infinite alternate;
        }
        .saas-blob-2 {
          width: 550px; height: 550px;
          top: 40%; right: -200px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          animation: saas-drift-2 28s ease-in-out infinite alternate;
        }
        .saas-blob-3 {
          width: 500px; height: 500px;
          bottom: -150px; left: 30%;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          animation: saas-drift-3 32s ease-in-out infinite alternate;
        }
        .saas-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
        }
        @keyframes saas-drift-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(120px, 80px) scale(1.15); }
        }
        @keyframes saas-drift-2 {
          0%   { transform: translate(0, 0) scale(1.1); }
          100% { transform: translate(-80px, -120px) scale(0.95); }
        }
        @keyframes saas-drift-3 {
          0%   { transform: translate(0, 0) scale(0.95); }
          100% { transform: translate(60px, -80px) scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .saas-blob { animation: none; }
        }
      `}</style>
    </div>
  );
}
