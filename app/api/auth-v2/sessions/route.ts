import { listSessionsHandler, revokeSessionsHandler } from '@/lib/auth-v2/routes/sessions'
import { authV2Config } from '@/lib/auth-v2-config'
export const GET = listSessionsHandler(authV2Config)
export const DELETE = revokeSessionsHandler(authV2Config)
