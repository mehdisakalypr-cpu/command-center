/**
 * GET /api/minato/session/[id]/stream
 * Proxy SSE Anthropic → client. Exécute aussi les custom tools via le bridge /api/minato/run-tool.
 */
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600

async function executeTool(tool: string, args: Record<string, unknown>, baseUrl: string) {
  try {
    const r = await fetch(`${baseUrl}/api/minato/run-tool`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args }),
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return new Response('ANTHROPIC_API_KEY missing', { status: 500 })

  const origin = new URL(request.url).origin
  const headers = {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'managed-agents-2026-04-01',
  }

  const upstream = await fetch(`https://api.anthropic.com/v1/sessions/${id}/events/stream`, { headers })
  if (!upstream.ok || !upstream.body) return new Response('upstream failed', { status: upstream.status })

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    const reader = upstream.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        buf += chunk
        await writer.write(encoder.encode(chunk))
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'agent.custom_tool_use') {
              const result = await executeTool(event.tool_name, event.input || {}, origin)
              await fetch(`https://api.anthropic.com/v1/sessions/${id}/events`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  events: [{
                    type: 'user.custom_tool_result',
                    custom_tool_use_id: event.id,
                    content: [{ type: 'text', text: JSON.stringify(result) }],
                  }],
                }),
              })
            }
            if (event.type === 'session.status_terminated') { reader.cancel(); break }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error('[minato/stream]', e)
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
