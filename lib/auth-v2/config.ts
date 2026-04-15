export type AuthV2Config = {
  appId: string
  loginRedirect: string
  resetEmailRedirectTo: string
  rateLimit?: { windowMs: number; max: number }
  idleTimeoutMs?: number
  minPasswordLength?: number
  supabaseEnv?: {
    url?: string
    anonKey?: string
    serviceRoleKey?: string
  }
}

export const DEFAULT_CONFIG: Partial<AuthV2Config> = {
  rateLimit: { windowMs: 15 * 60 * 1000, max: 5 },
  idleTimeoutMs: 30 * 60 * 1000,
  minPasswordLength: 12,
}

export function mergeConfig(cfg: AuthV2Config): Required<AuthV2Config> {
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    rateLimit: { ...DEFAULT_CONFIG.rateLimit!, ...cfg.rateLimit },
  } as Required<AuthV2Config>
}
