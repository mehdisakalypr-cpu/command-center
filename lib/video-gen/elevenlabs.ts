import { createSupabaseAdmin } from '@/lib/supabase-server'

export interface VoiceInput {
  text: string
  language: string
  jobId: string
  seq: number
}

export interface VoiceResult {
  url: string
  is_stub: boolean
  chars: number
  estimated_cost_usd: number
}

const VOICE_BY_LANG: Record<string, string> = {
  fr: 'ThT5KcBeYPX3keUQqHPh',
  en: '21m00Tcm4TlvDq8ikWAM',
  es: 'VR6AewLTigWG4xSOukaG',
  de: 'TxGEqnHWrfWFTfGW9XjX',
  it: 'IKne3meq5aSn9XLyUdCD',
  pt: 'CYw3kZ02Hs0563khs1Fj',
}

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'
const MODEL_ID = 'eleven_multilingual_v2'
const BUCKET = 'video-assets'

export async function synthesizeVoice(input: VoiceInput): Promise<VoiceResult> {
  const { text, language, jobId, seq } = input
  const chars = text.length
  const estimated_cost_usd = chars * 0.00015
  const path = `voice/${jobId}/scene-${seq}.mp3`

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.warn('[video-gen/elevenlabs] ELEVENLABS_API_KEY absent — stub')
    return { url: `stub://voice/${jobId}/scene-${seq}`, is_stub: true, chars, estimated_cost_usd: 0 }
  }

  const voiceId = VOICE_BY_LANG[language] ?? DEFAULT_VOICE

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': 'application/json',
        accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`)
  }

  const buf = Buffer.from(await res.arrayBuffer())

  const sb = createSupabaseAdmin()
  const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(`Storage upload: ${error.message}`)

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: data.publicUrl,
    is_stub: false,
    chars,
    estimated_cost_usd,
  }
}
