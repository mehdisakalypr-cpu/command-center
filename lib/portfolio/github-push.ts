/**
 * GitHub Contents API helper — PUT a single file into a repo, create or
 * replace, signed by the configured token (GH_PAT > GITHUB_TOKEN).
 *
 * Vercel-compatible: uses fetch only, no octokit/spawn.
 */

const GH_API = 'https://api.github.com'

function token(): string {
  const t = process.env.GH_PAT ?? process.env.GITHUB_TOKEN
  if (!t) throw new Error('GH_PAT or GITHUB_TOKEN must be set')
  return t
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${token()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'gapup-portfolio-builder',
  }
}

async function getFileSha(owner: string, repo: string, path: string, branch: string): Promise<string | null> {
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(url, { headers: ghHeaders() })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`github get ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as { sha?: string }
  return data.sha ?? null
}

export type PushResult = {
  url: string         // direct file URL on github
  htmlUrl: string     // html view
  commitSha: string
  created: boolean
}

export async function pushFile(opts: {
  owner: string
  repo: string
  branch: string
  path: string
  content: string
  message: string
  committerName?: string
  committerEmail?: string
}): Promise<PushResult> {
  const existing = await getFileSha(opts.owner, opts.repo, opts.path, opts.branch)

  const body: Record<string, unknown> = {
    message: opts.message,
    content: Buffer.from(opts.content, 'utf8').toString('base64'),
    branch: opts.branch,
    // Committer email MUST be a verified email on a GitHub user that's a
    // member of the linked Vercel team — otherwise Vercel's gitForkProtection
    // refuses the build with `readyStateReason: "GitHub could not associate
    // the committer with a GitHub user"`, no errorMessage, alwaysRefuseToBuild.
    // bot@gapup.io is not yet verified on mehdisakalypr-cpu so we sign as the
    // human owner. See feedback_vercel_deploy_hardening.md.
    committer: {
      name: opts.committerName ?? 'gapup-portfolio-bot',
      email: opts.committerEmail ?? 'mehdi.sakalypr@gmail.com',
    },
  }
  if (existing) body.sha = existing

  const url = `${GH_API}/repos/${opts.owner}/${opts.repo}/contents/${encodeURIComponent(opts.path)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`github put ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json() as {
    content?: { html_url?: string; download_url?: string }
    commit?: { sha?: string; html_url?: string }
  }
  return {
    url: data.content?.download_url ?? '',
    htmlUrl: data.content?.html_url ?? data.commit?.html_url ?? '',
    commitSha: data.commit?.sha ?? '',
    created: !existing,
  }
}
