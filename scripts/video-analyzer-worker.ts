#!/usr/bin/env -S npx tsx
/**
 * video-analyzer-worker — polls public.video_analyses for pending rows and processes them.
 *
 * Steps per job:
 *   1. yt-dlp: download audio (m4a) + metadata
 *   2. Groq Whisper API (whisper-large-v3-turbo): transcript + language detection
 *   3. Claude (Haiku): structured analysis (summary, hooks, actionable, optional custom angle)
 *
 * Run as PM2 process. Polls every 5s. Idempotent — uses status transitions to claim a row.
 */
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import { readFile, unlink, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL / SERVICE_ROLE missing')
if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing')
if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing')

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

type Job = {
  id: string
  url: string
  platform: string
  user_prompt: string | null
}

const POLL_MS = 5_000
const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // Groq limit
const MAX_DURATION_S = 60 * 30 // 30 min cap

function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

async function execCmd(cmd: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = opts.timeoutMs
      ? setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`timeout ${cmd}`)) }, opts.timeoutMs)
      : null
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      resolve({ stdout, stderr, code: code ?? -1 })
    })
    child.on('error', (e) => { if (timer) clearTimeout(timer); reject(e) })
  })
}

async function fetchMetadata(url: string): Promise<{ title: string | null; uploader: string | null; duration: number | null }> {
  const r = await execCmd('yt-dlp', ['--dump-json', '--no-playlist', '--no-warnings', url], { timeoutMs: 30_000 })
  if (r.code !== 0) throw new Error(`yt-dlp metadata: ${r.stderr.slice(0, 200)}`)
  const meta = JSON.parse(r.stdout)
  return {
    title: meta.title ?? null,
    uploader: meta.uploader ?? meta.channel ?? meta.creator ?? null,
    duration: typeof meta.duration === 'number' ? Math.round(meta.duration) : null,
  }
}

async function downloadAudio(url: string, outPath: string): Promise<void> {
  const r = await execCmd('yt-dlp', [
    '-x', '--audio-format', 'm4a', '--audio-quality', '5',
    '--no-playlist', '--no-warnings',
    '-o', outPath,
    url,
  ], { timeoutMs: 5 * 60_000 })
  if (r.code !== 0) throw new Error(`yt-dlp download: ${r.stderr.slice(0, 300)}`)
}

async function transcribeGroq(audioPath: string): Promise<{ text: string; language: string | null; cost_eur: number }> {
  const buf = await readFile(audioPath)
  if (buf.byteLength > MAX_AUDIO_BYTES) {
    throw new Error(`audio file too large: ${(buf.byteLength / 1024 / 1024).toFixed(1)}MB > 25MB Groq limit`)
  }
  const form = new FormData()
  form.append('file', new Blob([buf as BlobPart]), 'audio.m4a')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'verbose_json')

  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Groq Whisper ${r.status}: ${err.slice(0, 300)}`)
  }
  const data = await r.json() as { text: string; language?: string; duration?: number }
  // whisper-large-v3-turbo: $0.04/h ≈ €0.037/h
  const cost = data.duration ? (data.duration / 3600) * 0.037 : 0
  return { text: data.text ?? '', language: data.language ?? null, cost_eur: cost }
}

async function analyzeClaude(transcript: string, userPrompt: string | null, platform: string): Promise<{ analysis: Record<string, unknown>; cost_eur: number }> {
  const truncated = transcript.length > 30_000 ? transcript.slice(0, 30_000) + '...[truncated]' : transcript

  const sys = `Tu analyses des vidéos sociales (${platform}) pour un opérateur SaaS / B2B. Réponds en JSON strict avec ces champs :
{
  "summary": "résumé en 2-3 phrases dans la langue de la transcription",
  "key_points": ["3-6 points clés concrets, chacun ≤ 25 mots"],
  "hook": "la phrase d'accroche / hook utilisée par le créateur (texte exact ou paraphrase courte)",
  "cta": "appel à l'action explicite ou implicite, ou null",
  "sentiment": "ton dominant en 1-3 mots (ex: pédagogique, ironique, alarmiste, optimiste)",
  "audience": "audience cible probable en ≤ 10 mots",
  "actionable": ["2-4 leçons/idées que l'opérateur peut appliquer à son business — pas du commentaire générique"],
  "custom": ${userPrompt ? '"réponse détaillée à la question de l\'utilisateur ci-dessous (multi-paragraphes ok)"' : 'null'}
}
${userPrompt ? `\n\nQuestion de l'utilisateur (champ "custom") : ${userPrompt}` : ''}`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: sys,
      messages: [{ role: 'user', content: `Transcription :\n\n${truncated}` }],
    }),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Claude ${r.status}: ${err.slice(0, 300)}`)
  }
  const data = await r.json() as {
    content: { type: string; text: string }[]
    usage: { input_tokens: number; output_tokens: number }
  }
  const txt = data.content.find((c) => c.type === 'text')?.text ?? ''
  // Extract JSON (Claude sometimes wraps in markdown)
  const jsonMatch = txt.match(/```json\s*([\s\S]+?)\s*```/) ?? txt.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? jsonMatch[1] : txt
  let analysis: Record<string, unknown>
  try {
    analysis = JSON.parse(jsonStr)
  } catch {
    analysis = { summary: txt.slice(0, 500), key_points: [], parse_error: true }
  }
  // Haiku 4.5: $1/Mtok input, $5/Mtok output → EUR
  const cost = (data.usage.input_tokens * 1 + data.usage.output_tokens * 5) / 1_000_000 * 0.92
  return { analysis, cost_eur: cost }
}

