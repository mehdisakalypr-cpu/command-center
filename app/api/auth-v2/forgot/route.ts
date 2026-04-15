import { forgotHandler } from '@/lib/auth-v2/routes/forgot'
import { authV2Config } from '@/lib/auth-v2-config'
export const POST = forgotHandler(authV2Config)
