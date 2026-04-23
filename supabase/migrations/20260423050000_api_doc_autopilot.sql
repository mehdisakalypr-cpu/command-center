-- API Doc Autopilot (Hisoka #7) — core tables
CREATE TABLE IF NOT EXISTS api_doc_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  repo_url TEXT,
  github_installation_id BIGINT,
  api_type TEXT NOT NULL DEFAULT 'openapi' CHECK (api_type IN ('openapi','graphql','grpc','trpc')),
  spec_url TEXT,
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','generating','error','paused')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','team')),
  custom_domain TEXT,
  branding_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_doc_projects_user_idx ON api_doc_projects(user_id);

CREATE TABLE IF NOT EXISTS api_doc_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES api_doc_projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  spec_content JSONB NOT NULL,
  parsed_ast JSONB,
  changelog_diff JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE TABLE IF NOT EXISTS api_doc_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES api_doc_projects(id) ON DELETE CASCADE,
  spec_id UUID NOT NULL REFERENCES api_doc_specs(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'mdx' CHECK (format IN ('html','mdx','json')),
  content TEXT,
  search_index JSONB,
  deployed_url TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_doc_code_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id UUID NOT NULL REFERENCES api_doc_specs(id) ON DELETE CASCADE,
  endpoint_path TEXT NOT NULL,
  http_method TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('js','ts','py','go','rb','curl','rs','java','php')),
  code TEXT NOT NULL,
  tested BOOLEAN DEFAULT FALSE,
  cost_eur NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_doc_examples_spec_idx ON api_doc_code_examples(spec_id);

CREATE TABLE IF NOT EXISTS api_doc_sandbox_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES api_doc_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint_path TEXT NOT NULL,
  http_method TEXT NOT NULL,
  body JSONB,
  headers JSONB,
  response_code INTEGER,
  response_body JSONB,
  latency_ms INTEGER,
  cost_eur NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS api_doc_sandbox_project_idx ON api_doc_sandbox_requests(project_id, created_at DESC);

ALTER TABLE api_doc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_doc_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_doc_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_doc_code_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_doc_sandbox_requests ENABLE ROW LEVEL SECURITY;
