import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { PageShell } from '@/components/saas-landing/PageShell';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 3600;
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Services — ${slug}` };
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
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          {isFr ? 'Nos services' : 'Our services'}
        </h1>
        <p className="mt-4 text-lg text-neutral-700 max-w-2xl">
          {isFr
            ? `Tout ce que ${name} fait pour vous, en détail. Accès anticipé actif — rejoignez la waitlist pour prioriser.`
            : `Everything ${name} does for you, in detail. Early access is live — join the waitlist to prioritize.`}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {content.features.map((f, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white  p-8 transition-colors hover:bg-neutral-50"
          >
            <div className="flex items-start gap-5">
              <div className="text-3xl flex-shrink-0" aria-hidden="true">{f.icon}</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{f.title}</h2>
                <p className="mt-3 text-neutral-700 leading-relaxed">{f.description}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold">
          {isFr ? 'Une question sur un service ?' : 'A question about a service?'}
        </h2>
        <p className="mt-3 text-neutral-400">
          {isFr
            ? 'Écrivez-nous — on répond en moins de 24h ouvrées.'
            : 'Write us — we reply within 24 business hours.'}
        </p>
        <a
          href={`/saas/${slug}/contact`}
          className="inline-block mt-6 rounded-lg bg-neutral-100 text-neutral-950 font-medium px-6 py-3 hover:bg-white"
        >
          {isFr ? 'Nous contacter' : 'Contact us'}
        </a>
      </section>
    </PageShell>
  );
}
