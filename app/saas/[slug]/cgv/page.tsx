import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { LegalLayout } from '@/components/saas-landing/LegalLayout';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Sales terms — ${slug}`, robots: { index: false, follow: true } };
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
  const title = isFr ? 'Conditions Générales de Vente (CGV)' : 'Terms of Sale';

  return (
    <LegalLayout slug={slug} name={name} title={title} lang={lang}>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {isFr
          ? `Ces CGV sont publiées par anticipation. ${name} est actuellement en accès anticipé gratuit : aucune facturation n'est active. Les présentes entreront en vigueur au lancement commercial, après transition vers l'entité Wyoming LLC.`
          : `These terms are published in anticipation. ${name} is currently in free early access — no billing is active. They will enter into force at commercial launch, after transition to the Wyoming LLC entity.`}
      </div>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '1. Objet' : '1. Purpose'}
      </h2>
      <p>
        {isFr
          ? `Les présentes CGV régissent les ventes de services proposées par ${name} à ses clients professionnels et particuliers, ci-après le "Client", à compter du lancement commercial.`
          : `These Terms of Sale govern sales of services offered by ${name} to its professional and consumer clients, hereinafter the "Client", from commercial launch onwards.`}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '2. Identité du vendeur' : '2. Seller identity'}
      </h2>
      <p>
        {isFr
          ? 'Phase actuelle (accès anticipé) : Mehdi Sakaly, personne physique, contact : hello@gapup.io.'
          : 'Current phase (early access): Mehdi Sakaly, natural person, contact: hello@gapup.io.'}
      </p>
      <p>
        {isFr
          ? 'Phase commerciale : une Wyoming LLC (États-Unis) dont la raison sociale, l\'EIN et le registered agent seront publiés ici avant toute première vente.'
          : 'Commercial phase: a Wyoming LLC (United States) whose legal name, EIN, and registered agent will be posted here prior to any first sale.'}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '3. Offres, prix, taxes' : '3. Offers, prices, taxes'}
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{isFr ? 'Les tarifs actuels sont publiés sur ' : 'Current pricing is published on '}<a className="text-emerald-600" href={`/saas/${slug}/pricing`}>{`/saas/${slug}/pricing`}</a>.</li>
        <li>
          {isFr
            ? 'Les prix sont indiqués hors taxes (HT). La TVA applicable dépend de la juridiction du Client et sera facturée conformément aux règles OSS (UE) ou aux règles locales (hors UE).'
            : 'Prices are shown excluding tax. Applicable VAT/sales tax depends on the Client\'s jurisdiction and will be billed per EU OSS rules or local rules (non-EU).'}
        </li>
        <li>{isFr ? 'Les clients "Early access" conservent leur tarif à vie sur le plan initial souscrit.' : 'Early-access clients keep their price for life on the initial plan subscribed.'}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '4. Commande, paiement, facturation' : '4. Ordering, payment, invoicing'}
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{isFr ? 'Passage de commande via la page tarifs, paiement par carte via prestataire agréé (Stripe ou équivalent).' : 'Orders placed via the pricing page, card payment through a regulated processor (Stripe or equivalent).'}</li>
        <li>{isFr ? 'La facture électronique est émise immédiatement après paiement et envoyée par email.' : 'An electronic invoice is issued immediately after payment and emailed.'}</li>
        <li>{isFr ? 'Aucun paiement n\'est traité durant la phase d\'accès anticipé.' : 'No payments are processed during the early-access phase.'}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '5. Droit de rétractation (consommateurs UE)' : '5. Right of withdrawal (EU consumers)'}
      </h2>
      <p>
        {isFr
          ? 'Pour les consommateurs situés dans l\'Union européenne, conformément à la directive 2011/83/UE, un droit de rétractation de 14 jours s\'applique. Le Client renonce expressément à ce droit s\'il demande une exécution immédiate d\'un service numérique et obtient ainsi l\'accès au service avant l\'expiration du délai.'
          : 'For EU consumers, pursuant to Directive 2011/83/EU, a 14-day withdrawal right applies. The Client expressly waives this right when requesting immediate execution of a digital service and thereby gaining access prior to the end of the period.'}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '6. Résiliation & remboursement' : '6. Cancellation & refund'}
      </h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>{isFr ? 'Plans mensuels : résiliables à tout moment depuis Mon compte, effectifs à la fin de la période en cours.' : 'Monthly plans: cancellable any time from My account, effective at end of current period.'}</li>
        <li>{isFr ? 'Plans annuels : remboursement prorata temporis sur demande écrite si >90 jours restants.' : 'Annual plans: prorated refund on written request if >90 days remaining.'}</li>
        <li>{isFr ? 'Aucun remboursement n\'est dû sur les 30 premiers jours d\'utilisation active d\'un service numérique immédiatement accessible.' : 'No refund is due for the first 30 days of active use of a digital service made immediately available.'}</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '7. Niveau de service (SLA)' : '7. Service level (SLA)'}
      </h2>
      <p>
        {isFr
          ? 'Objectif de disponibilité : 99,5% mensuels (hors fenêtres de maintenance annoncées 24h à l\'avance). Crédits SLA selon plan.'
          : 'Availability target: 99.5% monthly (excluding maintenance windows announced 24h ahead). SLA credits per plan.'}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '8. Responsabilité' : '8. Liability'}
      </h2>
      <p>
        {isFr
          ? `La responsabilité de ${name} est limitée aux sommes effectivement payées par le Client au titre des 12 derniers mois. Aucune responsabilité pour dommages indirects, perte de revenus ou de données non imputables à une faute caractérisée.`
          : `${name}'s liability is capped at the amounts actually paid by the Client over the last 12 months. No liability for indirect damages, lost revenue, or data loss not attributable to gross negligence.`}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '9. Droit applicable & juridiction' : '9. Governing law & jurisdiction'}
      </h2>
      <p>
        {isFr
          ? 'Phase actuelle (personne physique) : droit français, tribunaux de Paris.'
          : 'Current phase (natural person): French law, Paris courts.'}
      </p>
      <p>
        {isFr
          ? 'Phase commerciale (Wyoming LLC) : droit de l\'État du Wyoming (États-Unis) pour la partie corporate ; les clauses impératives de protection du consommateur dans la juridiction du Client s\'appliqueront en tout état de cause.'
          : 'Commercial phase (Wyoming LLC): State of Wyoming (USA) law for corporate matters; mandatory consumer-protection provisions of the Client\'s jurisdiction will apply regardless.'}
      </p>

      <h2 className="text-lg font-semibold mt-8">
        {isFr ? '10. Contact' : '10. Contact'}
      </h2>
      <p>
        {isFr ? 'Pour toute question : ' : 'For any question: '}
        <a className="text-emerald-600" href="mailto:hello@gapup.io">hello@gapup.io</a>
      </p>
    </LegalLayout>
  );
}
