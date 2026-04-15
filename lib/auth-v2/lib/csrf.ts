import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = '__Host-csrf'
const HEADER = 'x-csrf-token'

function secret(): string {
  const s = process.env.AUTH_V2_CSRF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('AUTH_V2_CSRF_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set')
  return s.slice(0, 64)
}

export function issueCsrfToken(): { token: string; cookieValue: string } {
  const raw = randomBytes(24).toString('base64url')
  const sig = createHmac('sha256', secret()).update(raw).digest('base64url')
  const token = `${raw}.${sig}`
  return { token, cookieValue: token }
}

export function verifyCsrf(cookieValue: string | undefined, headerValue: string | null): boolean {
  if (!cookieValue || !headerValue) return false
  if (cookieValue !== headerValue) return false
  const [raw, sig] = cookieValue.split('.')
  if (!raw || !sig) return false
  const expected = createHmac('sha256', secret()).update(raw).digest('base64url')
  try {
    const a = Buffer.from(sig, 'base64url')
    const b = Buffer.from(expected, 'base64url')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export const CSRF_COOKIE = COOKIE
export const CSRF_HEADER = HEADER
