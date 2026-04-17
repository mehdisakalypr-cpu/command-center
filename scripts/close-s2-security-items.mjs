#!/usr/bin/env node
// One-shot: mark the two HIGH security_items fixed in S2.1 / S2.2 as done
// with commit hash + evidence paths. Safe to re-run (idempotent).
//
// Closes:
//  - "CC: pas de captcha sur login admin"        → commit a9ca8ff
//  - "Admin API routes: requireAuth() does not
//     enforce is_admin"                          → commit 0fc3c62
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const token = fs.readFileSync(path.join(os.homedir(), '.supabase/access-token'), 'utf8').trim()
const ref = 'jebuagyeapkltyjitosm'

async function run(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await r.text()
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${body}`)
  return JSON.parse(body)
}

const updates = [
  {
    keyword: 'captcha sur login admin',
    commit_hash: 'a9ca8ff',
    evidence_url: 'app/api/auth/login/route.ts#L28-L82',
    remediation: 'Cloudflare Turnstile widget (components/TurnstileWidget.tsx) + server-side siteverify dans /api/auth/login (feature-flag via TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY), double rate-limit IP+email via lib/rate-limit.ts. Failing captcha = 401 sans toucher Supabase.',
  },
  {
    keyword: 'requireAuth() does not enforce is_admin',
    commit_hash: '0fc3c62',
    evidence_url: 'lib/auth.ts#L61-L87',
    remediation: 'requireAuth() renforcé: 401 si pas de session, 403 si profile.is_admin !== true ET is_delegate_admin !== true. ADMIN_EMAIL env bypass conservé pour bootstrap. Même policy que requireAdmin() dans lib/supabase-server.ts. Toutes les routes /api/admin/*, bridge, voice, tts, stt, dashboard/* sont désormais admin-only.',
  },
]

for (const u of updates) {
  const sql = `
    update security_items
    set status='done',
        resolved_at=now(),
        commit_hash='${u.commit_hash}',
        evidence_url='${u.evidence_url.replace(/'/g, "''")}',
        remediation='${u.remediation.replace(/'/g, "''")}',
        owner='claude-minato'
    where site='cc'
      and severity='high'
      and title ilike '%${u.keyword.replace(/'/g, "''")}%'
    returning id, title, status, commit_hash;
  `
  const res = await run(sql)
  console.log(JSON.stringify(res, null, 2))
}

const counts = await run(`
  select severity, status, count(*)::int as n
  from security_items
  where site='cc'
  group by severity, status
  order by severity, status;
`)
console.log('\ncc counts after update:')
console.log(JSON.stringify(counts, null, 2))
