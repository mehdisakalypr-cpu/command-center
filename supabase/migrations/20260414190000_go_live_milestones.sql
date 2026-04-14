-- 4 jalons humains qui démarrent la course (pas d'encaissement avant les 4).
create table if not exists go_live_milestones (
  id              text primary key,
  label           text not null,
  description     text,
  blocker_for     text[] not null default '{}',
  eta_days        integer,
  status          text not null default 'not_started' check (status in ('not_started','in_progress','blocked','done')),
  started_at      timestamptz,
  done_at         timestamptz,
  notes           text,
  template_path   text,
  external_link   text,
  contact_info    text
);

insert into go_live_milestones (id, label, description, blocker_for, eta_days, template_path, external_link, contact_info) values
  ('llc_order', 'Commander la LLC Wyoming',
    'Commander via Wyoming Registered Agent LLC — package formation $99 + state $100 + EIN $50.',
    array['ein','dba','mercury','stripe_live'], 14,
    '/root/llc-setup/articles/articles-of-organization.md',
    'https://www.wyomingregisteredagent.com/wyoming-llc-package', 'support@wyomingregisteredagent.com'),

  ('operating_agreement', 'Signer l''Operating Agreement',
    'Single-member, member-managed. Template prêt à personnaliser (nom légal, adresse, capital $100).',
    array['mercury','llc_legitimacy'], 0,
    '/root/llc-setup/operating-agreement/operating-agreement-single-member.md',
    null, null),

  ('ss4_fax', 'Faxer SS-4 à l''IRS',
    'Demande EIN par fax (+1-855-641-6935 ou +1-304-707-9471 hors US). Valeurs exactes dans le template. Délai IRS : 4-6 semaines.',
    array['mercury','stripe_live','w8_bene'], 42,
    '/root/llc-setup/ein/ss-4-ein-application.md',
    'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
    'IRS International Desk +1-267-941-1099 (7h-22h ET)'),

  ('cpa_engagement', 'Engager James Baker CPA',
    'Envoyer l''email d''engagement letter pour Form 5472 + pro-forma 1120. Flat fee $400-$600. Pénalité si raté : $25 000.',
    array['form_5472','tax_compliance'], 7,
    '/root/llc-setup/accounting/cpa-engagement-template.md',
    'https://jamesbakercpa.com', 'hello@jamesbakercpa.com')
on conflict (id) do update set
  description = excluded.description,
  eta_days = excluded.eta_days,
  template_path = excluded.template_path,
  external_link = excluded.external_link,
  contact_info = excluded.contact_info;
