import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { LandingView } from '@/components/saas-landing/LandingView';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('landing_content, name, tagline')
    .eq('slug', slug)
    .maybeSingle();

  const content = data?.landing_content as LandingContent | null;
  const title = content?.hero_title ?? (data?.name as string | undefined) ?? 'SaaS';
  const description = content?.hero_tagline ?? (data?.tagline as string | undefined);
  const url = `https://cc-dashboard.vercel.app/saas/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'gapup.io',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('slug, landing_content')
    .eq('slug', slug)
    .maybeSingle();

  const content = data?.landing_content as LandingContent | null;
  if (!data || !content) return notFound();

  return <LandingView slug={slug} content={content} />;
}
