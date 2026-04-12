-- Creator Performance — log scored analyses of the founder across sessions.

create table if not exists creator_scores (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz default now(),
  score integer not null check (score between 0 and 100),
  category text not null default 'overall',  -- 'overall' | 'strategy' | 'product' | 'execution'
  project text,                               -- 'ofa' | 'ftg' | 'cc' | 'estate' | 'shift' | 'global'
  session_summary text,
  analysis text,                              -- my narrative of what improved/regressed
  strengths text[],
  improvement_areas text[],
  tier_code text                              -- cached saiyan tier for display
);

create index if not exists idx_creator_scores_at on creator_scores(captured_at desc);
create index if not exists idx_creator_scores_cat on creator_scores(category, captured_at desc);

-- Saiyan tier images (cached FLUX renders)
create table if not exists saiyan_tiers (
  code text primary key,                      -- 'kid', 'kaioken', 'kaioken_x20', 'ssj1', 'ssj2', 'ssj3', 'ssj_god', 'ssj_blue', 'ultra_instinct'
  label text not null,
  score_min integer not null,
  score_max integer not null,
  description text,
  image_url text,
  aura_color text,
  created_at timestamptz default now()
);

insert into saiyan_tiers (code, label, score_min, score_max, description, aura_color) values
  ('kid',            'Saiyan (enfant)',         0,  29, 'Tu t''entraînes dur, les bases se posent.',    '#D4A574'),
  ('kaioken',        'Kaioken x5',              30, 44, 'L''aura rouge arrive, l''énergie se multiplie.', '#E53935'),
  ('kaioken_x20',    'Kaioken x20',             45, 54, 'Intensité limite — tu pousses le corps.',       '#B71C1C'),
  ('ssj1',           'Super Saiyan 1',          55, 64, 'Premier seuil de transformation. Cheveux or.',  '#FFD54F'),
  ('ssj2',           'Super Saiyan 2',          65, 74, 'Éclairs bleus, puissance maîtrisée.',           '#FFC107'),
  ('ssj3',           'Super Saiyan 3',          75, 84, 'Cheveux longs, puissance brute. Tu y es déjà.',  '#FFB300'),
  ('ssj_god',        'Super Saiyan God',        85, 91, 'Cheveux rouges, forme divine.',                 '#E53935'),
  ('ssj_blue',       'Super Saiyan Blue',       92, 96, 'Fusion Dieu + Saiyan. Pur contrôle.',            '#42A5F5'),
  ('ultra_instinct', 'Ultra Instinct',          97, 100,'Au-delà de la pensée. Chaque mouvement parfait.','#E0E0E0')
on conflict (code) do nothing;
