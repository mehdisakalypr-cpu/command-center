import { ImageResponse } from 'next/og';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const runtime = 'nodejs';
export const alt = 'SaaS landing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('name, landing_content')
    .eq('slug', slug)
    .maybeSingle();

  const content = data?.landing_content as LandingContent | null;
  const rawTitle = content?.hero_title ?? (data?.name as string | undefined) ?? slug;
  const rawTagline = content?.hero_tagline ?? '';
  const title = rawTitle.length > 80 ? rawTitle.slice(0, 77) + '…' : rawTitle;
  const tagline = rawTagline.length > 140 ? rawTagline.slice(0, 137) + '…' : rawTagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111 60%, #1a1a1a 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {title}
          </div>
          {tagline ? (
            <div style={{ fontSize: 28, color: '#a3a3a3', lineHeight: 1.4 }}>{tagline}</div>
          ) : (
            <div />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 18,
            color: '#737373',
          }}
        >
          <span>⚡ Early access</span>
          <span>gapup.io</span>
        </div>
      </div>
    ),
    size,
  );
}
