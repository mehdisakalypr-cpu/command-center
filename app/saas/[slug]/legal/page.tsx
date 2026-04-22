import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { LegalLayout } from '@/components/saas-landing/LegalLayout';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Legal notice — ${slug}`, robots: { index: false, follow: true } };
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
  const title = isFr ? 'Mentions légales' : 'Legal notice';

  return (
    <LegalLayout slug={slug} name={name} title={title} lang={lang}>
      <h2 className="text-lg font-semibold mt-2">
        {isFr ? '1. Éditeur du site' : '1. Site publisher'}
      </h2>
      <p>
        {isFr
          ? 'Ce site est édité par Mehdi Sakaly, en tant que personne physique, dans le cadre d\'un projet d\'accès anticipé (early access).'
          : 'This site is published by Mehdi Sakaly, as a natural person, within the framework of an early-access project.'}
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>{isFr ? 'Nom : ' : 'Name: '}<strong>Mehdi Sakaly</strong></li>
        <li>{isFr ? 'Contact : ' : 'Contact: '}<a className="text-emerald-600" href="mailto:hello@gapup.io">hello@gapup.io</a></li>
        <li>
          {isFr
            ? 'Adresse postale : communiquée sur demande écrite (hello@gapup.io), conformément à la LCEN pour une personne physique non-professionnelle.'
            : 'Postal address: provided upon written request (hello@gapup.io), in accordance with LCEN for a non-professional natural person.'}
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '2. Hébergeur' : '2. Hosting provider'}
      </h2>
      <p>
        {isFr ? 'L\'infrastructure de rendu est hébergée par :' : 'The rendering infrastructure is hosted by:'}
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, USA — {' '}
          <a className="text-emerald-600" href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">vercel.com/legal</a>
        </li>
        <li>
          {isFr ? 'Base de données : ' : 'Database: '}
          <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04 Singapore 318992 — {' '}
          <a className="text-emerald-600" href="https://supabase.com/privacy" target="_blank" rel="noreferrer">supabase.com/privacy</a>
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '3. Transition vers une structure corporate' : '3. Transition to a corporate entity'}
      </h2>
      <p>
        {isFr
          ? `À l'issue de la phase d'accès anticipé, les opérations de "${name}" seront transférées à une entité juridique dédiée, dont la constitution est prévue sous forme d'une Wyoming LLC (États-Unis). Toute évolution sera annoncée par email aux inscrit·e·s et publiée sur cette page.`
          : `At the end of the early-access phase, operations of "${name}" will be transferred to a dedicated legal entity, planned as a Wyoming LLC (United States). Any change will be announced by email to subscribers and posted on this page.`}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '4. Propriété intellectuelle' : '4. Intellectual property'}
      </h2>
      <p>
        {isFr
          ? `Le contenu de ce site (textes, visuels générés, structure, code) relève de la propriété intellectuelle de Mehdi Sakaly. Toute reproduction, représentation ou extraction non autorisée est interdite.`
          : 'Site content (texts, generated visuals, structure, code) is the intellectual property of Mehdi Sakaly. Unauthorized reproduction, representation, or extraction is prohibited.'}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '5. Signalement' : '5. Reporting'}
      </h2>
      <p>
        {isFr
          ? 'Pour signaler un contenu ou un problème : '
          : 'To report content or an issue: '}
        <a className="text-emerald-600" href="mailto:hello@gapup.io">hello@gapup.io</a>
        {isFr ? '. Traitement sous 7 jours.' : '. Handled within 7 days.'}
      </p>
    </LegalLayout>
  );
}
