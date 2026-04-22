import type { IconSet } from '@/lib/hisoka/saas-forge/archetype-scenes';

// CSS 3D floating icons. Each icon is an SVG tilted + drifting in perspective space.
export function FloatingScene({ scene }: { scene: IconSet }) {
  return (
    <div className="saas-scene" aria-hidden="true">
      {scene.icons.map((ic, i) => (
        <div key={i} className={`saas-scene-item saas-scene-item-${i + 1}`}>
          <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke={ic.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={ic.path} />
          </svg>
        </div>
      ))}
      <style>{`
        .saas-scene {
          position: fixed; inset: 0; z-index: -1;
          pointer-events: none;
          perspective: 1200px;
          perspective-origin: 50% 50%;
        }
        .saas-scene-item {
          position: absolute;
          opacity: 0.35;
          filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));
          will-change: transform;
        }
        .saas-scene-item svg { display: block; }
        .saas-scene-item-1 {
          top: 15%; left: 8%;
          animation: saas-float-a 18s ease-in-out infinite alternate;
        }
        .saas-scene-item-2 {
          top: 25%; right: 10%;
          animation: saas-float-b 24s ease-in-out infinite alternate;
        }
        .saas-scene-item-3 {
          bottom: 22%; left: 15%;
          animation: saas-float-c 20s ease-in-out infinite alternate;
        }
        .saas-scene-item-4 {
          bottom: 30%; right: 18%;
          animation: saas-float-d 26s ease-in-out infinite alternate;
        }
        @keyframes saas-float-a {
          0%   { transform: translate3d(0, 0, 0) rotateX(20deg) rotateY(0deg) scale(1); }
          100% { transform: translate3d(40px, -60px, 100px) rotateX(35deg) rotateY(180deg) scale(1.15); }
        }
        @keyframes saas-float-b {
          0%   { transform: translate3d(0, 0, 0) rotateX(-15deg) rotateY(180deg) scale(1.2); }
          100% { transform: translate3d(-50px, 40px, -50px) rotateX(20deg) rotateY(360deg) scale(0.9); }
        }
        @keyframes saas-float-c {
          0%   { transform: translate3d(0, 0, 0) rotateX(10deg) rotateY(90deg) scale(0.9); }
          100% { transform: translate3d(60px, -40px, 80px) rotateX(-20deg) rotateY(-90deg) scale(1.25); }
        }
        @keyframes saas-float-d {
          0%   { transform: translate3d(0, 0, 0) rotateX(-10deg) rotateY(-45deg) scale(1.1); }
          100% { transform: translate3d(-40px, 50px, -30px) rotateX(25deg) rotateY(225deg) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          .saas-scene-item { animation: none; }
        }
      `}</style>
    </div>
  );
}
