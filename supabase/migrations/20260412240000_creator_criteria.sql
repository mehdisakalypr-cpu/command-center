alter table if exists creator_scores
  add column if not exists criteria jsonb default '[]';
