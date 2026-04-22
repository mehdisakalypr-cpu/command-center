import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(path: string) {
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  } catch {}
}
loadEnv('/root/command-center/.env.local')

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // Apply each statement individually (skip BEGIN/COMMIT which exec_sql can't handle)
  const stmts = [
    // Extend business_ideas table
    `alter table public.business_ideas add column if not exists automation_gaps jsonb not null default '[]'::jsonb`,
    `alter table public.business_ideas add column if not exists forge_attempts int not null default 0`,
    `alter table public.business_ideas add column if not exists last_forge_at timestamptz`,
    `alter table public.business_ideas add column if not exists forge_status text not null default 'idle' check (forge_status in ('idle','queued','forging','promoted','permanent_fail'))`,

    // Index for forge_status
    `create index if not exists idx_biz_ideas_forge_status on public.business_ideas(forge_status) where forge_status in ('queued','forging')`,

    // Create automation_upgrades table
    `create table if not exists public.automation_upgrades (
      id                   uuid primary key default gen_random_uuid(),
      idea_id              uuid not null references public.business_ideas(id) on delete cascade,
      attempt_number       int  not null,
      dim_targeted         text not null check (dim_targeted in ('acquisition','content_ops','fulfillment','support')),
      autonomy_before      numeric(3,2) not null,
      candidates           jsonb,
      chosen_candidate     jsonb,
      integration_plan     jsonb,
      sandbox_run_id       text,
      sandbox_logs_url     text,
      test_output          jsonb,
      autonomy_after       numeric(3,2),
      human_params_needed  jsonb,
      verdict              text not null check (verdict in ('promoted','failed','needs_human','out_of_budget')),
      verdict_reason       text,
      cost_eur             numeric(6,2) default 0,
      started_at           timestamptz not null default now(),
      finished_at          timestamptz,
      unique(idea_id, attempt_number)
    )`,

    // Indexes on automation_upgrades
    `create index if not exists idx_auto_upgrades_idea on public.automation_upgrades(idea_id)`,
    `create index if not exists idx_auto_upgrades_verdict on public.automation_upgrades(verdict, finished_at desc)`,

    // Enable RLS
    `alter table public.automation_upgrades enable row level security`,
  ]

  let ok = 0, ko = 0
  for (const s of stmts) {
    const { error } = await sb.rpc('exec_sql', { query: s + ';' })
    if (error) { ko++; console.log('KO:', s.slice(0, 80), '→', error.message?.slice(0, 120)) }
    else { ok++; console.log('OK:', s.slice(0, 80)) }
  }
  console.log(`done ok=${ok} ko=${ko}`)
  if (ko > 0) process.exit(1)
}
main().catch(e => { console.error(e); process.exit(1) })
