'use client';

import { useState } from 'react';

const REASONS_FR = [
  { v: 'improve', l: 'Améliorer le produit' },
  { v: 'bug', l: 'Signaler un problème' },
  { v: 'question', l: 'Question sur le service' },
  { v: 'partnership', l: 'Partenariat' },
  { v: 'press', l: 'Presse' },
  { v: 'other', l: 'Autre' },
];
const REASONS_EN = [
  { v: 'improve', l: 'Improve the product' },
  { v: 'bug', l: 'Report an issue' },
  { v: 'question', l: 'Question about the service' },
  { v: 'partnership', l: 'Partnership' },
  { v: 'press', l: 'Press' },
  { v: 'other', l: 'Other' },
];

export function ContactForm({ slug, lang }: { slug: string; lang: string }) {
  const isFr = lang === 'fr';
  const reasons = isFr ? REASONS_FR : REASONS_EN;
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState(reasons[0].v);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`/api/saas/${slug}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, reason, subject, message }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setStatus('ok');
        setMsg(
          isFr
            ? 'Message reçu. On vous répond sous 24h ouvrées.'
            : 'Message received. We reply within 24 business hours.',
        );
        setEmail(''); setSubject(''); setMessage('');
      } else {
        setStatus('err');
        setMsg(j.error ?? 'Error');
      }
    } catch {
      setStatus('err');
      setMsg(isFr ? 'Erreur réseau' : 'Network error');
    }
  }

  const label = (t: string) => <span className="block text-xs text-neutral-400 mb-1">{t}</span>;
  const disabled = status === 'loading' || status === 'ok';

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-white/10 bg-white p-6  space-y-4"
    >
      <label className="block">
        {label(isFr ? 'Votre email *' : 'Your email *')}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg bg-neutral-50 border border-neutral-300 px-4 py-2 outline-none focus:border-neutral-500 text-sm"
        />
      </label>
      <label className="block">
        {label(isFr ? 'Raison du contact *' : 'Reason *')}
        <select
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg bg-neutral-50 border border-neutral-300 px-4 py-2 outline-none focus:border-neutral-500 text-sm"
        >
          {reasons.map((r) => (
            <option key={r.v} value={r.v}>
              {r.l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        {label(isFr ? 'Sujet (optionnel)' : 'Subject (optional)')}
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={disabled}
          maxLength={120}
          className="w-full rounded-lg bg-neutral-50 border border-neutral-300 px-4 py-2 outline-none focus:border-neutral-500 text-sm"
        />
      </label>
      <label className="block">
        {label(isFr ? 'Votre message *' : 'Your message *')}
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
          maxLength={4000}
          rows={6}
          className="w-full rounded-lg bg-neutral-50 border border-neutral-300 px-4 py-2 outline-none focus:border-neutral-500 text-sm resize-y"
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-neutral-100 text-neutral-950 font-medium px-5 py-3 hover:bg-white disabled:opacity-50 text-sm"
      >
        {status === 'loading' ? '…' : isFr ? 'Envoyer' : 'Send'}
      </button>
      {msg && (
        <p
          className={`text-sm ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
          role="status"
        >
          {msg}
        </p>
      )}
    </form>
  );
}
