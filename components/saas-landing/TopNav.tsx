'use client';

import { useState } from 'react';

export function TopNav({
  slug,
  name,
  lang,
}: {
  slug: string;
  name: string;
  lang: string;
}) {
  const [open, setOpen] = useState(false);
  const isFr = lang === 'fr';

  const links = [
    { href: `/saas/${slug}`, label: isFr ? 'Accueil' : 'Home' },
    { href: `/saas/${slug}/services`, label: isFr ? 'Nos services' : 'Services' },
    { href: `/saas/${slug}/pricing`, label: isFr ? 'Tarifs' : 'Pricing' },
    { href: `/saas/${slug}/account`, label: isFr ? 'Mon compte' : 'Account' },
    { href: `/saas/${slug}/contact`, label: isFr ? 'Contact' : 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
        <a href={`/saas/${slug}`} className="font-semibold tracking-tight text-neutral-900">
          {name}
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-neutral-900 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          aria-label={isFr ? 'Ouvrir le menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-neutral-900 p-2"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-4 flex flex-col gap-3 text-sm">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-neutral-700 hover:text-neutral-900"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
