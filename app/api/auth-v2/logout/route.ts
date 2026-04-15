import { logoutHandler } from '@/lib/auth-v2/routes/logout'
import { authV2Config } from '@/lib/auth-v2-config'
export const POST = logoutHandler(authV2Config)
