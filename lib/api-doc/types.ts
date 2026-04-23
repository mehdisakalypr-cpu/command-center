export type ApiType = 'openapi' | 'graphql' | 'grpc' | 'trpc'
export type ProjectTier = 'free' | 'pro' | 'team'
export type ProjectStatus = 'active' | 'generating' | 'error' | 'paused'
export type CodeLanguage = 'js' | 'ts' | 'py' | 'go' | 'rb' | 'curl' | 'rs' | 'java' | 'php'

export type Project = {
  id: string
  user_id: string | null
  slug: string
  name: string
  repo_url: string | null
  github_installation_id: number | null
  api_type: ApiType
  spec_url: string | null
  last_synced_at: string | null
  status: ProjectStatus
  tier: ProjectTier
  custom_domain: string | null
  branding_enabled: boolean | null
  created_at: string
  updated_at: string
}

export type Spec = {
  id: string
  project_id: string
  version: string
  spec_content: unknown
  parsed_ast: ParsedAST | null
  changelog_diff: unknown | null
  generated_at: string
}

export type GeneratedDoc = {
  id: string
  project_id: string
  spec_id: string
  format: 'html' | 'mdx' | 'json'
  content: string | null
  search_index: unknown | null
  deployed_url: string | null
  locale: string
  generated_at: string
  expires_at: string | null
}

export type CodeExample = {
  id: string
  spec_id: string
  endpoint_path: string
  http_method: string
  language: CodeLanguage
  code: string
  tested: boolean | null
  cost_eur: number | null
  created_at: string
}

export type EndpointParam = {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  required: boolean
  schema?: unknown
  description?: string
}

export type Endpoint = {
  path: string
  method: string
  operation_id: string | null
  summary: string | null
  description: string | null
  tags: string[]
  params: EndpointParam[]
  body_schema: unknown | null
  response_schemas: Record<string, unknown>
  security: unknown[]
}

export type ParsedAST = {
  format: 'openapi' | 'graphql' | 'grpc'
  info: { title: string; version: string; description?: string }
  servers: { url: string; description?: string }[]
  endpoints: Endpoint[]
  schemas: Record<string, unknown>
}
