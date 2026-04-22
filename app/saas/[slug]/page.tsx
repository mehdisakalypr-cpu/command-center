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
  return {
    title: content?.hero_title ?? (data?.name as string | undefined) ?? 'SaaS',
    description: content?.hero_tagline ?? (data?.tagline as string | undefined) ?? undefined,
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
