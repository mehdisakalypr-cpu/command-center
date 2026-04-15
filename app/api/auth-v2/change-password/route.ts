import { changePasswordHandler } from '@/lib/auth-v2/routes/change-password'
import { authV2Config } from '@/lib/auth-v2-config'
export const POST = changePasswordHandler(authV2Config)
