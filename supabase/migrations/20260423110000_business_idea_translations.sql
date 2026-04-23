-- Cache des traductions LLM des analyses portfolio Hisoka.
-- Sources: business_ideas (en par défaut) -> translated_fields jsonb par (idea_id, locale).
create table if not exists business_idea_translations (
  idea_id uuid not null references business_ideas(id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}$'),
  fields jsonb not null default '{}'::jsonb,
  translated_at timestamptz not null default now(),
  primary key (idea_id, locale)
);

create index if not exists business_idea_translations_locale_idx
  on business_idea_translations (locale);
create index if not exists business_idea_translations_translated_at_idx
  on business_idea_translations (translated_at desc);
