// Loads brick + agent registries from infra/*.json. Cached once per server process.
// Kept tiny — no external YAML parser.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type Brick = {
  id: string;
  name: string;
  projects_using: string[];
  files_pointer?: string;
  saves_dev_weeks: number;
  maturity?: 'prototype' | 'beta' | 'production';
  enables: string[];
  requires?: string[];
};

export type MinatoAgent = {
  id: string;
  icon: string;
  name: string;
  covers_autonomy_dims: Array<
    'acquisition' | 'content_ops' | 'fulfillment' | 'support' | 'billing' | 'compliance'
  >;
  status: 'prototype' | 'beta' | 'production';
  ops_cost_eur_mo?: number;
};

let bricksCache: Brick[] | null = null;
let agentsCache: MinatoAgent[] | null = null;

async function loadJson<T>(rel: string): Promise<T> {
  const abs = path.join(process.cwd(), rel);
  const raw = await fs.readFile(abs, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function getBricks(): Promise<Brick[]> {
  if (bricksCache) return bricksCache;
  const j = await loadJson<{ bricks: Brick[] }>('infra/brick-registry.json');
  bricksCache = j.bricks;
  return bricksCache;
}

export async function getMinatoAgents(): Promise<MinatoAgent[]> {
  if (agentsCache) return agentsCache;
  const j = await loadJson<{ minato_agents: MinatoAgent[] }>('infra/minato-roster.json');
  agentsCache = j.minato_agents;
  return agentsCache;
}

// Test-only: clear the module cache (call before re-reading files in tests/smoke).
export function __clearRegistryCache() {
  bricksCache = null;
  agentsCache = null;
}
