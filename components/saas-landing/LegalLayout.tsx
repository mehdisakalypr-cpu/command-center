import Link from 'next/link';

export function LegalLayout({
  slug,
  name,
  title,
  children,
  lang,
}: {
  slug: string;
  name: string;
  title: string;
  children: React.ReactNode;
  lang: string;
}) {
  const isFr = lang === 'fr';
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 text-sm">
          <Link href={`/saas/${slug}`} className="text-neutral-400 hover:text-neutral-900">
            ← {isFr ? 'Retour' : 'Back to'} {name}
          </Link>
        </nav>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-neutral-400 text-sm mb-10">
          {isFr ? 'Dernière mise à jour' : 'Last updated'}: {new Date().toISOString().slice(0, 10)}
        </p>
        <article className="prose  prose-neutral max-w-none space-y-5 text-neutral-700 text-sm leading-relaxed">
          {children}
        </article>
        <footer className="mt-16 pt-8 border-t border-neutral-200 text-xs text-neutral-400 flex gap-4">
          <Link href={`/saas/${slug}`} className="hover:text-neutral-700">← {name}</Link>
          <Link href={`/saas/${slug}/privacy`} className="hover:text-neutral-700">Privacy</Link>
          <Link href={`/saas/${slug}/terms`} className="hover:text-neutral-700">Terms</Link>
          <a href="mailto:hello@gapup.io" className="hover:text-neutral-700">Contact</a>
        </footer>
      </div>
    </main>
  );
}
