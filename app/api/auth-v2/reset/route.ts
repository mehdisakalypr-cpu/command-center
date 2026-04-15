import { resetHandler } from '@/lib/auth-v2/routes/reset'
import { authV2Config } from '@/lib/auth-v2-config'
export const POST = resetHandler(authV2Config)
