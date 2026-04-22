'use client';

import { useEffect, useState } from 'react';

type Event = { id: string; kind: string; payload: unknown; created_at: string };
type Client = {
  id: string;
  email: string;
  profile: Record<string, unknown>;
  current_offer: string | null;
  created_at: string;
};

const KIND_LABEL_FR: Record<string, string> = {
  signup: 'Inscription',
  login: 'Connexion',
  profile_updated: 'Profil mis à jour',
  magic_link_requested: 'Lien magique demandé',
  waitlist_signup: 'Inscription liste d\'attente',
  offer_change: 'Changement d\'offre',
  payment: 'Paiement',
  refund: 'Remboursement',
};
const KIND_LABEL_EN: Record<string, string> = {
  signup: 'Sign up',
  login: 'Sign in',
  profile_updated: 'Profile updated',
  magic_link_requested: 'Magic link requested',
  waitlist_signup: 'Waitlist sign-up',
  offer_change: 'Offer change',
  payment: 'Payment',
  refund: 'Refund',
};

export function AccountView({
  slug,
  lang,
  tokenFromUrl,
  initialSession,
  initialClient,
  initialEvents,
}: {
  slug: string;
  lang: string;
  tokenFromUrl: string | null;
  initialSession: { email: string } | null;
  initialClient: Client | null;
  initialEvents: Event[];
}) {
  const isFr = lang === 'fr';
  const [stage, setStage] = useState<'logged' | 'anonymous' | 'verifying'>(
    initialSession ? 'logged' : tokenFromUrl ? 'verifying' : 'anonymous',
  );
  const [client, setClient] = useState<Client | null>(initialClient);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (stage !== 'verifying' || !tokenFromUrl) return;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/saas/${slug}/account/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: tokenFromUrl }),
        });
        const j = await res.json();
        if (res.ok && j.ok) {
          window.location.replace(`/saas/${slug}/account`);
        } else {
          setStage('anonymous');
          setMessage(j.error ?? (isFr ? 'Lien invalide' : 'Invalid link'));
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [stage, tokenFromUrl, slug, isFr]);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`/api/saas/${slug}/account/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setMessage(
          j.dev_magic_url
            ? `[dev] ${j.dev_magic_url}`
            : isFr
              ? 'Lien envoyé. Consultez votre boîte mail.'
              : 'Link sent. Check your inbox.',
        );
      } else {
        setMessage(j.error ?? 'Error');
      }
    } catch {
      setMessage(isFr ? 'Erreur réseau' : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(update: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/saas/${slug}/account/profile`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(update),
      });
      const j = await res.json();
      if (res.ok && j.ok && client) {
        setClient({ ...client, profile: j.profile });
        setMessage(isFr ? 'Profil enregistré.' : 'Profile saved.');
      } else {
        setMessage(j.error ?? 'Error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch(`/api/saas/${slug}/account/logout`, { method: 'POST' });
    window.location.replace(`/saas/${slug}/account`);
  }

  // ── Anonymous stage (request magic link)
  if (stage === 'anonymous' || !client) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            {isFr ? 'Mon compte' : 'My account'}
          </h1>
          <p className="mt-2 text-neutral-600">
            {isFr
              ? 'Recevez un lien unique par email pour accéder à votre espace. Pas de mot de passe.'
              : 'Get a one-time email link to access your space. No password.'}
          </p>
        </div>
        <form
          onSubmit={requestLink}
          className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">
              {isFr ? 'Votre email' : 'Your email'}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <button
            type="submit"
            disabled={busy || stage === 'verifying'}
            className="w-full rounded-lg bg-neutral-900 text-white font-medium px-5 py-3 text-sm hover:bg-neutral-800 disabled:opacity-50"
          >
            {stage === 'verifying'
              ? isFr ? 'Vérification…' : 'Verifying…'
              : busy
                ? '…'
                : isFr ? 'Recevoir mon lien' : 'Send me a link'}
          </button>
          {message && <p className="text-sm text-neutral-700 break-all">{message}</p>}
        </form>
      </div>
    );
  }

  // ── Logged stage
  const kindLabels = isFr ? KIND_LABEL_FR : KIND_LABEL_EN;
  const profile = client.profile;
  const field = (key: string) => (profile[key] as string | undefined) ?? '';

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            {isFr ? 'Bienvenue' : 'Welcome'}, {field('first_name') || client.email}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isFr ? 'Membre depuis' : 'Member since'}{' '}
            {new Date(client.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-GB')}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-neutral-500 hover:text-neutral-900"
        >
          {isFr ? 'Se déconnecter' : 'Sign out'}
        </button>
      </div>

      {/* Current offer */}
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="text-xs text-emerald-700 uppercase tracking-wide">
          {isFr ? 'Offre actuelle' : 'Current offer'}
        </div>
        <div className="mt-1 text-lg font-semibold text-emerald-900">
          {client.current_offer === 'early_access'
            ? isFr ? 'Accès anticipé — gratuit' : 'Early access — free'
            : client.current_offer ?? '—'}
        </div>
        <p className="mt-2 text-sm text-emerald-800">
          {isFr
            ? 'Vous conservez ce tarif à vie sur votre plan initial au lancement.'
            : 'You keep this price for life on your initial plan at launch.'}
        </p>
      </section>

      {/* Profile */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">
          {isFr ? 'Votre profil' : 'Your profile'}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const update: Record<string, unknown> = {};
            for (const k of ['first_name', 'last_name', 'company', 'role', 'country', 'use_case']) {
              update[k] = (form.get(k) as string) ?? '';
            }
            update.newsletter_opt_in = form.get('newsletter_opt_in') === 'on';
            void updateProfile(update);
          }}
          className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-1">
                {isFr ? 'Prénom' : 'First name'}
              </span>
              <input name="first_name" defaultValue={field('first_name')} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-1">
                {isFr ? 'Nom' : 'Last name'}
              </span>
              <input name="last_name" defaultValue={field('last_name')} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-1">
                {isFr ? 'Société' : 'Company'}
              </span>
              <input name="company" defaultValue={field('company')} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </label>
            <label className="block">
              <span className="block text-xs text-neutral-500 mb-1">
                {isFr ? 'Rôle' : 'Role'}
              </span>
              <input name="role" defaultValue={field('role')} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs text-neutral-500 mb-1">
                {isFr ? 'Pays' : 'Country'}
              </span>
              <input name="country" defaultValue={field('country')} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </label>
          </div>
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">
              {isFr ? 'Votre cas d\'usage (1-2 phrases)' : 'Your use case (1-2 sentences)'}
            </span>
            <textarea name="use_case" defaultValue={field('use_case')} rows={3} maxLength={500}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 resize-y" />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="newsletter_opt_in" defaultChecked={Boolean(profile.newsletter_opt_in)} />
            {isFr ? 'Je souhaite recevoir les mises à jour produit' : 'I want product updates by email'}
          </label>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-neutral-900 text-white font-medium px-5 py-2.5 text-sm hover:bg-neutral-800 disabled:opacity-50"
            >
              {isFr ? 'Enregistrer' : 'Save'}
            </button>
            {message && <span className="text-sm text-neutral-600">{message}</span>}
          </div>
        </form>
      </section>

      {/* History */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">
          {isFr ? 'Historique' : 'History'}
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 shadow-sm">
          {events.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">
              {isFr ? 'Aucun événement pour le moment.' : 'No events yet.'}
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="p-4 flex items-start justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium text-neutral-900">
                    {kindLabels[e.kind] ?? e.kind}
                  </div>
                  {typeof e.payload === 'object' && e.payload && 'via' in (e.payload as Record<string, unknown>) && (
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {(e.payload as { via?: string }).via}
                    </div>
                  )}
                </div>
                <div className="text-xs text-neutral-400 whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString(isFr ? 'fr-FR' : 'en-GB')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
