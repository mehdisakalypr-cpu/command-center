-- Log des comptes/clés API gratuits (noms et statut uniquement, JAMAIS la valeur secrète).
-- Les vraies clés restent dans les env vars du VPS/Vercel. Cette table sert de registre.

create table if not exists api_keys_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null,             -- 'huggingface' | 'cloudflare' | 'gemini' | 'groq' | 'together' | 'openrouter' | 'replicate' | 'fal'
  label text not null,                -- ex: "HF clé 1", "CF compte 3"
  status text not null default 'active', -- 'active' | 'rate_limited' | 'exhausted' | 'revoked'
  env_var_name text,                  -- ex: HUGGINGFACE_API_KEY_2  (nom de l'env var côté Vercel/VPS)
  purpose text,                       -- 'image_gen' | 'llm_text' | 'search' | 'scraping'
  daily_quota int,                    -- quota théorique (requêtes/jour) pour ce tier
  notes text,
  added_at timestamptz default now(),
  last_used_at timestamptz,
  last_429_at timestamptz
);

create index if not exists idx_api_keys_provider on api_keys_log(provider);
create index if not exists idx_api_keys_status on api_keys_log(status);

-- Scénarios de simulation de production (vitesse / leviers)
create table if not exists velocity_scenarios (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  target_sites int not null,          -- ex: 100000
  horizon_days int not null,          -- ex: 7
  task_settings jsonb not null,       -- { scouting: { time_per_unit_sec, parallelism, accounts_needed }, ... }
  providers_needed jsonb not null,    -- { huggingface: 10, cloudflare: 5, gemini: 8, ... }
  total_cost_eur numeric(10,2) default 0,
  created_at timestamptz default now()
);
