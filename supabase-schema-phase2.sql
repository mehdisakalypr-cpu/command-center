-- ============================================================
-- THE ESTATE — Schéma Supabase Phase 2
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. TABLE GUEST_CARDS ─────────────────────────────────────
create table if not exists guest_cards (
  id          text primary key,
  guest       text,
  email       text,
  hotel_id    integer references hotels(id),
  hotel       text,
  tier        text,
  num         text,
  valid_from  date,
  valid_to    date,
  status      text default 'active',
  access      jsonb default '[]',
  stays       integer default 0,
  nights_used integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 2. TABLE ALERTS ──────────────────────────────────────────
create table if not exists alerts (
  id          integer primary key,
  type        text,
  priority    text,
  title       text,
  description text,
  hotel       text,
  alert_date  date,
  alert_time  text,
  read        boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 3. TABLE CONTRACTS ───────────────────────────────────────
create table if not exists contracts (
  id        serial primary key,
  name      text,
  date      text,
  expires   text,
  hotels    text,
  status    text,
  icon      text,
  created_at timestamptz default now()
);

-- ── 4. TABLE TRIPS ───────────────────────────────────────────
create table if not exists trips (
  id        text primary key,
  num       integer,
  hotel     text,
  city      text,
  flag      text,
  lat       numeric,
  lng       numeric,
  from_date date,
  to_date   date,
  nights    integer,
  voucher   text,
  color     text,
  created_at timestamptz default now()
);

-- ── 5. TABLE MEMBERS ─────────────────────────────────────────
create table if not exists members (
  id           text primary key,
  name         text,
  email        text,
  initials     text,
  role         text,
  color        text,
  shared_trips jsonb default '[]',
  created_at   timestamptz default now()
);

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────
alter table guest_cards enable row level security;
alter table alerts      enable row level security;
alter table contracts   enable row level security;
alter table trips       enable row level security;
alter table members     enable row level security;

create policy "Lecture publique guest_cards" on guest_cards for select using (true);
create policy "Ecriture guest_cards"         on guest_cards for all    using (true) with check (true);

create policy "Lecture publique alerts"      on alerts      for select using (true);
create policy "Ecriture alerts"              on alerts      for all    using (true) with check (true);

create policy "Lecture publique contracts"   on contracts   for select using (true);
create policy "Ecriture contracts"           on contracts   for all    using (true) with check (true);

create policy "Lecture publique trips"       on trips       for select using (true);
create policy "Ecriture trips"              on trips       for all    using (true) with check (true);

create policy "Lecture publique members"     on members     for select using (true);
create policy "Ecriture members"             on members     for all    using (true) with check (true);

-- ── 7. TRIGGERS updated_at ───────────────────────────────────
create trigger guest_cards_updated_at before update on guest_cards
  for each row execute function update_updated_at();
create trigger alerts_updated_at before update on alerts
  for each row execute function update_updated_at();

-- ── 8. SEED DATA ─────────────────────────────────────────────
insert into guest_cards (id, guest, email, hotel_id, hotel, tier, num, valid_from, valid_to, status, access, stays, nights_used) values
('GC-001','Alexandra Morel','a.morel@privateclient.com',4,'Four Seasons Bora Bora','Platinum','4521 .... .... 7812','2026-01-01','2026-12-31','active','["Spa Premium","Club Lounge","Early Check-in","Late Check-out"]',3,7),
('GC-002','Pierre-Emmanuel Blanc','pe.blanc@family.office',2,'Waldorf Astoria Dubai','Gold','4521 .... .... 3094','2026-02-01','2026-06-30','active','["Club Lounge","Pool Access","Room Upgrade"]',1,0),
('GC-003','Isabelle Fontaine','i.fontaine@cpm.fr',8,'Conrad Rangali Maldives','Black','4521 .... .... 9157','2026-01-01','2026-03-31','expired','["Full Access","Butler Service","Seaplane Transfer"]',2,10),
('GC-004','Thomas & Clara Duval','tduval@estate.co.uk',6,'Mandarin Oriental Londres','Platinum','4521 .... .... 5543','2026-01-15','2026-04-30','active','["Spa Premium","Dinner Credit 200 EUR","Suite Upgrade"]',1,1),
('GC-005','Marc Delacroix','m.delacroix@mfo.com',3,'Ritz-Carlton New York','Gold','4521 .... .... 2268','2026-03-01','2026-09-30','active','["Club Lounge","Fitness","Concierge Dedie"]',0,0),
('GC-006','Famille Bertrand','famille.bertrand@vip.fr',7,'Raffles Paris','Platinum','4521 .... .... 6631','2026-02-01','2026-11-30','pending','["Spa My Blend","Piscine","Cinema Prive","Butler"]',2,3);

insert into alerts (id, type, priority, title, description, hotel, alert_date, alert_time, read) values
(1,'expiry','high','Voucher V004 expire dans 30 jours','Le voucher attribue a Thomas & Clara Duval (Mandarin Oriental Londres) expire le 30 avril 2026. Il reste 3 nuitees non utilisees a planifier ou revendre avant cette date.','Mandarin Oriental Londres','2026-03-30','09:14',false),
(2,'revenue','medium','Reversement mensuel recu - Accor Group','Un virement de 98500 EUR a ete credite sur votre compte Dupont Family Office SAS. Correspond aux revenus nets de mars 2026 pour Sofitel Le Faubourg et Raffles Le Royal Monceau.','Sofitel + Raffles Paris','2026-03-28','14:30',false),
(3,'occupancy','low','Taux occupation exceptionnel - Waldorf Dubai','La Suite Royale N3201 enregistre un taux occupation de 94% ce mois, generant une surperformance de +12% par rapport a l ADR contractuel garanti.','Waldorf Astoria Dubai','2026-03-26','11:00',false),
(4,'contract','high','Contrat Marriott LRA - Revision a valider','Le contrat Marriott Last Room Availability arrive a expiration le 31/12/2026. Me. Laurent Dubois a transmis les nouvelles clauses tarifaires pour votre validation avant le 15 avril.','Ritz-Carlton New York','2026-03-25','16:45',false),
(5,'expiry','medium','3 vouchers arrivent a expiration dans 60 jours','V003 (Conrad Maldives), V004 (Mandarin Londres) et V006 (Raffles Paris) expirent dans les 60 prochains jours. Planifiez ou revendez ces nuitees pour eviter toute perte.','Multi-proprietes','2026-03-22','08:00',false),
(6,'revenue','low','ADR optimise - Four Seasons Bora Bora','L ADR moyen de vos villas overwater a progresse de +8.3% au T1 2026 suite a la revision tarifaire saisonniere du groupe Four Seasons. Revenus estimes en hausse de 11200 EUR/mois.','Four Seasons Bora Bora','2026-03-20','10:30',true),
(7,'security','high','Connexion depuis un appareil non reconnu','Une session a ete initiee depuis un appareil inconnu (New York, USA) le 19 mars a 22h14 UTC. Si vous n etes pas a l origine de cette connexion, revoquez immediatement la session.','Securite du Compte','2026-03-19','22:14',true),
(8,'occupancy','low','Disponibilite opportuniste - Conrad Maldives','Suite a des annulations de groupe, vos villas OW-01 et Lagoon LA-01 sont libres du 15 au 22 avril 2026. Opportunity de revente au groupe hotelier ou d attribution a des invites.','Conrad Rangali Maldives','2026-03-18','09:00',true);

insert into contracts (name, date, expires, hotels, status, icon) values
('Side Letter - Accor Group','01/01/2024','31/12/2026','Sofitel Paris, Raffles Paris','Actif','fa-file-contract'),
('Side Letter - Hilton Hotels','15/03/2024','15/03/2027','Waldorf Dubai, Conrad Maldives','Actif','fa-file-signature'),
('Protocole Four Seasons','10/06/2024','09/06/2027','Bora Bora Resort','Actif','fa-file-alt'),
('Contrat Marriott LRA','01/01/2025','31/12/2025','Ritz-Carlton New York','En revision','fa-file-excel'),
('Accord Hyatt Private','20/09/2024','19/09/2027','Park Hyatt Tokyo','Actif','fa-file-contract'),
('Side Letter - Mandarin','05/11/2024','04/11/2027','Mandarin Oriental London','Actif','fa-file-signature');

insert into trips (id, num, hotel, city, flag, lat, lng, from_date, to_date, nights, voucher, color) values
('T001',1,'Raffles Le Royal Monceau','Paris','🇫🇷',48.876,2.303,'2026-04-02','2026-04-08',6,'V006','#C41E3A'),
('T002',2,'Four Seasons Resort','Bora Bora','🇵🇫',-16.500,-151.742,'2026-04-15','2026-04-22',7,'V001','#1B4332'),
('T003',3,'Mandarin Oriental','Londres','🇬🇧',51.502,-0.161,'2026-05-08','2026-05-12',4,'V004','#6D4C41'),
('T004',4,'Ritz-Carlton Central Park','New York','🇺🇸',40.764,-73.973,'2026-06-20','2026-06-23',3,'V005','#8B1A1A'),
('T005',5,'Waldorf Astoria','Dubai','🇦🇪',25.204,55.271,'2026-09-10','2026-09-15',5,'V002','#1E3A6E');

insert into members (id, name, email, initials, role, color, shared_trips) values
('M001','Alexandra Morel','a.morel@privateclient.com','AM','Associee','#8B5CF6','["T002","T003"]'),
('M002','Pierre-Emmanuel Blanc','pe.blanc@family.office','PB','Conseiller','#0EA5E9','["T001"]'),
('M003','Thomas Duval','tduval@estate.co.uk','TD','Partenaire','#10B981','[]');
