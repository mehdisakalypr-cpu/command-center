-- image_assets.lead_id — permet de stocker images pré-scrapées par lead
-- avant que le site soit généré. Utilisé par scrape-client-images.ts et
-- repris par scoutImages() quand site est créé.

alter table image_assets
  add column if not exists lead_id uuid references commerce_leads(id) on delete set null;

create index if not exists image_assets_lead_idx
  on image_assets (lead_id, source) where lead_id is not null;
