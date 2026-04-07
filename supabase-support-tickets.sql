-- Table support_tickets — partagée entre The Estate, Shift Dynamics, Feel The Gap
create table if not exists public.support_tickets (
  id          bigint generated always as identity primary key,
  ref         text        not null unique,                   -- ex: FTG-ABC123
  project     text        not null,                          -- 'the-estate' | 'shift-dynamics' | 'feel-the-gap'
  name        text,
  email       text        not null,
  subject     text,
  message     text        not null,
  user_id     uuid        references auth.users(id) on delete set null,
  status      text        not null default 'open',           -- 'open' | 'in_progress' | 'resolved' | 'closed'
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index pour les recherches fréquentes
create index if not exists support_tickets_project_idx on public.support_tickets(project);
create index if not exists support_tickets_status_idx  on public.support_tickets(status);
create index if not exists support_tickets_email_idx   on public.support_tickets(email);
create index if not exists support_tickets_created_idx on public.support_tickets(created_at desc);

-- RLS : lecture/écriture publique en insertion, lecture restreinte
alter table public.support_tickets enable row level security;

-- Tout le monde peut créer un ticket (via l'API qui valide)
create policy "insert_support_ticket"
  on public.support_tickets for insert
  with check (true);

-- Seul le service role peut lire (admin uniquement via API)
-- Les utilisateurs voient leurs propres tickets s'ils sont connectés
create policy "select_own_support_ticket"
  on public.support_tickets for select
  using (user_id = auth.uid());

-- Updated_at auto
create or replace function update_support_ticket_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function update_support_ticket_updated_at();

-- Commentaire
comment on table public.support_tickets is 'Tickets support — The Estate, Shift Dynamics, Feel The Gap';
