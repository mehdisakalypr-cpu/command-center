import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import type { Scene, VideoRatio, VideoResolution } from './types'

export interface AssemblyInput {
  jobId: string
  scenes: Array<Scene & { media_url: string; voiceover_url: string; duration_s: number }>
  resolution: VideoResolution
  ratio: VideoRatio
  watermark: boolean
}

export interface AssemblyResult {
  output_url: string
  needs_ffmpeg: boolean
  duration_s: number
  file_size_bytes: number
}

const RES_MAP: Record<VideoResolution, { w: number; h: number }> = {
  '480p': { w: 854, h: 480 },
  '720p': { w: 1280, h: 720 },
  '1080p': { w: 1920, h: 1080 },
  '4k': { w: 3840, h: 2160 },
}

const BUCKET = 'video-assets'

async function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'])
    proc.on('error', () => resolve(false))
    proc.on('exit', (code) => resolve(code === 0))
  })
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`download ${url}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
}

export async function assembleVideo(input: AssemblyInput): Promise<AssemblyResult> {
  const { jobId, scenes, resolution, ratio, watermark } = input

  const hasFfmpeg = await checkFfmpeg()
  if (!hasFfmpeg) {
    console.warn('[video-gen/ffmpeg] ffmpeg absent — stub output')
    return {
      output_url: `stub://video/${jobId}`,
      needs_ffmpeg: true,
      duration_s: scenes.reduce((s, sc) => s + sc.duration_s, 0),
      file_size_bytes: 0,
    }
  }

  const { w, h } =
    ratio === '9:16'
      ? { w: RES_MAP[resolution].h, h: RES_MAP[resolution].w }
      : ratio === '1:1'
        ? { w: RES_MAP[resolution].h, h: RES_MAP[resolution].h }
        : RES_MAP[resolution]

  const workdir = await mkdtemp(join(tmpdir(), `vgen-${jobId}-`))

  try {
    const segments: string[] = []

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      const mediaPath = join(workdir, `media-${i}.bin`)
      const voicePath = join(workdir, `voice-${i}.mp3`)
      const segPath = join(workdir, `seg-${i}.mp4`)

      await download(scene.media_url, mediaPath)
      await download(scene.voiceover_url, voicePath)

      const wmFilter = watermark
        ? `,drawtext=text='Made with CC Video':fontcolor=white:fontsize=${Math.max(18, Math.round(h / 30))}:x=w-tw-24:y=h-th-24:box=1:boxcolor=black@0.4:boxborderw=6`
        : ''

      const vfChain = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black${wmFilter}`

      await runFfmpeg([
        '-y',
        '-loop', '1',
        '-i', mediaPath,
        '-i', voicePath,
        '-t', String(scene.duration_s),
        '-vf', vfChain,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        segPath,
      ])

      segments.push(segPath)
    }

    const concatListPath = join(workdir, 'concat.txt')
    await writeFile(
      concatListPath,
      segments.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'),
    )

    const outPath = join(workdir, 'output.mp4')
    await runFfmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      outPath,
    ])

    const buf = await readFile(outPath)
    const sb = createSupabaseAdmin()
    const dest = `output/${jobId}.mp4`
    const { error } = await sb.storage.from(BUCKET).upload(dest, buf, {
      contentType: 'video/mp4',
      upsert: true,
    })
    if (error) throw new Error(`Storage upload: ${error.message}`)

    const { data } = sb.storage.from(BUCKET).getPublicUrl(dest)

    return {
      output_url: data.publicUrl,
      needs_ffmpeg: false,
      duration_s: scenes.reduce((s, sc) => s + sc.duration_s, 0),
      file_size_bytes: buf.length,
    }
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {})
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
      if (stderr.length > 10_000) stderr = stderr.slice(-5_000)
    })
    proc.on('error', reject)
    proc.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`))
    })
  })
}
