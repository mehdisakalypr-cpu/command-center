import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import IdeaDetailClient from './IdeaDetailClient';

export const dynamic = 'force-dynamic';

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data: idea, error } = await admin
    .from('business_ideas')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !idea) notFound();

  return (
    <div style={{ padding: 24, color: '#E6EEF7', background: '#040D1C', minHeight: '100vh' }}>
      <Link
        href="/admin/hisoka"
        style={{ color: '#9BA8B8', fontSize: 12, textDecoration: 'none' }}
      >
        ← Retour au portfolio Hisoka
      </Link>
      <IdeaDetailClient initialIdea={idea} />
    </div>
  );
}
