import yaml from 'js-yaml'
import type { Endpoint, EndpointParam, ParsedAST } from '../types'

type OpenAPIInfo = { title?: string; version?: string; description?: string }
type OpenAPIServer = { url?: string; description?: string }
type OpenAPIParam = {
  name?: string
  in?: string
  required?: boolean
  schema?: unknown
  description?: string
  $ref?: string
}
type OpenAPIRequestBody = {
  content?: Record<string, { schema?: unknown }>
  $ref?: string
}
type OpenAPIResponse = {
  description?: string
  content?: Record<string, { schema?: unknown }>
  $ref?: string
}
type OpenAPIOperation = {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: OpenAPIParam[]
  requestBody?: OpenAPIRequestBody
  responses?: Record<string, OpenAPIResponse>
  security?: unknown[]
}
type OpenAPIPathItem = {
  parameters?: OpenAPIParam[]
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  patch?: OpenAPIOperation
  delete?: OpenAPIOperation
  head?: OpenAPIOperation
  options?: OpenAPIOperation
  trace?: OpenAPIOperation
}
type OpenAPIDoc = {
  openapi?: string
  swagger?: string
  info?: OpenAPIInfo
  servers?: OpenAPIServer[]
  paths?: Record<string, OpenAPIPathItem>
  components?: {
    schemas?: Record<string, unknown>
    parameters?: Record<string, OpenAPIParam>
    requestBodies?: Record<string, OpenAPIRequestBody>
    responses?: Record<string, OpenAPIResponse>
  }
  security?: unknown[]
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const

function parseSpec(spec: string | object): OpenAPIDoc {
  if (typeof spec === 'object' && spec !== null) return spec as OpenAPIDoc
  const text = String(spec).trim()
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return JSON.parse(text) as OpenAPIDoc
    } catch (e) {
      throw new Error(`openapi: invalid JSON — ${(e as Error).message}`)
    }
  }
  try {
    return yaml.load(text) as OpenAPIDoc
  } catch (e) {
    throw new Error(`openapi: invalid YAML — ${(e as Error).message}`)
  }
}

function resolveRef<T>(doc: OpenAPIDoc, ref: string): T | null {
  if (!ref.startsWith('#/')) return null
  const parts = ref.slice(2).split('/')
  let cur: unknown = doc
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return null
    }
  }
  return cur as T
}

function normalizeParam(doc: OpenAPIDoc, raw: OpenAPIParam): EndpointParam | null {
  let p: OpenAPIParam | null = raw
  if (raw.$ref) p = resolveRef<OpenAPIParam>(doc, raw.$ref)
  if (!p || !p.name || !p.in) return null
  const allowed = ['query', 'path', 'header', 'cookie']
  if (!allowed.includes(p.in)) return null
  return {
    name: p.name,
    in: p.in as EndpointParam['in'],
    required: Boolean(p.required),
    schema: p.schema ?? null,
    description: p.description ?? '',
  }
}

function normalizeRequestBody(doc: OpenAPIDoc, body: OpenAPIRequestBody | undefined): unknown {
  if (!body) return null
  let b: OpenAPIRequestBody | null = body
  if (body.$ref) b = resolveRef<OpenAPIRequestBody>(doc, body.$ref)
  if (!b || !b.content) return null
  const json = b.content['application/json']
  if (json?.schema) return json.schema
  const firstKey = Object.keys(b.content)[0]
  return firstKey ? (b.content[firstKey].schema ?? null) : null
}

function normalizeResponses(
  doc: OpenAPIDoc,
  responses: Record<string, OpenAPIResponse> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!responses) return out
  for (const [code, raw] of Object.entries(responses)) {
    let r: OpenAPIResponse | null = raw
    if (raw.$ref) r = resolveRef<OpenAPIResponse>(doc, raw.$ref)
    if (!r) continue
    const json = r.content?.['application/json']
    if (json?.schema) out[code] = json.schema
    else if (r.content) {
      const firstKey = Object.keys(r.content)[0]
      if (firstKey) out[code] = r.content[firstKey].schema ?? null
    } else {
      out[code] = { description: r.description ?? '' }
    }
  }
  return out
}

export async function parseOpenAPI(spec: string | object): Promise<ParsedAST> {
  const doc = parseSpec(spec)
  if (!doc.openapi && !doc.swagger) {
    throw new Error('openapi: missing openapi/swagger field — not a valid OpenAPI/Swagger document')
  }

  const info = {
    title: doc.info?.title ?? 'Untitled API',
    version: doc.info?.version ?? '0.0.0',
    description: doc.info?.description ?? '',
  }

  const servers = (doc.servers ?? []).map(s => ({
    url: s.url ?? '',
    description: s.description,
  })).filter(s => s.url)

  const endpoints: Endpoint[] = []
  const paths = doc.paths ?? {}
  for (const [rawPath, item] of Object.entries(paths)) {
    if (!item || typeof item !== 'object') continue
    const pathLevelParams = (item.parameters ?? [])
      .map(p => normalizeParam(doc, p))
      .filter((p): p is EndpointParam => p !== null)

    for (const method of HTTP_METHODS) {
      const op = item[method]
      if (!op) continue
      const opParams = (op.parameters ?? [])
        .map(p => normalizeParam(doc, p))
        .filter((p): p is EndpointParam => p !== null)

      const mergedParams = [...pathLevelParams]
      for (const p of opParams) {
        const idx = mergedParams.findIndex(x => x.name === p.name && x.in === p.in)
        if (idx >= 0) mergedParams[idx] = p
        else mergedParams.push(p)
      }

      endpoints.push({
        path: rawPath,
        method: method.toUpperCase(),
        operation_id: op.operationId ?? null,
        summary: op.summary ?? null,
        description: op.description ?? null,
        tags: op.tags ?? [],
        params: mergedParams,
        body_schema: normalizeRequestBody(doc, op.requestBody),
        response_schemas: normalizeResponses(doc, op.responses),
        security: op.security ?? doc.security ?? [],
      })
    }
  }

  const schemas = doc.components?.schemas ?? {}

  return {
    format: 'openapi',
    info,
    servers,
    endpoints,
    schemas,
  }
}
