import { createSupabaseAdmin } from '../lib/supabase-server';
import { forgeOne } from '../lib/hisoka/aam/run';

(async () => {
  const admin = createSupabaseAdmin();
  const { data: ideas } = await admin.from('business_ideas')
    .select('id, name, autonomy_score').not('rank', 'is', null)
    .order('autonomy_score', { ascending: true }).limit(1);
  if (!ideas?.length) { console.error('no ranked idea'); process.exit(1); }
  const id = (ideas[0] as { id: string }).id;
  console.log('forging:', (ideas[0] as { name: string }).name, 'autonomy', (ideas[0] as { autonomy_score: number }).autonomy_score);

  const r = await forgeOne({ ideaId: id, admin });
  console.log('verdict:', r.verdict, 'reason:', r.verdict_reason);
  console.log('autonomy_before:', r.autonomy_before, 'after:', r.autonomy_after);
  console.log('cost:', `€${r.cost_eur.toFixed(3)}`);
  console.log('OK');
})();
