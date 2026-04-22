import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { PageShell } from '@/components/saas-landing/PageShell';
import { ContactForm } from '@/components/saas-landing/ContactForm';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 3600;
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Contact — ${slug}`, robots: { index: false } };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('name, landing_content')
    .eq('slug', slug)
    .maybeSingle();

  const content = data?.landing_content as LandingContent | null;
  if (!data || !content) return notFound();

  const name = (data.name as string) ?? slug;
  const isFr = content.lang === 'fr';

  return (
    <PageShell slug={slug} name={name} lang={content.lang}>
      <section className="mx-auto max-w-2xl px-6 pt-20 pb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          {isFr ? 'Contactez-nous' : 'Contact us'}
        </h1>
        <p className="mt-4 text-neutral-300">
          {isFr
            ? `Une question, une suggestion, un bug ? Écrivez-nous — on lit tout, on répond sous 24h ouvrées.`
            : 'Question, suggestion, bug? Write to us — we read everything, reply within 24 business hours.'}
        </p>
      </section>
      <section className="mx-auto max-w-2xl px-6 pb-16">
        <ContactForm slug={slug} lang={content.lang} />
      </section>
      <section className="mx-auto max-w-2xl px-6 pb-20 text-sm text-neutral-400">
        <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-6 backdrop-blur">
          <div className="font-semibold text-neutral-200">
            {isFr ? 'Contact direct' : 'Direct contact'}
          </div>
          <div className="mt-2">
            <a href="mailto:hello@gapup.io" className="text-emerald-400">hello@gapup.io</a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
