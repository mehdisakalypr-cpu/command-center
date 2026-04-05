-- ============================================================
-- THE ESTATE — Schéma Supabase Phase 1
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. TABLE HOTELS ──────────────────────────────────────────
create table if not exists hotels (
  id            integer primary key,
  name          text not null,
  "group"       text,
  sub_brand     text,
  city          text,
  country       text,
  flag          text,
  lat           numeric,
  lng           numeric,
  category      text,
  stars         integer,
  rooms_owned   integer,
  rooms         jsonb default '[]',
  adr           numeric,
  revenue_monthly numeric,
  revenue_split numeric,
  availability  text default 'available',
  occupancy     numeric,
  image         text,
  gallery       jsonb default '[]',
  amenities     jsonb default '[]',
  total_value   numeric,
  nights_avail  integer default 0,
  nights_used   integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 2. TABLE VOUCHERS ────────────────────────────────────────
create table if not exists vouchers (
  id            text primary key,
  hotel_id      integer references hotels(id),
  hotel         text,
  city          text,
  room          text,
  room_type     text,
  guest         text,
  email         text,
  nights        integer,
  nights_used   integer default 0,
  expiry        date,
  status        text default 'active',
  created       date,
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 3. ROW LEVEL SECURITY ────────────────────────────────────
-- Pour l'instant : lecture publique (protégée par la gate du site)
-- À durcir quand auth Supabase sera en place (Phase 3)
alter table hotels enable row level security;
alter table vouchers enable row level security;

create policy "Lecture publique hotels" on hotels for select using (true);
create policy "Lecture publique vouchers" on vouchers for select using (true);
create policy "Ecriture authentifiée hotels" on hotels for all using (true) with check (true);
create policy "Ecriture authentifiée vouchers" on vouchers for all using (true) with check (true);

-- ── 4. TRIGGER updated_at ────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger hotels_updated_at before update on hotels
  for each row execute function update_updated_at();
create trigger vouchers_updated_at before update on vouchers
  for each row execute function update_updated_at();

-- ============================================================
-- SEED — Données initiales (8 hôtels + 6 vouchers)
-- ============================================================

insert into hotels (
  id, name, "group", sub_brand, city, country, flag,
  lat, lng, category, stars, rooms_owned, rooms,
  adr, revenue_monthly, revenue_split,
  availability, occupancy, image, gallery, amenities,
  total_value, nights_avail, nights_used
) values
(1,'Sofitel Le Faubourg','Accor','Sofitel','Paris','France','🇫🇷',48.870,2.321,'Palace',5,2,
 '[{"num":"715","floor":7,"type":"Suite Prestige","sqm":95,"adr":850},{"num":"716","floor":7,"type":"Suite Deluxe","sqm":80,"adr":780}]',
 815,42500,55,'available',78,
 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=85","caption":"Façade — Sofitel Le Faubourg"},{"url":"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85","caption":"Suite Prestige — Vue Paris"},{"url":"https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=85","caption":"Salle de bain — Marbre de Carrare"},{"url":"https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85","caption":"Restaurant gastronomique"}]',
 '["Spa Kos","Gastronomie","Bar Blossom","Concierge 24/7","Fitness"]',
 2800000,125,42),

(2,'Waldorf Astoria','Hilton','Waldorf Astoria','Dubai','UAE','🇦🇪',25.204,55.271,'Ultra-Luxe',5,3,
 '[{"num":"3201","floor":32,"type":"Suite Royale","sqm":220,"adr":2200},{"num":"3202","floor":32,"type":"Suite Panorama","sqm":180,"adr":1900},{"num":"2801","floor":28,"type":"Suite Deluxe","sqm":140,"adr":1500}]',
 1867,98000,60,'occupied',94,
 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=85","caption":"Waldorf Astoria Dubai — Façade"},{"url":"https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=85","caption":"Suite Royale — Vue Skyline"},{"url":"https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1200&q=85","caption":"Infinity Pool — Niveau 32"}]',
 '["Infinity Pool","Spa","5 Restaurants","Beach Club","Butler Privé"]',
 8400000,60,88),

(3,'Ritz-Carlton Central Park','Marriott','Ritz-Carlton','New York','USA','🇺🇸',40.764,-73.973,'Palace',5,1,
 '[{"num":"1510","floor":15,"type":"Suite Central Park","sqm":160,"adr":1800}]',
 1800,52000,55,'available',65,
 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1200&q=85","caption":"Ritz-Carlton — Vue Central Park"},{"url":"https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=85","caption":"Suite Central Park — Salon"}]',
 '["Spa RC","Club Lounge","Restaurant","Fitness Elite"]',
 3800000,145,28),

(4,'Four Seasons Resort','Four Seasons','Four Seasons','Bora Bora','Polynésie Fr.','🇵🇫',-16.500,-151.742,'Resort',5,4,
 '[{"num":"OW-12","floor":1,"type":"Villa Overwater","sqm":320,"adr":4200},{"num":"OW-13","floor":1,"type":"Villa Overwater","sqm":320,"adr":4200},{"num":"BV-05","floor":1,"type":"Villa Beach","sqm":280,"adr":3600},{"num":"BV-06","floor":1,"type":"Villa Beach Premium","sqm":350,"adr":3900}]',
 3975,142000,60,'partial',82,
 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1200&q=85","caption":"Four Seasons Bora Bora — Vue aérienne"},{"url":"https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1200&q=85","caption":"Villa Overwater — Terrasse privée"}]',
 '["Lagoon Privé","Spa 3000m²","4 Restaurants","Water Sports","Butler"]',
 12200000,80,64),

(5,'Park Hyatt','Hyatt','Park Hyatt','Tokyo','Japon','🇯🇵',35.687,139.694,'Urban Luxe',5,2,
 '[{"num":"4701","floor":47,"type":"Suite Fuji View","sqm":120,"adr":1100},{"num":"4802","floor":48,"type":"Suite Tokyo View","sqm":100,"adr":950}]',
 1025,48000,55,'available',71,
 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=85","caption":"Park Hyatt Tokyo — Vue sur la ville"},{"url":"https://images.unsplash.com/photo-1512007498020-dc26d2ace2c5?w=1200&q=85","caption":"Suite Fuji View — Salon panoramique"}]',
 '["Pool 47e étage","Spa","New York Bar","Restaurant","Fitness"]',
 2100000,110,52),

(6,'Mandarin Oriental','Mandarin Oriental','Mandarin Oriental','Londres','UK','🇬🇧',51.502,-0.161,'Palace',5,2,
 '[{"num":"801","floor":8,"type":"Suite Hyde Park","sqm":180,"adr":1800},{"num":"802","floor":8,"type":"Suite Garden","sqm":150,"adr":1500}]',
 1650,72000,58,'occupied',88,
 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=85","caption":"Mandarin Oriental London — Façade"}]',
 '["Spa Award Winning","Pool","Dinner by Heston","Bar","Concierge"]',
 5200000,72,76),

(7,'Raffles Le Royal Monceau','Accor','Raffles','Paris','France','🇫🇷',48.876,2.303,'Palace',5,1,
 '[{"num":"201","floor":2,"type":"Suite Prestige Jardin","sqm":200,"adr":2200}]',
 2200,56000,55,'available',60,
 'https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=1200&q=85","caption":"Raffles Le Royal Monceau — Lobby"}]',
 '["Spa My Blend","Piscine","Cinéma Privé","Carita","Art Gallery","Butler"]',
 4800000,160,22),

(8,'Conrad Rangali Island','Hilton','Conrad','Maldives','Maldives','🇲🇻',3.688,72.741,'Resort Overwater',5,3,
 '[{"num":"OW-01","floor":1,"type":"Ocean Villa","sqm":290,"adr":3500},{"num":"OW-02","floor":1,"type":"Two-Bedroom Ocean Villa","sqm":450,"adr":5200},{"num":"LA-01","floor":1,"type":"Lagoon Villa","sqm":250,"adr":2800}]',
 3833,134000,60,'partial',76,
 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80&auto=format&fit=crop',
 '[{"url":"https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=85","caption":"Conrad Maldives — Vue aérienne"}]',
 '["Restaurant Sous-Marin","Spa 2000m²","Plongée","Water Sports","Butler","Hydravion"]',
 11500000,90,58);

insert into vouchers (id,hotel_id,hotel,city,room,room_type,guest,email,nights,nights_used,expiry,status,created,note) values
('V001',4,'Four Seasons Resort','Bora Bora','OW-12','Villa Overwater','Alexandra Morel','a.morel@privateclient.com',7,2,'2026-12-31','active','2026-01-10','Séjour anniversaire'),
('V002',2,'Waldorf Astoria','Dubai','3201','Suite Royale','Pierre-Emmanuel Blanc','pe.blanc@family.office',5,0,'2026-06-30','active','2026-02-14','Voyage d''affaires'),
('V003',8,'Conrad Rangali','Maldives','OW-01','Ocean Villa','Isabelle Fontaine','i.fontaine@cpm.fr',10,10,'2026-03-15','used','2025-12-01','Lune de miel'),
('V004',6,'Mandarin Oriental','Londres','801','Suite Hyde Park','Thomas & Clara Duval','tduval@estate.co.uk',4,1,'2026-04-30','expiring','2026-01-20',''),
('V005',3,'Ritz-Carlton','New York','1510','Suite Central Park','Marc Delacroix','m.delacroix@mfo.com',3,0,'2026-09-30','active','2026-03-01',''),
('V006',7,'Raffles Le Royal Monceau','Paris','201','Suite Prestige Jardin','Famille Bertrand','famille.bertrand@vip.fr',6,3,'2026-11-30','active','2026-02-05','Acces spa My Blend inclus');
