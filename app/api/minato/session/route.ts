/**
 * POST /api/minato/session
 * Body: { message: string, project?: 'ftg'|'ofa'|'estate'|'shift'|'cc' }
 * Crée une session Minato côté Anthropic et renvoie { session_id }.
 * Le client peut ensuite s'abonner à /api/minato/session/[id]/stream.
 */
import * as fs from 'fs'
import * as path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function loadConfig() {
  const p = path.join(process.cwd(), '.minato.json')
  if (!fs.existsSync(p)) throw new Error('.minato.json missing — run scripts/setup-minato-agent.ts')
  return JSON.parse(fs.readFileSync(p, 'utf8')) as { agent_id: string; environment_id: string }
}

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) return Response.json({ ok: false, error: 'ANTHROPIC_API_KEY missing' }, { status: 500 })

    const { message, project } = (await request.json()) as { message?: string; project?: string }
    if (!message) return Response.json({ ok: false, error: 'message required' }, { status: 400 })
    const { agent_id, environment_id } = loadConfig()

    const headers = {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01',
      'Content-Type': 'application/json',
    }

    // 1. Create session
    const sessionRes = await fetch('https://api.anthropic.com/v1/sessions', {
      method: 'POST', headers,
      body: JSON.stringify({ agent: agent_id, environment_id, title: `Minato ${project || 'ad-hoc'} ${new Date().toISOString()}` }),
    })
    const session = await sessionRes.json()
    if (!sessionRes.ok) {
      console.error('[minato/session] create failed', session)
      return Response.json({ ok: false, error: 'session create failed', detail: session }, { status: 500 })
    }

    // 2. Send initial message
    await fetch(`https://api.anthropic.com/v1/sessions/${session.id}/events`, {
      method: 'POST', headers,
      body: JSON.stringify({
        events: [{ type: 'user.message', content: [{ type: 'text', text: message }] }],
      }),
    })

    console.log(`[minato/session] created ${session.id} in ${Date.now() - t0}ms`)
    return Response.json({ ok: true, session_id: session.id, took_ms: Date.now() - t0 })
  } catch (e) {
    console.error('[minato/session] error', e)
    return Response.json({ ok: false, error: String(e), took_ms: Date.now() - t0 }, { status: 500 })
  }
}
