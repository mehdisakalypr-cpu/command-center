/**
 * Lance une session Minato et stream les events en live.
 *
 * Usage :
 *   npx tsx scripts/run-minato-session.ts "Lance Minato sur OFA"
 *
 * Prérequis :
 *   - .env.local avec ANTHROPIC_API_KEY
 *   - .minato.json avec agent_id + environment_id (issu de setup-minato-agent.ts)
 *   - Crédits Anthropic (consomme ~$1-3 pour une session 30 min)
 */
import * as fs from 'fs'
import * as path from 'path'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const CONFIG_PATH = path.join(process.cwd(), '.minato.json')

if (!ANTHROPIC_API_KEY) { console.error('❌ ANTHROPIC_API_KEY missing'); process.exit(1) }
if (!fs.existsSync(CONFIG_PATH)) { console.error('❌ .minato.json missing — run setup-minato-agent.ts first'); process.exit(1) }

const { agent_id, environment_id } = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
const userMessage = process.argv.slice(2).join(' ') || 'Lance Minato sur OFA : status check, puis KAIOKEN sur refresh-demos + recover-incomplete.'

const headers = {
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'managed-agents-2026-04-01',
  'Content-Type': 'application/json',
}

const BRIDGE_URL = process.env.MINATO_BRIDGE_URL || 'https://command-center01.duckdns.org/api/minato/run-tool'

async function api(urlPath: string, method: 'GET' | 'POST', body?: unknown) {
  const r = await fetch(`https://api.anthropic.com${urlPath}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const json = await r.json()
  if (!r.ok) { console.error(`❌ ${method} ${urlPath}:`, JSON.stringify(json, null, 2)); process.exit(1) }
  return json
}

async function executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: toolName, args }),
  })
  if (!r.ok) return { error: `bridge ${r.status}`, tool: toolName }
  return r.json()
}

async function main() {
  console.log(`⚡ Minato session · agent=${agent_id} env=${environment_id}\n`)
  console.log(`> ${userMessage}\n`)

  // 1. Create session
  const session = await api('/v1/sessions', 'POST', {
    agent: agent_id,
    environment_id,
    title: `Minato ${new Date().toISOString()}`,
  })
  console.log(`session: ${session.id}\n`)

  // 2. Open SSE stream FIRST, then send message
  const streamPromise = fetch(`https://api.anthropic.com/v1/sessions/${session.id}/events/stream`, { headers })

  // 3. Send user message
  await api(`/v1/sessions/${session.id}/events`, 'POST', {
    events: [{ type: 'user.message', content: [{ type: 'text', text: userMessage }] }],
  })

  // 4. Stream loop
  const stream = await streamPromise
  if (!stream.ok || !stream.body) { console.error('stream failed', stream.status); process.exit(1) }

  const reader = stream.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))
        await handleEvent(session.id, event)
        if (event.type === 'session.status_terminated') return
        if (event.type === 'session.status_idle' && event.stop_reason?.type !== 'requires_action') return
      } catch { /* partial */ }
    }
  }
}

async function handleEvent(sessionId: string, event: { type: string; [k: string]: unknown }) {
  switch (event.type) {
    case 'agent.message': {
      const content = (event.content as { type: string; text?: string }[]) || []
      for (const b of content) if (b.type === 'text') process.stdout.write(b.text || '')
      break
    }
    case 'agent.custom_tool_use': {
      const toolName = event.tool_name as string
      const args = (event.input as Record<string, unknown>) || {}
      console.log(`\n🔧 [${toolName}] ${JSON.stringify(args).slice(0, 120)}`)
      const result = await executeTool(toolName, args)
      console.log(`   → ${JSON.stringify(result).slice(0, 160)}`)
      await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}/events`, {
        method: 'POST', headers,
        body: JSON.stringify({
          events: [{
            type: 'user.custom_tool_result',
            custom_tool_use_id: event.id,
            content: [{ type: 'text', text: JSON.stringify(result) }],
          }],
        }),
      })
      break
    }
    case 'span.model_request_end': {
      const u = event.model_usage as { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number } | undefined
      if (u) process.stdout.write(`\n  [tokens in=${u.input_tokens} out=${u.output_tokens} cache=${u.cache_read_input_tokens ?? 0}]`)
      break
    }
    case 'session.status_idle':
      console.log(`\n\n✅ Session idle (${(event.stop_reason as { type?: string })?.type || 'end_turn'})`)
      break
    case 'session.status_terminated':
      console.log('\n🛑 Session terminated')
      break
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
