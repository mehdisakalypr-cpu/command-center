import type { AuthV2Config } from '@/lib/auth-v2'

export const authV2Config: AuthV2Config = {
  appId: 'cc',
  loginRedirect: '/admin/overview',
  resetEmailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cc-dashboard.vercel.app'}/auth-v2/reset`,
  minPasswordLength: 12,
  rateLimit: { windowMs: 15 * 60 * 1000, max: 5 },
  idleTimeoutMs: 30 * 60 * 1000,
}
