-- PVP (Pre-prod vs Prod) checklist — track go-live readiness per project.
-- Idempotent.

create table if not exists pvp_items (
  id uuid primary key default gen_random_uuid(),
  project text not null default 'global',          -- 'global' | 'ofa' | 'ftg' | 'cc' | 'shift' | 'estate'
  domain text not null,                            -- 'Legal' | 'Finance' | 'Infra' | 'Payments' | 'Auth' | 'Compliance' | 'Ops'
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  verification text not null default 'manual' check (verification in ('manual', 'upload', 'test')),
  test_id text,                                    -- identifies a programmatic test when verification='test'
  document_url text,
  document_name text,
  notes text,
  order_index integer default 0,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  last_test_result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pvp_items_project_domain on pvp_items(project, domain, order_index);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists pvp_items_updated_at on pvp_items;
create trigger pvp_items_updated_at before update on pvp_items
  for each row execute function set_updated_at();

-- Seed initial checklist (skip if already seeded)
do $$
begin
  if not exists (select 1 from pvp_items limit 1) then
    insert into pvp_items (project, domain, title, description, verification, test_id, order_index) values
    -- Legal (global)
    ('global', 'Legal', 'LLC Wyoming — création', 'Créer la single-member LLC via Firstbase/doola/StartPack. Récupérer Articles of Organization.', 'upload', null, 10),
    ('global', 'Legal', 'EIN (IRS)', 'Obtenir le numéro EIN via Form SS-4. 4-6 semaines par fax pour non-résident, 1-2 sem via agent.', 'upload', null, 20),
    ('global', 'Legal', 'Operating Agreement', 'Rédiger et signer l Operating Agreement de la LLC (single-member). Garder PDF.', 'upload', null, 30),
    ('global', 'Legal', 'Agent enregistré Wyoming', 'S assurer que l agent enregistré est payé à l année (Firstbase/Northwest).', 'manual', null, 40),
    -- Finance (global)
    ('global', 'Finance', 'Compte Mercury USD', 'Ouvrir Mercury Business avec EIN + Operating Agreement. Obtenir RIB USD.', 'upload', null, 10),
    ('global', 'Finance', 'Déclaration FBAR française', 'Déclarer le compte Mercury sur formulaire 3916 dans la déclaration d impôt française si >10k$.', 'manual', null, 20),
    ('global', 'Finance', 'Comptable US non-résident', 'Sélectionner un comptable US spécialisé 5472/1120 pro forma (300-500$/an).', 'manual', null, 30),
    ('global', 'Finance', 'Form 5472 + 1120 pro forma', 'Déposer la déclaration IRS annuelle (obligatoire même à $0 de revenu US).', 'upload', null, 40),
    -- Payments (global)
    ('global', 'Payments', 'Stripe — activation live', 'Activer le compte Stripe en live avec EIN + Operating Agreement + Mercury RIB.', 'manual', null, 10),
    ('global', 'Payments', 'Stripe — clés live dans Vercel', 'Configurer STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY en mode Production Vercel.', 'test', 'stripe_live_keys', 20),
    ('global', 'Payments', 'Stripe — seed produits live', 'Exécuter scripts/stripe-seed.ts --live pour créer les produits côté live.', 'test', 'stripe_live_products', 30),
    ('global', 'Payments', 'Webhook Stripe live', 'Créer l endpoint webhook live et ajouter STRIPE_WEBHOOK_SECRET en production.', 'test', 'stripe_live_webhook', 40),
    ('global', 'Payments', 'Stripe Tax — pays d établissement', 'Renseigner US Wyoming comme Country of establishment dans Stripe Tax.', 'manual', null, 50),
    -- Compliance (global)
    ('global', 'Compliance', 'VAT OSS Non-Union', 'S enregistrer en OSS Non-Union (via Irlande typiquement) dès la 1ère vente à un consommateur EU.', 'upload', null, 10),
    ('global', 'Compliance', 'Canada GST/HST, UK VAT, AU GST, JP CT, IN GST', 'Stripe Tax collecte auto; déclarer les seuils si atteints par pays.', 'manual', null, 20),
    ('global', 'Compliance', 'US sales tax nexus', 'Suivre le seuil par état ($100k ou 200 tx). Stripe Tax alerte automatiquement.', 'test', 'sales_tax_nexus', 30),
    -- Infra (global)
    ('global', 'Infra', 'Domaines custom par projet', 'Acheter les domaines (Namecheap/OVH) et brancher sur Vercel pour chaque projet qui va prod.', 'manual', null, 10),
    ('global', 'Infra', 'SSL + HTTPS forcé', 'Vercel gère auto via Let s Encrypt. Vérifier HSTS actif.', 'test', 'https_enforce', 20),
    ('global', 'Infra', 'Monitoring erreurs prod', 'Sentry/Highlight branchés sur chaque projet prod.', 'manual', null, 30),
    ('global', 'Infra', 'Backups Supabase', 'Vérifier que PITR est activé sur Supabase Pro (si en Pro).', 'manual', null, 40),
    -- Auth (global)
    ('global', 'Auth', 'Brique auth homogène', 'WebAuthn + forgot/reset alignés entre tous les projets.', 'test', 'auth_bricks_aligned', 10),
    ('global', 'Auth', 'Emails prod via Resend', 'Domaine custom vérifié DNS Resend (SPF/DKIM/DMARC).', 'test', 'resend_domain', 20),
    -- OFA-specific
    ('ofa', 'Payments', 'OFA — passage sk_live_', 'Swap sk_test_/pk_test_/whsec_test par les clés live Stripe.', 'test', 'ofa_live_keys', 10),
    ('ofa', 'Ops', 'OFA — ToS + Mentions légales', 'Publier les CGV/CGU/Mentions avec l adresse LLC Wyoming.', 'upload', null, 20),
    ('ofa', 'Ops', 'OFA — Google Places API prod', 'Clé Places prod (sans restrictions dev).', 'manual', null, 30),
    ('ofa', 'Ops', 'OFA — Outreach Resend prod', 'Quota Pro Resend 50k/mo si volume atteint 3k/mo.', 'manual', null, 40),
    -- FTG-specific
    ('ftg', 'Compliance', 'FTG — agrément AMF/ORIAS (si EU investisseurs)', 'Si FTG traite argent d investisseurs EU, agrément ORIAS requis. Séparation LLC FR possible.', 'manual', null, 10),
    ('ftg', 'Legal', 'FTG — entité dédiée ?', 'Décider : rester single-LLC ou spin-off Wyoming LLC #2 pour isoler risque investisseur.', 'manual', null, 20);
  end if;
end $$;

-- RLS: only authenticated users with site_access to 'cc'
alter table pvp_items enable row level security;

drop policy if exists pvp_items_read on pvp_items;
create policy pvp_items_read on pvp_items for select using (
  auth.uid() in (select user_id from site_access where site_slug = 'cc')
);

drop policy if exists pvp_items_write on pvp_items;
create policy pvp_items_write on pvp_items for all using (
  auth.uid() in (select user_id from site_access where site_slug = 'cc')
) with check (
  auth.uid() in (select user_id from site_access where site_slug = 'cc')
);
