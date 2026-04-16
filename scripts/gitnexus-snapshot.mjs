#!/usr/bin/env node
// Generate public/gitnexus-snapshot.json from the VPS `gitnexus` CLI so the
// CodeMap works on Vercel (where the CLI is unavailable).
// Usage:  node scripts/gitnexus-snapshot.mjs

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const REPOS = [
  { id: 'feel-the-gap', name: 'Feel The Gap', path: '/var/www/feel-the-gap', color: '#C9A84C', icon: '🌍' },
  { id: 'site-factory', name: 'ONE FOR ALL', path: '/var/www/site-factory', color: '#22C55E', icon: '🏭' },
  { id: 'the-estate', name: 'THE ESTATE', path: '/var/www/the-estate', color: '#60A5FA', icon: '🏨' },
  { id: 'command-center', name: 'Command Center', path: '/root/command-center', color: '#A78BFA', icon: '🎮' },
]

function runCypher(repo, query) {
  try {
    return JSON.parse(execFileSync('gitnexus', ['cypher', '-r', repo, query], { timeout: 15000, encoding: 'utf8' }))
  } catch (e) {
    return { error: String(e.message || e), markdown: '', row_count: 0 }
  }
}
function getMeta(repoPath) {
  try { return JSON.parse(readFileSync(`${repoPath}/.gitnexus/meta.json`, 'utf8')) }
  catch { return null }
}

const overview = REPOS.map(r => ({
  ...r,
  meta: getMeta(r.path),
  nodeTypes: runCypher(r.id, 'MATCH (n) RETURN DISTINCT labels(n) AS type, count(*) AS cnt ORDER BY cnt DESC'),
  relTypes: runCypher(r.id, 'MATCH (n)-[r:CodeRelation]->(m) RETURN DISTINCT r.type AS relType, count(*) AS cnt ORDER BY cnt DESC LIMIT 10'),
  topFiles: runCypher(r.id, 'MATCH (f:File)-[r]->() RETURN f.filePath AS path, count(r) AS connections ORDER BY connections DESC LIMIT 15'),
  imports: runCypher(r.id, "MATCH (a:File)-[r:CodeRelation {type: 'IMPORTS'}]->(b:File) RETURN a.filePath AS source, b.filePath AS target LIMIT 200"),
  calls: runCypher(r.id, "MATCH (a:Function)-[r:CodeRelation {type: 'CALLS'}]->(b:Function) RETURN a.name AS source, b.name AS target LIMIT 150"),
  clusters: runCypher(r.id, 'MATCH (c:Community) RETURN c.name AS name, c.size AS size ORDER BY c.size DESC LIMIT 20'),
  routes: runCypher(r.id, 'MATCH (r:Route) RETURN r.path AS path, r.method AS method LIMIT 50'),
  functions: runCypher(r.id, 'MATCH (f:Function) RETURN f.name AS name, labels(f) AS type LIMIT 100'),
}))

const payload = { repos: overview, generatedAt: new Date().toISOString() }
const dir = path.join(process.cwd(), 'public')
mkdirSync(dir, { recursive: true })
writeFileSync(path.join(dir, 'gitnexus-snapshot.json'), JSON.stringify(payload))
console.log(`✓ snapshot written — ${overview.length} repos`)

// --push-db: also push to Supabase gitnexus_snapshots so /admin/code-map works on Vercel.
if (process.argv.includes('--push-db')) {
  const supaUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !supaKey) {
    console.error('✗ --push-db: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required')
    process.exit(1)
  }
  const body = JSON.stringify({ repos: overview, source: 'vps-cron' })
  const res = await fetch(`${supaUrl}/rest/v1/gitnexus_snapshots`, {
    method: 'POST',
    headers: {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body,
  })
  if (!res.ok) {
    console.error(`✗ push-db failed: HTTP ${res.status} — ${await res.text()}`)
    process.exit(1)
  }
  console.log(`✓ pushed to gitnexus_snapshots (${Math.round(body.length/1024)} KB)`)
}
