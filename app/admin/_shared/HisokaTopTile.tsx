import Link from 'next/link';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export default async function HisokaTopTile() {
  const admin = createSupabaseAdmin();
  const { data: top3 } = await admin
    .from('business_ideas')
    .select('slug, name, category, score, leverage_configs')
    .not('rank', 'is', null)
    .order('rank')
    .limit(3);

  return (
    <div style={{
      background: '#0A1A2E',
      borderRadius: 8,
      border: '1px solid rgba(201,168,76,.2)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 600 }}>
          🃏 Hisoka — top 3
        </div>
        <Link
          href="/admin/hisoka"
          style={{ color: '#9BA8B8', fontSize: 11, textDecoration: 'none' }}
        >
          Voir tout →
        </Link>
      </div>
      {(!top3 || top3.length === 0) && (
        <div style={{ color: '#9BA8B8', fontSize: 12 }}>
          Pas encore de chasse —{' '}
          <Link href="/admin/hisoka" style={{ color: '#C9A84C' }}>
            lance Hisoka
          </Link>
        </div>
      )}
      {top3 && top3.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
          {top3.map(idea => {
            const lc = (idea.leverage_configs as Array<{ label: string; leverage: number }> | null) ?? [];
            const boot = lc.find(c => c.label === 'bootstrap')?.leverage ?? 0;
            return (
              <li key={idea.slug} style={{ marginBottom: 6, color: '#E6EEF7' }}>
                <Link href="/admin/hisoka" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <strong>{idea.name}</strong>
                  <span style={{ color: '#9BA8B8', marginLeft: 6, fontSize: 10 }}>
                    [{idea.category}]
                  </span>
                  <span style={{ color: '#C9A84C', marginLeft: 6 }}>
                    {Number(boot).toFixed(1)}× · score {Number(idea.score).toFixed(1)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
