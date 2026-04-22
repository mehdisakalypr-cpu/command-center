'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { LandingContent } from '@/lib/hisoka/saas-forge/types';
import { TopNav } from './TopNav';

export function LandingView({
  slug,
  content,
  name,
}: {
  slug: string;
  content: LandingContent;
  name: string;
}) {
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
  const heroImage = content.hero_image_url;

  return (
    <>
      <TopNav slug={slug} name={name} lang={content.lang} />

      {/* HERO — full-width use-case image under the menu */}
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-neutral-200"
          style={
            heroImage
              ? {
                  backgroundImage: `url(${heroImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
          aria-hidden="true"
        />
        {/* Readability overlay — lighter than before */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-white/10" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-6 pt-32 pb-40 text-center text-white">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight drop-shadow-xl"
          >
            {content.hero_title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="mt-6 text-lg sm:text-xl text-white/90 leading-relaxed drop-shadow"
          >
            {content.hero_tagline}
          </motion.p>
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            onSubmit={submit}
            className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading' || status === 'ok'}
              className="flex-1 rounded-lg bg-white/95 text-neutral-900 border border-white/50 px-4 py-3 outline-none focus:ring-2 focus:ring-white text-sm shadow-lg"
            />
            <button
              type="submit"
              disabled={status === 'loading' || status === 'ok'}
              className="rounded-lg bg-neutral-900 text-white font-medium px-5 py-3 hover:bg-neutral-800 disabled:opacity-50 text-sm whitespace-nowrap shadow-lg"
            >
              {status === 'loading' ? '…' : content.hero_cta}
            </button>
          </motion.form>
          {msg && (
            <p
              className={`mt-3 text-sm ${status === 'ok' ? 'text-emerald-300' : 'text-red-300'} drop-shadow`}
              role="status"
            >
              {msg}
            </p>
          )}
        </div>
      </section>

      {/* BODY — lighter surface */}
      <main className="bg-neutral-50 text-neutral-900">
        <section className="mx-auto max-w-5xl px-6 py-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-2xl" aria-hidden="true">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-neutral-900">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </section>

        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-semibold mb-6 text-neutral-900">FAQ</h2>
          <div className="divide-y divide-neutral-200">
            {content.faq.map((q, i) => (
              <details key={i} className="py-4 group">
                <summary className="cursor-pointer font-medium list-none flex justify-between items-center text-neutral-900">
                  <span>{q.question}</span>
                  <span className="text-neutral-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-neutral-600 text-sm leading-relaxed">{q.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="border-t border-neutral-200 py-8 px-6 text-sm text-neutral-500">
          <div className="max-w-5xl mx-auto space-y-4">
            <p className="text-center">{content.footer_note}</p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
              <a href={`/saas/${slug}/privacy`} className="hover:text-neutral-900">
                {content.lang === 'fr' ? 'Confidentialité' : 'Privacy'}
              </a>
              <a href={`/saas/${slug}/terms`} className="hover:text-neutral-900">
                {content.lang === 'fr' ? 'CGU' : 'Terms'}
              </a>
              <a href={`/saas/${slug}/cgv`} className="hover:text-neutral-900">
                {content.lang === 'fr' ? 'CGV' : 'Sales terms'}
              </a>
              <a href={`/saas/${slug}/legal`} className="hover:text-neutral-900">
                {content.lang === 'fr' ? 'Mentions légales' : 'Legal notice'}
              </a>
              <a href={`/saas/${slug}/contact`} className="hover:text-neutral-900">
                Contact
              </a>
              <span className="text-neutral-300">·</span>
              <span className="text-neutral-400">
                ⚡ {content.lang === 'fr' ? 'Projet indépendant' : 'Independent project'}
              </span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
