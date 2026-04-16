import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const LOG_DIR = '/root/routines/log'
const IS_VPS = process.env.DEPLOYMENT_ENV === 'vps'

export async function GET(req: Request) {
  if (!IS_VPS) return NextResponse.json({ ok: false, error: 'VPS only' }, { status: 503 })
  const url = new URL(req.url)
  const week = url.searchParams.get('week')
  if (!week || !/^\d{4}-W\d{2}$/.test(week)) {
    return NextResponse.json({ ok: false, error: 'invalid week format (YYYY-WNN)' }, { status: 400 })
  }
  const path = join(LOG_DIR, `self-critique-${week}.md`)
  if (!existsSync(path)) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
  const content = await readFile(path, 'utf8')
  return NextResponse.json({ ok: true, week, content })
}
