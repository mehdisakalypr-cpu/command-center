'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

export type SceneKind =
  | 'music'
  | 'data'
  | 'marketplace'
  | 'api'
  | 'legal'
  | 'content'
  | 'hr'
  | 'default';

const PALETTE: Record<SceneKind, string[]> = {
  music:       ['#ec4899', '#a78bfa', '#f472b6'],
  data:        ['#10b981', '#34d399', '#6ee7b7'],
  marketplace: ['#f59e0b', '#fbbf24', '#fcd34d'],
  api:         ['#6366f1', '#818cf8', '#a5b4fc'],
  legal:       ['#fbbf24', '#fde68a', '#fef3c7'],
  content:     ['#60a5fa', '#93c5fd', '#bfdbfe'],
  hr:          ['#f472b6', '#fbcfe8', '#fce7f3'],
  default:     ['#10b981', '#6366f1', '#ec4899'],
};

type ObjProps = {
  position: [number, number, number];
  color: string;
  speed: number;
  shape: 'sphere' | 'cube' | 'torus' | 'icosa' | 'octa' | 'cone';
};

function FloatingShape({ position, color, speed, shape }: ObjProps) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime() * speed;
    ref.current.rotation.x = t * 0.35;
    ref.current.rotation.y = t * 0.45;
    ref.current.position.y = position[1] + Math.sin(t * 0.7) * 0.4;
    ref.current.position.x = position[0] + Math.cos(t * 0.5) * 0.3;
  });
  const geom = useMemo(() => {
    switch (shape) {
      case 'sphere': return <sphereGeometry args={[0.6, 32, 32]} />;
      case 'cube':   return <boxGeometry args={[0.9, 0.9, 0.9]} />;
      case 'torus':  return <torusGeometry args={[0.55, 0.2, 16, 48]} />;
      case 'icosa':  return <icosahedronGeometry args={[0.7, 0]} />;
      case 'octa':   return <octahedronGeometry args={[0.75, 0]} />;
      case 'cone':   return <coneGeometry args={[0.6, 1.2, 24]} />;
    }
  }, [shape]);
  return (
    <mesh ref={ref} position={position}>
      {geom}
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.25}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function SHAPES_FOR(kind: SceneKind): ObjProps['shape'][] {
  switch (kind) {
    case 'music':       return ['torus', 'sphere', 'torus', 'sphere'];
    case 'data':        return ['cube', 'cube', 'octa', 'icosa'];
    case 'marketplace': return ['sphere', 'torus', 'sphere', 'torus'];
    case 'api':         return ['cube', 'octa', 'cube', 'octa'];
    case 'legal':       return ['cube', 'icosa', 'cube', 'cone'];
    case 'content':     return ['cube', 'sphere', 'octa', 'icosa'];
    case 'hr':          return ['sphere', 'sphere', 'torus', 'icosa'];
    default:            return ['icosa', 'octa', 'torus', 'sphere'];
  }
}

const POSITIONS: [number, number, number][] = [
  [-3.2, 1.5, -1],
  [3.0, -1.2, -0.5],
  [-2.2, -1.8, 0.5],
  [2.5, 2.0, -2],
];

export function Hero3DScene({ kind = 'default' }: { kind?: SceneKind }) {
  const colors = PALETTE[kind];
  const shapes = SHAPES_FOR(kind);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.4} color={colors[0]} />
        {POSITIONS.map((p, i) => (
          <FloatingShape
            key={i}
            position={p}
            color={colors[i % colors.length]}
            speed={0.3 + (i % 3) * 0.15}
            shape={shapes[i]}
          />
        ))}
      </Canvas>
    </div>
  );
}
