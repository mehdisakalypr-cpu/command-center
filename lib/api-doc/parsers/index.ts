import type { ApiType, ParsedAST } from '../types'
import { parseOpenAPI } from './openapi'

function detectType(spec: string | object): ApiType {
  if (typeof spec === 'object' && spec !== null) {
    const o = spec as Record<string, unknown>
    if (o.openapi || o.swagger) return 'openapi'
    if (typeof o.kind === 'string' && (o.kind as string).toLowerCase().includes('graphql')) return 'graphql'
  }
  if (typeof spec === 'string') {
    const t = spec.trim()
    if (/"openapi"\s*:/.test(t) || /"swagger"\s*:/.test(t)) return 'openapi'
    if (/^openapi\s*:/m.test(t) || /^swagger\s*:/m.test(t)) return 'openapi'
    if (/\btype\s+Query\b/.test(t) || /\btype\s+Mutation\b/.test(t)) return 'graphql'
    if (/^\s*syntax\s*=\s*"proto[23]"/m.test(t)) return 'grpc'
  }
  return 'openapi'
}

export async function parseSpec(
  spec: string | object,
  hint?: ApiType,
): Promise<ParsedAST> {
  const type = hint ?? detectType(spec)
  switch (type) {
    case 'openapi':
      return parseOpenAPI(spec)
    case 'graphql':
      throw new Error('graphql parser: not implemented yet')
    case 'grpc':
      throw new Error('grpc parser: not implemented yet')
    case 'trpc':
      throw new Error('trpc parser: not implemented yet')
    default:
      throw new Error(`unknown api_type: ${type}`)
  }
}

export { parseOpenAPI }
