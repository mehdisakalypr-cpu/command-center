import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { PageShell } from '@/components/saas-landing/PageShell';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 3600;
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Pricing — ${slug}` };
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

  const tiers = [
    {
      name: isFr ? 'Early access' : 'Early access',
      price: isFr ? 'Gratuit' : 'Free',
      period: isFr ? 'pendant la phase preview' : 'during preview',
      cta: isFr ? 'Rejoindre la waitlist' : 'Join the waitlist',
      features: [
        isFr ? 'Accès prioritaire au produit' : 'Priority access to the product',
        isFr ? 'Communication directe avec le fondateur' : 'Direct line to the founder',
        isFr ? 'Influence sur la roadmap' : 'Influence on the roadmap',
        isFr ? 'Tarif lifetime garanti après lancement' : 'Lifetime locked pricing after launch',
      ],
      highlight: true,
    },
    {
      name: isFr ? 'Launch tier' : 'Launch tier',
      price: isFr ? 'Bientôt' : 'Soon',
      period: isFr ? 'détails annoncés au lancement' : 'details at launch',
      cta: isFr ? 'Être prévenu' : 'Get notified',
      features: [
        isFr ? 'Plan mensuel ou annuel (-20%)' : 'Monthly or annual (-20%)',
        isFr ? 'Toutes les fonctionnalités' : 'All features',
        isFr ? 'Support prioritaire' : 'Priority support',
      ],
      highlight: false,
    },
    {
      name: isFr ? 'Entreprise' : 'Enterprise',
      price: isFr ? 'Sur devis' : 'Custom',
      period: isFr ? 'équipes et volumes' : 'teams & volumes',
      cta: isFr ? 'Nous contacter' : 'Contact us',
      features: [
        isFr ? 'SLA dédié' : 'Dedicated SLA',
        isFr ? 'Onboarding personnalisé' : 'White-glove onboarding',
        isFr ? 'Facturation annuelle' : 'Annual billing',
      ],
      highlight: false,
    },
  ];

  return (
    <PageShell slug={slug} name={name} lang={content.lang}>
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          {isFr ? 'Tarifs simples' : 'Simple pricing'}
        </h1>
        <p className="mt-4 text-lg text-neutral-700 max-w-2xl mx-auto">
          {isFr
            ? "Accès anticipé gratuit pendant que nous validons l'offre. Les early-access gardent leur tarif à vie."
            : 'Early access is free while we validate the offer. Early-access users keep their price forever.'}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-xl p-8 flex flex-col ${t.highlight ? 'border-emerald-500/40 bg-emerald-500/5 border-2' : 'border-neutral-200 bg-white border'} `}
          >
            <div className="text-sm text-neutral-400">{t.name}</div>
            <div className="mt-3 text-3xl font-bold">{t.price}</div>
            <div className="text-xs text-neutral-400 mt-1">{t.period}</div>
            <ul className="mt-6 space-y-2 text-sm text-neutral-700 flex-1">
              {t.features.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href={t.highlight ? `/saas/${slug}` : `/saas/${slug}/contact`}
              className={`mt-8 rounded-lg text-center font-medium px-5 py-3 text-sm ${t.highlight ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400' : 'bg-neutral-200 text-neutral-900 hover:bg-neutral-700'}`}
            >
              {t.cta}
            </a>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12 text-center text-sm text-neutral-400">
        {isFr
          ? "Les prix finaux seront annoncés avant le lancement. Vous serez prévenu·e par email avec 30 jours d'avance."
          : 'Final pricing will be announced before launch. You will be notified by email 30 days in advance.'}
      </section>
    </PageShell>
  );
}
