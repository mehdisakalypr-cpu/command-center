import { issueCsrfToken, CSRF_COOKIE } from '../lib/csrf'
import { cookies } from 'next/headers'

/** GET /api/auth-v2/csrf — issue a CSRF token (cookie + JSON). */
export function csrfHandler() {
  return async function GET(_req: Request): Promise<Response> {
    const { token, cookieValue } = issueCsrfToken()
    const jar = await cookies()
    jar.set(CSRF_COOKIE, cookieValue, {
      path: '/',
      sameSite: 'lax',
      secure: true,
      httpOnly: false,
      maxAge: 60 * 60,
    })
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
}
