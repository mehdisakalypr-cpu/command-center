import { NextRequest, NextResponse } from 'next/server'
import { execFileSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REPOS = [
  { id: 'feel-the-gap', name: 'Feel The Gap', path: '/var/www/feel-the-gap', color: '#C9A84C', icon: '🌍' },
  { id: 'site-factory', name: 'ONE FOR ALL', path: '/var/www/site-factory', color: '#22C55E', icon: '🏭' },
  { id: 'the-estate', name: 'THE ESTATE', path: '/var/www/the-estate', color: '#60A5FA', icon: '🏨' },
  { id: 'command-center', name: 'Command Center', path: '/root/command-center', color: '#A78BFA', icon: '🎮' },
]

type CypherResult = { markdown: string; row_count: number; error?: string }

function hasGitnexusCli(): boolean {
  try {
    execFileSync('gitnexus', ['--version'], { timeout: 3000, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function runCypher(repo: string, query: string): CypherResult {
  try {
    const raw = execFileSync('gitnexus', ['cypher', '-r', repo, query], {
      timeout: 10000,
      encoding: 'utf8',
    })
    return JSON.parse(raw) as CypherResult
  } catch {
    return { error: 'query failed', markdown: '', row_count: 0 }
  }
}

function getMeta(repoPath: string) {
  try {
    return JSON.parse(readFileSync(`${repoPath}/.gitnexus/meta.json`, 'utf8'))
  } catch {
    return null
  }
}

function readSnapshot() {
  const p = path.join(process.cwd(), 'public', 'gitnexus-snapshot.json')
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo')
  const query = req.nextUrl.searchParams.get('query')

  if (repo && query) {
    if (!hasGitnexusCli()) {
      return NextResponse.json({ error: 'gitnexus CLI unavailable on this runtime', markdown: '', row_count: 0 })
    }
    return NextResponse.json(runCypher(repo, query))
  }

  // Prefer live data when gitnexus CLI is available (VPS / local dev).
  if (hasGitnexusCli()) {
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
    return NextResponse.json({ repos: overview, generatedAt: new Date().toISOString(), source: 'live' })
  }

  // Fallback to static snapshot (Vercel prod).
  const snap = readSnapshot()
  if (snap) return NextResponse.json({ ...snap, source: 'snapshot' })

  return NextResponse.json({ repos: [], generatedAt: null, source: 'none', error: 'no gitnexus CLI and no snapshot' }, { status: 200 })
}
