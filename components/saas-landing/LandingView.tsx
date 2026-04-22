'use client';

import { useState } from 'react';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';

export function LandingView({ slug, content }: { slug: string; content: LandingContent }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`/api/saas/${slug}/waitlist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setStatus('ok');
        setMsg(content.lang === 'fr' ? 'Inscrit — à bientôt.' : "You're in — see you soon.");
      } else {
        setStatus('err');
        setMsg(j.error ?? 'Error');
      }
    } catch {
      setStatus('err');
      setMsg('Network error');
    }
  }

  const emailPlaceholder = content.lang === 'fr' ? 'votre@email.com' : 'you@email.com';

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
          {content.hero_title}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-neutral-300 leading-relaxed">
          {content.hero_tagline}
        </p>
        <form onSubmit={submit} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            required
            placeholder={emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading' || status === 'ok'}
            className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 outline-none focus:border-neutral-500 text-sm"
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'ok'}
            className="rounded-lg bg-neutral-100 text-neutral-950 font-medium px-5 py-3 hover:bg-white disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {status === 'loading' ? '…' : content.hero_cta}
          </button>
        </form>
        {msg && (
          <p
            className={`mt-3 text-sm ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
            role="status"
          >
            {msg}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {content.features.map((f, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition-colors hover:bg-neutral-900"
          >
            <div className="text-2xl" aria-hidden="true">
              {f.icon}
            </div>
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{f.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-2xl font-semibold mb-6">FAQ</h2>
        <div className="divide-y divide-neutral-800">
          {content.faq.map((q, i) => (
            <details key={i} className="py-4 group">
              <summary className="cursor-pointer font-medium list-none flex justify-between items-center">
                <span>{q.question}</span>
                <span className="text-neutral-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                  ▾
                </span>
              </summary>
              <p className="mt-3 text-neutral-400 text-sm leading-relaxed">{q.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-900 py-8 px-6 text-sm text-neutral-500">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-center">{content.footer_note}</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
            <a href={`/saas/${slug}/privacy`} className="hover:text-neutral-300">
              {content.lang === 'fr' ? 'Confidentialité' : 'Privacy'}
            </a>
            <a href={`/saas/${slug}/terms`} className="hover:text-neutral-300">
              {content.lang === 'fr' ? 'Conditions' : 'Terms'}
            </a>
            <a href="mailto:hello@gapup.io" className="hover:text-neutral-300">
              Contact
            </a>
            <span className="text-neutral-700">·</span>
            <span
              className="text-neutral-600"
              title={content.lang === 'fr' ? 'Construit en public par un fondateur solo' : 'Built in public by a solo founder'}
            >
              ⚡ {content.lang === 'fr' ? 'Projet indépendant' : 'Independent project'}
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
