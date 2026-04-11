import { NextRequest, NextResponse } from 'next/server'
import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'

const REPOS = [
  { id: 'feel-the-gap', name: 'Feel The Gap', path: '/var/www/feel-the-gap', color: '#C9A84C', icon: '🌍' },
  { id: 'site-factory', name: 'ONE FOR ALL', path: '/var/www/site-factory', color: '#22C55E', icon: '🏭' },
  { id: 'the-estate', name: 'THE ESTATE', path: '/var/www/the-estate', color: '#60A5FA', icon: '🏨' },
  { id: 'command-center', name: 'Command Center', path: '/root/command-center', color: '#A78BFA', icon: '🎮' },
]

function runCypher(repo: string, query: string): any {
  try {
    const raw = execFileSync('gitnexus', ['cypher', '-r', repo, query], {
      timeout: 10000,
      encoding: 'utf8',
    })
    return JSON.parse(raw)
  } catch {
    return { error: 'query failed', markdown: '', row_count: 0 }
  }
}

function getMeta(repoPath: string): any {
  try {
    const raw = readFileSync(`${repoPath}/.gitnexus/meta.json`, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo')
  const query = req.nextUrl.searchParams.get('query')

  // If specific repo + query
  if (repo && query) {
    const result = runCypher(repo, query)
    return NextResponse.json(result)
  }

  // Default: return overview of all repos
  const overview = REPOS.map(r => {
    const meta = getMeta(r.path)

    const nodeTypes = runCypher(r.id, "MATCH (n) RETURN DISTINCT labels(n) AS type, count(*) AS cnt ORDER BY cnt DESC")
    const relTypes = runCypher(r.id, "MATCH (n)-[r:CodeRelation]->(m) RETURN DISTINCT r.type AS relType, count(*) AS cnt ORDER BY cnt DESC LIMIT 10")
    const topFiles = runCypher(r.id, "MATCH (f:File)-[r]->() RETURN f.path AS path, count(r) AS connections ORDER BY connections DESC LIMIT 10")
    const imports = runCypher(r.id, "MATCH (a:File)-[r:CodeRelation {type: 'IMPORTS'}]->(b:File) RETURN a.path AS source, b.path AS target LIMIT 100")
    const clusters = runCypher(r.id, "MATCH (c:Community) RETURN c.name AS name, c.size AS size ORDER BY c.size DESC LIMIT 20")
    const routes = runCypher(r.id, "MATCH (r:Route) RETURN r.path AS path, r.method AS method LIMIT 50")

    return { ...r, meta, nodeTypes, relTypes, topFiles, imports, clusters, routes }
  })

  return NextResponse.json({ repos: overview, generatedAt: new Date().toISOString() })
}
