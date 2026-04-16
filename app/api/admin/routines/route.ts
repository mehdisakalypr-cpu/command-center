import { NextResponse } from 'next/server'
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const REGISTRY_PATH = '/root/routines/registry.json'
const LOG_DIR = '/root/routines/log'
const IS_VPS = process.env.DEPLOYMENT_ENV === 'vps'

export async function GET() {
  if (!IS_VPS) {
    return NextResponse.json({
      ok: true,
      isVps: false,
      message: 'Routines registry only available on VPS deployment.',
      registry: null,
      reports: [],
    })
  }

  let registry: any = null
  if (existsSync(REGISTRY_PATH)) {
    try { registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8')) }
    catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }) }
  }

  // List self-critique reports
  const reports: { week: string; path: string; size: number; mtime: string }[] = []
  if (existsSync(LOG_DIR)) {
    const entries = await readdir(LOG_DIR)
    for (const f of entries) {
      if (!f.startsWith('self-critique-') || !f.endsWith('.md')) continue
      const full = join(LOG_DIR, f)
      const s = await stat(full).catch(() => null)
      if (!s) continue
      reports.push({
        week: f.replace('self-critique-', '').replace('.md', ''),
        path: full,
        size: s.size,
        mtime: s.mtime.toISOString(),
      })
    }
    reports.sort((a, b) => b.week.localeCompare(a.week))
  }

  return NextResponse.json({ ok: true, isVps: true, registry, reports })
}
