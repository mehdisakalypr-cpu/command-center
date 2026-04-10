import { createClient } from "@supabase/supabase-js";
import { CMS_SITES } from "../lib/cms-collections";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);

async function seed() {
  let inserted = 0;
  let skipped = 0;

  for (const site of CMS_SITES) {
    for (const coll of site.collections) {
      for (let i = 0; i < coll.slots.length; i++) {
        const slot = coll.slots[i];
        const row = {
          site: site.key,
          collection: coll.key,
          slug: slot.slug,
          field_type: slot.field_type,
          value_en: slot.default_en,
          value_fr: slot.default_fr,
          metadata: {},
          order: i,
          published: true,
          updated_at: new Date().toISOString(),
        };

        const { error } = await sb
          .from("cms_content")
          .upsert(row, { onConflict: "site,collection,slug", ignoreDuplicates: true });

        if (error) {
          console.error(`  ERROR ${site.key}/${coll.key}/${slot.slug}: ${error.message}`);
        } else {
          inserted++;
        }
      }
    }
  }

  console.log(`Seed complete: ${inserted} upserted, ${skipped} skipped`);
}

seed().catch((e) => { console.error(e); process.exit(1); });
