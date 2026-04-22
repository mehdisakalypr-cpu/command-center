import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { LegalLayout } from '@/components/saas-landing/LegalLayout';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `Privacy — ${slug}`,
    robots: { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('business_ideas')
    .select('slug, name, landing_content')
    .eq('slug', slug)
    .maybeSingle();

  const content = data?.landing_content as LandingContent | null;
  if (!data || !content) return notFound();

  const name = (data.name as string) ?? slug;
  const lang = content.lang ?? 'en';
  const isFr = lang === 'fr';

  const title = isFr ? 'Politique de confidentialité' : 'Privacy Policy';

  return (
    <LegalLayout slug={slug} name={name} title={title} lang={lang}>
      <p>
        {isFr
          ? `Ce site (${name}) est en phase d'accès anticipé. Nous collectons uniquement votre adresse email lorsque vous vous inscrivez à la liste d'attente, dans le seul but de vous contacter à propos du produit.`
          : `This site (${name}) is in early access. We only collect your email address when you sign up for the waitlist, solely for contacting you about the product.`}
      </p>
      <h2 className="text-lg font-semibold text-neutral-900 mt-8">
        {isFr ? '1. Données collectées' : '1. Data we collect'}
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{isFr ? 'Adresse email (saisie volontaire).' : 'Email address (you provide it).'}</li>
        <li>
          {isFr
            ? 'Empreinte IP anonymisée (SHA-256 avec sel journalier) pour limiter le spam.'
            : 'Anonymized IP fingerprint (SHA-256 with daily salt) for spam prevention.'}
        </li>
        <li>{isFr ? 'User-agent du navigateur.' : 'Browser user-agent.'}</li>
      </ul>
      <h2 className="text-lg font-semibold text-neutral-900 mt-8">
        {isFr ? '2. Ce que nous ne faisons pas' : '2. What we do not do'}
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{isFr ? 'Aucune revente de données.' : 'No data resale.'}</li>
        <li>{isFr ? 'Aucun tracker publicitaire tiers.' : 'No third-party ad trackers.'}</li>
        <li>{isFr ? 'Aucun cookie marketing.' : 'No marketing cookies.'}</li>
      </ul>
      <h2 className="text-lg font-semibold text-neutral-900 mt-8">
        {isFr ? '3. Sous-traitants' : '3. Processors'}
      </h2>
      <p>
        {isFr
          ? 'Vos données sont stockées chez Supabase (UE/US, RGPD-conforme). L\'infrastructure de rendu est hébergée par Vercel. Les emails sortants passent par Resend.'
          : 'Your data is stored at Supabase (EU/US, GDPR-compliant). Rendering infra is hosted by Vercel. Outgoing emails use Resend.'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-900 mt-8">
        {isFr ? '4. Vos droits (RGPD / CCPA)' : '4. Your rights (GDPR / CCPA)'}
      </h2>
      <p>
        {isFr
          ? `Vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos données en écrivant à `
          : 'You may request access, correction, or deletion of your data at any time by writing to '}
        <a className="text-emerald-400" href="mailto:hello@gapup.io">hello@gapup.io</a>. {isFr ? 'Réponse sous 7 jours.' : 'Response within 7 days.'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-900 mt-8">
        {isFr ? '5. Conservation' : '5. Retention'}
      </h2>
      <p>
        {isFr
          ? 'Les emails sont conservés jusqu\'au lancement produit, puis pendant 2 ans après le dernier contact, sauf demande de suppression.'
          : 'Emails are kept until product launch, then 2 years after last contact, unless deletion is requested.'}
      </p>
    </LegalLayout>
  );
}