async function processJob(job: Job): Promise<void> {
  const tmpAudio = join(tmpdir(), `vid-${job.id}-${randomUUID()}.m4a`)
  let totalCost = 0
  try {
    log(`📹 ${job.id} ${job.platform} ${job.url}`)

    await sb.from('video_analyses').update({ status: 'downloading', started_at: new Date().toISOString() }).eq('id', job.id)
    const meta = await fetchMetadata(job.url)
    if (meta.duration && meta.duration > MAX_DURATION_S) {
      throw new Error(`vidéo trop longue (${meta.duration}s > ${MAX_DURATION_S}s cap)`)
    }
    await sb.from('video_analyses').update({
      title: meta.title, uploader: meta.uploader, duration_s: meta.duration,
    }).eq('id', job.id)
    await downloadAudio(job.url, tmpAudio)
    const fstat = await stat(tmpAudio)
    log(`  audio ${(fstat.size / 1024 / 1024).toFixed(1)}MB`)

    await sb.from('video_analyses').update({ status: 'transcribing' }).eq('id', job.id)
    const t = await transcribeGroq(tmpAudio)
    totalCost += t.cost_eur
    log(`  transcript ${t.text.length} chars, lang=${t.language}, €${t.cost_eur.toFixed(5)}`)

    if (!t.text.trim()) throw new Error('transcription vide')

    await sb.from('video_analyses').update({
      status: 'analyzing', transcript: t.text, language: t.language,
    }).eq('id', job.id)
    const a = await analyzeClaude(t.text, job.user_prompt, job.platform)
    totalCost += a.cost_eur
    log(`  analysis ok, €${a.cost_eur.toFixed(5)}`)

    await sb.from('video_analyses').update({
      status: 'done',
      analysis: a.analysis,
      cost_eur: totalCost,
      finished_at: new Date().toISOString(),
    }).eq('id', job.id)
    log(`✅ ${job.id} done — total €${totalCost.toFixed(5)}`)
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500)
    log(`❌ ${job.id} failed: ${msg}`)
    await sb.from('video_analyses').update({
      status: 'failed', error: msg, cost_eur: totalCost || null,
      finished_at: new Date().toISOString(),
    }).eq('id', job.id)
  } finally {
    await unlink(tmpAudio).catch(() => undefined)
  }
}

async function claimNextJob(): Promise<Job | null> {
  // Re-claim stuck rows (>10 min in non-terminal status with no progress)
  const stuckBefore = new Date(Date.now() - 10 * 60_000).toISOString()
  await sb.from('video_analyses').update({ status: 'pending' })
    .in('status', ['downloading', 'transcribing', 'analyzing'])
    .lt('started_at', stuckBefore)

  const { data, error } = await sb
    .from('video_analyses')
    .select('id, url, platform, user_prompt')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) { log('claim error:', error.message); return null }
  return (data?.[0] as Job | undefined) ?? null
}

async function loop() {
  log('video-analyzer-worker started')
  while (true) {
    try {
      const job = await claimNextJob()
      if (job) {
        await processJob(job)
        continue // try next immediately
      }
    } catch (e) {
      log('loop error:', (e as Error).message)
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
  }
}

loop().catch((e) => {
  log('fatal:', e)
  process.exit(1)
})
