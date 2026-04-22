import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { PageShell } from '@/components/saas-landing/PageShell';
import { AccountView } from '@/components/saas-landing/AccountView';
import { readSession } from '../../../api/saas/[slug]/account/verify/route';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Account — ${slug}`, robots: { index: false } };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('slug, name, landing_content')
    .eq('slug', slug)
    .maybeSingle();
  const content = data?.landing_content as LandingContent | null;
  if (!data || !content) return notFound();
  const name = (data.name as string) ?? slug;

  const jar = await cookies();
  const session = readSession(jar.get('saas_session')?.value, slug);

  let client: {
    id: string;
    email: string;
    profile: Record<string, unknown>;
    current_offer: string | null;
    created_at: string;
  } | null = null;
  let events: Array<{ id: string; kind: string; payload: unknown; created_at: string }> = [];

  if (session) {
    const { data: c } = await admin
      .from('saas_clients')
      .select('id, email, profile, current_offer, created_at')
      .eq('id', session.clientId)
      .maybeSingle();
    if (c) {
      client = {
        id: c.id as string,
        email: c.email as string,
        profile: (c.profile as Record<string, unknown>) ?? {},
        current_offer: (c.current_offer as string | null) ?? null,
        created_at: c.created_at as string,
      };
      const { data: evs } = await admin
        .from('saas_client_events')
        .select('id, kind, payload, created_at')
        .eq('client_id', session.clientId)
        .order('created_at', { ascending: false })
        .limit(50);
      events = (evs ?? []).map((e) => ({
        id: e.id as string,
        kind: e.kind as string,
        payload: e.payload,
        created_at: e.created_at as string,
      }));
    }
  }

  return (
    <PageShell slug={slug} name={name} lang={content.lang}>
      <section className="mx-auto max-w-2xl px-6 pt-20 pb-20">
        <AccountView
          slug={slug}
          lang={content.lang}
          tokenFromUrl={token ?? null}
          initialSession={session ? { email: session.email } : null}
          initialClient={client}
          initialEvents={events}
        />
      </section>
    </PageShell>
  );
}
