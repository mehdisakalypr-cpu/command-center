import { ImageResponse } from 'next/og';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const runtime = 'nodejs';
export const alt = 'SaaS landing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('name, landing_content')
    .eq('slug', params.slug)
    .maybeSingle();

  const content = data?.landing_content as LandingContent | null;
  const title = content?.hero_title ?? (data?.name as string | undefined) ?? params.slug;
  const tagline = content?.hero_tagline ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'linear-gradient(135deg, #0a0a0a 0%, #111 60%, #1a1a1a 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', maxWidth: 1000 }}>
          {title.length > 80 ? title.slice(0, 77) + '…' : title}
        </div>
        {tagline && (
          <div style={{ fontSize: 28, color: '#a3a3a3', marginTop: 28, maxWidth: 1000, lineHeight: 1.4 }}>
            {tagline.length > 140 ? tagline.slice(0, 137) + '…' : tagline}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 80,
            right: 80,
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
