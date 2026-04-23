-- Priorité de build manuelle pour le portfolio Hisoka.
-- Laissée nulle par défaut → l'ordre tombe sur le rank auto (score).
-- Plus la valeur est basse, plus la priorité est haute. 1 = top priority.
alter table business_ideas
  add column if not exists build_priority int;

create index if not exists business_ideas_build_priority_idx
  on business_ideas (build_priority asc nulls last);
