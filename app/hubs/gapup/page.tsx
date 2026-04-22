import Link from 'next/link';
import { listBusinesses } from '@/lib/businesses/server';
import { publicUrlForBusiness, type Business } from '@/lib/businesses/types';

export const revalidate = 300;

export const metadata = {
  title: 'Gapup — portfolio of SaaS businesses',
  description: 'A curated lineup of focused SaaS products built by a single sovereign operator.',
};

const SOURCE_ICON: Record<string, string> = {
  hisoka: '🃏',
  ftg: '🌍',
  ofa: '🎨',
  estate: '🏨',
  shiftdynamics: '⚡',
  gapup: '📮',
  manual: '📌',
};

export default async function GapupHub() {
  let businesses: Business[] = [];
  try {
    businesses = await listBusinesses({ onlyActive: true });
  } catch {
    businesses = [];
  }
  // Hide the gapup row itself (it's THIS hub, not a separate product).
  const visible = businesses.filter(b => b.slug !== 'gapup');

  return (
    <main style={{ minHeight: '100vh', background: '#040D1C', color: '#E8E0D0', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px 96px' }}>
        <header style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📮 gapup.io</div>
          <h1 style={{ fontSize: 36, margin: '0 0 12px', color: '#C9A84C', letterSpacing: '-.02em' }}>
            Portfolio of focused SaaS businesses
          </h1>
          <p style={{ fontSize: 16, color: '#9BA8B8', maxWidth: 640, lineHeight: 1.6 }}>
            A sovereign operator running a lineup of small, deliberate products.
            Each one picks a real gap, ships fast, and stays honest about what it does.
          </p>
        </header>

        <section>
          <div style={{ fontSize: 11, color: '#5A6A7A', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 16 }}>
            Active products
          </div>
          {visible.length === 0 ? (
            <div style={{ padding: 32, border: '1px dashed rgba(201,168,76,.2)', borderRadius: 12, color: '#7D8BA0' }}>
              No public products listed yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {visible.map(b => (
                <Link
                  key={b.id}
                  href={publicUrlForBusiness(b)}
                  style={{
                    display: 'block',
                    padding: 20,
                    background: 'rgba(201,168,76,.04)',
                    border: '1px solid rgba(201,168,76,.15)',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: '#E8E0D0',
                    transition: 'border-color .15s, transform .15s',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>
                    {SOURCE_ICON[b.source] ?? '🏷️'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: '#7D8BA0' }}>
                    {b.domain ?? `${b.slug}.gapup.io`}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid rgba(201,168,76,.1)', fontSize: 11, color: '#5A6A7A' }}>
          gapup.io · {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
