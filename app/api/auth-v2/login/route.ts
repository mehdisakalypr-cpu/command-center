import { loginHandler } from '@/lib/auth-v2/routes/login'
import { authV2Config } from '@/lib/auth-v2-config'
export const POST = loginHandler(authV2Config)
