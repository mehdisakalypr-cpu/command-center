/**
 * Video Gen (Hisoka #4) — shared types.
 * Mirrors the DB schema defined in supabase/migrations/20260423060000_video_gen.sql.
 */

export type VideoTier = 'free' | 'pro' | 'team'

export type VideoStatus =
  | 'pending'
  | 'scripting'
  | 'scene_gen'
  | 'voice_gen'
  | 'assembling'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type VideoResolution = '480p' | '720p' | '1080p' | '4k'
export type VideoRatio = '16:9' | '9:16' | '1:1'

export type TemplateCategory =
  | 'explainer'
  | 'product_demo'
  | 'testimonial'
  | 'ads'
  | 'educational'
  | 'story'

export type TemplateSceneSlot = {
  type: string
  duration: number
}

export type Template = {
  id: string
  slug: string
  name: string
  category: TemplateCategory
  structure: { scenes: TemplateSceneSlot[] }
  default_duration_s: number
  created_at: string
}

export type Scene = {
  seq: number
  prompt: string
  voiceover_text: string
  duration_s: number
  media_url?: string | null
  voiceover_url?: string | null
  provider?: string | null
}

export type VideoJob = {
  id: string
  user_id: string | null
  status: VideoStatus
  brief: string
  tone: string | null
  duration_s: number | null
  language: string
  resolution: VideoResolution
  ratio: VideoRatio
  scenes_json: { scenes: Scene[]; ftg_job_id?: string } | null
  cost_eur: number
  output_url: string | null
  error_message: string | null
  tier: VideoTier
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export type GenInput = {
  brief: string
  tone?: string
  duration_s: number
  language: string
  template_slug?: string
  resolution?: VideoResolution
  ratio?: VideoRatio
  tier?: VideoTier
}

export type ScenariseOutput = {
  scenes: Scene[]
  provider?: string
  cost_usd?: number
}

export type TierLimits = {
  videosPerMonth: number
  maxResolution: VideoResolution
  watermark: boolean
}

export const TIER_LIMITS: Record<VideoTier, TierLimits> = {
  free: { videosPerMonth: 1, maxResolution: '480p', watermark: true },
  pro: { videosPerMonth: 20, maxResolution: '720p', watermark: false },
  team: { videosPerMonth: 100, maxResolution: '1080p', watermark: false },
}
