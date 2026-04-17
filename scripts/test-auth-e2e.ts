/**
 * Command Center — E2E auth regression suite.
 *
 * Purpose:
 *  Catch the "chicken-and-egg middleware" class of bugs that broke login
 *  (middleware blocking /api/auth/login before the route could ever run)
 *  plus rate-limit, site_access isolation, and public page reachability.
 *
 * Run:
 *   TEST_BASE_URL=https://cc-dashboard.vercel.app \
 *   TEST_EMAIL=you@example.com \
 *   TEST_PASSWORD=correct-horse-battery-staple \
 *   npx tsx scripts/test-auth-e2e.ts
 *
 * Optional env:
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *     → when provided, we create + destroy a scoped test user (no site_access)
 *       to verify site isolation returns 403 `no_access`.
 *   SKIP_RATE_LIMIT=1
 *     → skips the 6× bad-password burst (useful when running against prod if
 *       you don't want to burn the real IP rate-limit bucket).
 *
 * Contract:
 *  - Uses native fetch only (no playwright/puppeteer).
 *  - Exit code 1 if any test fails.
 *  - 60s hard timeout per test.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BASE = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const TEST_EMAIL = process.env.TEST_EMAIL || ''
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SKIP_RL = process.env.SKIP_RATE_LIMIT === '1'
const AUTO_GRANT_EMAIL = 'mehdi.sakalypr@gmail.com'

type Result = { name: string; ok: boolean; info?: string }
const results: Result[] = []

function log(msg: string) {
  process.stdout.write(msg + '\n')
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now()
  try {
    await withTimeout(fn(), 60_000)
    const ms = Date.now() - start
    results.push({ name, ok: true, info: `${ms}ms` })
    log(`  \u2713 passed  — ${name} (${ms}ms)`)
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    results.push({ name, ok: false, info: err })
    log(`  \u2717 FAILED: ${name}\n      ${err}`)
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

function expect(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown; bodyText: string }> {
  const res = await fetch(url, init)
  const bodyText = await res.text()
  let body: unknown = null
  try { body = bodyText ? JSON.parse(bodyText) : null } catch { body = bodyText }
  return { status: res.status, body, bodyText }
}

function getErr(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const e = (body as Record<string, unknown>).error
    return typeof e === 'string' ? e : JSON.stringify(e)
  }
  return typeof body === 'string' ? body : JSON.stringify(body)
}

async function run() {
  log(`\n[auth-e2e] target = ${BASE}`)
  log(`[auth-e2e] test user = ${TEST_EMAIL || '(not set — login-flow tests will skip)'}`)
  log('')

  /* ──────────────────────────────────────────────────────────────
   * a) Public pages + API must NOT be blocked by the middleware
   * ────────────────────────────────────────────────────────────── */
  log('── a) middleware: public routes reachable without session')

  await test('GET /auth/login → 200', async () => {
    const r = await fetch(`${BASE}/auth/login`, { redirect: 'manual' })
    expect(r.status === 200, `expected 200, got ${r.status}`)
  })

  await test('GET /auth/forgot → 200', async () => {
    const r = await fetch(`${BASE}/auth/forgot`, { redirect: 'manual' })
    expect(r.status === 200, `expected 200, got ${r.status}`)
  })

  await test('GET / → 200 (home public)', async () => {
    const r = await fetch(`${BASE}/`, { redirect: 'manual' })
    expect(r.status === 200, `expected 200, got ${r.status}`)
  })

  await test('OPTIONS /api/auth/login → not 401 (middleware must pass-through)', async () => {
    const r = await fetch(`${BASE}/api/auth/login`, { method: 'OPTIONS' })
    // Route has no OPTIONS handler → Next returns 405. What matters is that
    // the middleware did NOT reject with 401 "Unauthorized" before the route.
    expect(r.status !== 401, `middleware blocked OPTIONS on /api/auth/login (401 Unauthorized) — chicken-and-egg bug`)
    expect([200, 204, 405].includes(r.status), `expected 200/204/405, got ${r.status}`)
  })

  await test('POST /api/auth/login w/ bad creds → 401 Invalid login credentials (NOT middleware Unauthorized)', async () => {
    const r = await fetchJson(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `e2e-nope-${Date.now()}@example.invalid`, password: 'wrong-password-x' }),
    })
    expect(r.status === 401 || r.status === 429, `expected 401 or 429, got ${r.status}: ${r.bodyText}`)
    if (r.status === 401) {
      const msg = getErr(r.body).toLowerCase()
      // The smoking gun for the bug: middleware returns { error: "Unauthorized" }.
      // Route returns { error: "Invalid login credentials" } (Supabase pass-through).
      expect(msg !== 'unauthorized', `got middleware 401 "Unauthorized" instead of route 401 — middleware is blocking /api/auth/login`)
    }
  })

  await test('GET /api/auth/check-access (no session) → 401 not_authenticated (NOT middleware Unauthorized)', async () => {
    const r = await fetchJson(`${BASE}/api/auth/check-access`)
    expect(r.status === 401, `expected 401, got ${r.status}: ${r.bodyText}`)
    const msg = getErr(r.body).toLowerCase()
    // Route returns { allowed: false, reason: 'not_authenticated' }. If the
    // middleware intercepts, we instead see { error: "Unauthorized" } — the
    // bug we are guarding against.
    const hasReason = typeof r.body === 'object' && r.body !== null && 'reason' in r.body && (r.body as Record<string, unknown>).reason === 'not_authenticated'
    expect(hasReason || msg.includes('not_authenticated'), `expected route-level "not_authenticated", got "${msg}" (middleware likely intercepting)`)
  })

  /* ──────────────────────────────────────────────────────────────
   * b) Login flow end-to-end
   * ────────────────────────────────────────────────────────────── */
  log('\n── b) login flow end-to-end')

  let accessToken = ''
  let refreshToken = ''

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    log('  [skip] TEST_EMAIL/TEST_PASSWORD not set — skipping happy-path login')
  } else {
    await test('POST /api/auth/login w/ bad password → 401', async () => {
      const r = await fetchJson(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: 'deliberately-wrong-0xDEAD' }),
      })
      // Can be 429 if previous tests warmed the rate-limit bucket — acceptable signal.
      expect(r.status === 401 || r.status === 429, `expected 401/429, got ${r.status}`)
    })

    await test('POST /api/auth/login w/ good creds → 200 + tokens', async () => {
      const r = await fetchJson(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      })
      if (r.status === 429) throw new Error(`rate-limited — run with SKIP_RATE_LIMIT=1 or wait 5min`)
      expect(r.status === 200, `expected 200, got ${r.status}: ${r.bodyText}`)
      const body = r.body as { access_token?: string; refresh_token?: string }
      expect(typeof body.access_token === 'string' && body.access_token.length > 20, 'missing access_token')
      expect(typeof body.refresh_token === 'string' && body.refresh_token.length > 5, 'missing refresh_token')
      accessToken = body.access_token!
      refreshToken = body.refresh_token!
    })

    await test('GET /api/auth/check-access w/ Bearer → 200 allowed=true', async () => {
      if (!accessToken) throw new Error('no access_token from previous test')
      const r = await fetchJson(`${BASE}/api/auth/check-access`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      expect(r.status === 200, `expected 200, got ${r.status}: ${r.bodyText}`)
      const allowed = (r.body as Record<string, unknown>)?.allowed
      expect(allowed === true, `expected allowed=true, got ${JSON.stringify(r.body)}`)
    })

    await test('GET /api/dashboard/metrics w/ Bearer → not 401', async () => {
      if (!accessToken) throw new Error('no access_token from previous test')
      const r = await fetch(`${BASE}/api/dashboard/metrics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      // Route may be 200 or 500 depending on infra data; what we check is that
      // the middleware + requireAuth did not 401 a validly authed Bearer.
      expect(r.status !== 401, `authed request got 401 — requireAuth not honoring Bearer?`)
      expect(r.status !== 403, `authed request got 403 — site_access regression?`)
    })
  }

  /* ──────────────────────────────────────────────────────────────
   * c) Rate-limit detection
   * ────────────────────────────────────────────────────────────── */
  log('\n── c) rate-limit detection')

  if (SKIP_RL) {
    log('  [skip] SKIP_RATE_LIMIT=1 — skipping burst test')
  } else {
    await test('6 consecutive bad-password attempts → at least one 429', async () => {
      const email = `e2e-rl-${Date.now()}@example.invalid`
      let sawLimit = false
      let statuses: number[] = []
      for (let i = 0; i < 6; i++) {
        const r = await fetch(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: `bad-${i}` }),
        })
        statuses.push(r.status)
        if (r.status === 429) sawLimit = true
      }
      expect(sawLimit, `expected 429 within 6 tries, got statuses=[${statuses.join(',')}] — login rate-limit not firing`)
    })
  }

  /* ──────────────────────────────────────────────────────────────
   * d) Password reset endpoint reachability
   * ────────────────────────────────────────────────────────────── */
  log('\n── d) password reset endpoint')

  await test('Supabase resetPasswordForEmail reachable (no CC route required)', async () => {
    if (!SUPABASE_URL) {
      // We still hit the page that ships the client — at minimum it must not 500.
      const r = await fetch(`${BASE}/auth/forgot`, { redirect: 'manual' })
      expect(r.status === 200, `expected 200 on /auth/forgot, got ${r.status}`)
      return
    }
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!anon) {
      log('    (no ANON key — only verified /auth/forgot renders)')
      return
    }
    const sb = createClient(SUPABASE_URL, anon, { auth: { persistSession: false } })
    const { error } = await sb.auth.resetPasswordForEmail(`e2e-reset-${Date.now()}@example.invalid`, {
      redirectTo: `${BASE}/auth/reset-password`,
    })
    // Supabase returns no error even for non-existent emails (anti-enumeration).
    expect(!error, `resetPasswordForEmail threw: ${error?.message}`)
  })

  /* ──────────────────────────────────────────────────────────────
   * e) Site access isolation
   * ────────────────────────────────────────────────────────────── */
  log('\n── e) site_access isolation')

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    log('  [skip] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — cannot create scoped test user')
  } else {
    const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const tmpEmail = `e2e-noaccess-${Date.now()}@test.invalid`
    const tmpPassword = `E2E_${Math.random().toString(36).slice(2)}_${Date.now()}`
    let tmpUserId = ''

    await test('scoped user without site_access → check-access 403 no_access', async () => {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: tmpEmail,
        password: tmpPassword,
        email_confirm: true,
      })
      if (createErr || !created?.user) throw new Error(`createUser failed: ${createErr?.message}`)
      tmpUserId = created.user.id

      try {
        const login = await fetchJson(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tmpEmail, password: tmpPassword }),
        })
        expect(login.status === 200, `login failed: ${login.status} ${login.bodyText}`)
        const token = (login.body as Record<string, unknown>)?.access_token as string | undefined
        expect(typeof token === 'string', 'no access_token')

        const check = await fetchJson(`${BASE}/api/auth/check-access`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        expect(check.status === 403, `expected 403, got ${check.status}: ${check.bodyText}`)
        const reason = (check.body as Record<string, unknown>)?.reason
        expect(reason === 'no_access', `expected reason=no_access, got ${JSON.stringify(check.body)}`)
      } finally {
        if (tmpUserId) {
          // Also wipe any site_access rows that tests may have accidentally bootstrapped.
          await admin.from('site_access').delete().eq('user_id', tmpUserId)
          await admin.auth.admin.deleteUser(tmpUserId)
        }
      }
    })

    if (TEST_EMAIL && TEST_EMAIL.toLowerCase() === AUTO_GRANT_EMAIL && accessToken) {
      await test('AUTO_GRANT owner email → check-access allowed=true', async () => {
        const r = await fetchJson(`${BASE}/api/auth/check-access`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        expect(r.status === 200, `expected 200, got ${r.status}: ${r.bodyText}`)
        expect((r.body as Record<string, unknown>)?.allowed === true, `expected allowed=true`)
      })
    } else {
      log(`  [info] skipping AUTO_GRANT check — TEST_EMAIL != ${AUTO_GRANT_EMAIL} or no access_token`)
    }
  }

  /* ────────────── report ────────────── */
  const passed = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  log('\n' + '═'.repeat(64))
  log(`[auth-e2e] ${passed} passed · ${failed} failed · ${results.length} total`)
  log('═'.repeat(64))
  if (failed > 0) {
    log('\nFailures:')
    for (const r of results.filter(x => !x.ok)) log(`  ✗ ${r.name}\n      ${r.info}`)
    process.exit(1)
  }
  process.exit(0)
}

run().catch(e => {
  log(`\n[auth-e2e] fatal: ${e instanceof Error ? e.stack : String(e)}`)
  process.exit(1)
})
