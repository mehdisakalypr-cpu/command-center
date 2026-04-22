import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { LegalLayout } from '@/components/saas-landing/LegalLayout';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: `Terms — ${slug}`,
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
  const title = isFr ? 'Conditions d\'utilisation' : 'Terms of Service';

  return (
    <LegalLayout slug={slug} name={name} title={title} lang={lang}>
      <p>
        {isFr
          ? `${name} est actuellement en phase d'accès anticipé (waitlist). Ces conditions encadrent l'usage de la page et l'inscription.`
          : `${name} is currently in early-access (waitlist) mode. These terms govern the use of this page and the sign-up flow.`}
      </p>
      <h2 className="text-lg font-semibold text-neutral-100 mt-8">
        {isFr ? '1. Nature du service' : '1. Nature of the service'}
      </h2>
      <p>
        {isFr
          ? 'Cette page présente un produit en développement. Aucune obligation de fourniture, aucun engagement de date de lancement.'
          : 'This page presents a product under development. No supply obligation, no commitment on launch date.'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-100 mt-8">
        {isFr ? '2. Inscription à la liste d\'attente' : '2. Waitlist sign-up'}
      </h2>
      <p>
        {isFr
          ? `L'inscription est gratuite. Elle vous donne la priorité d'accès et des communications ponctuelles sur l'avancée. Vous pouvez vous désinscrire à tout moment (lien dans chaque email).`
          : 'Sign-up is free. It grants priority access and occasional updates. You may unsubscribe any time (link in every email).'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-100 mt-8">
        {isFr ? '3. Contenu et marques' : '3. Content and marks'}
      </h2>
      <p>
        {isFr
          ? `Le contenu de cette page (textes, visuels, structure) est protégé. Reproduction interdite sans autorisation.`
          : 'Page content (texts, visuals, structure) is protected. Reproduction without permission is prohibited.'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-100 mt-8">
        {isFr ? '4. Limitation de responsabilité' : '4. Limitation of liability'}
      </h2>
      <p>
        {isFr
          ? `Service fourni "en l'état" durant la phase d'accès anticipé, sans garantie de continuité. La responsabilité ne peut être engagée au-delà du montant réellement payé (pour l'instant 0 €).`
          : 'Service provided "as-is" during early access, without continuity guarantee. Liability cannot exceed the amount actually paid (currently $0).'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-100 mt-8">
        {isFr ? '5. Droit applicable' : '5. Governing law'}
      </h2>
      <p>
        {isFr
          ? 'Droit français pour les résidents UE. Juridiction compétente : tribunaux de Paris.'
          : 'French law for EU residents. Competent courts: Paris, France.'}
      </p>
      <h2 className="text-lg font-semibold text-neutral-100 mt-8">
        {isFr ? '6. Contact' : '6. Contact'}
      </h2>
      <p>
        {isFr ? 'Questions : ' : 'Questions: '}
        <a className="text-emerald-400" href="mailto:hello@gapup.io">hello@gapup.io</a>.
      </p>
    </LegalLayout>
  );
}
