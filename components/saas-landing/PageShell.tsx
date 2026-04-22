import { AnimatedBackground } from './AnimatedBackground';
import { TopNav } from './TopNav';
import { FloatingScene } from './FloatingScene';
import type { IconSet } from '@/lib/hisoka/saas-forge/archetype-scenes';

export function PageShell({
  slug,
  name,
  lang,
  scene,
  children,
}: {
  slug: string;
  name: string;
  lang: string;
  scene?: IconSet | null;
  children: React.ReactNode;
}) {
  const isFr = lang === 'fr';
  return (
    <>
      <AnimatedBackground />
      {scene ? <FloatingScene scene={scene} /> : null}
      <TopNav slug={slug} name={name} lang={lang} />
      <main className="relative min-h-screen text-neutral-100">
        {children}
        <footer className="border-t border-white/5 py-8 px-6 text-sm text-neutral-500">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs">
              {isFr ? 'Projet indépendant — accès anticipé' : 'Independent project — early access'}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <a href={`/saas/${slug}/privacy`} className="hover:text-neutral-300">
                {isFr ? 'Confidentialité' : 'Privacy'}
              </a>
              <a href={`/saas/${slug}/terms`} className="hover:text-neutral-300">
                {isFr ? 'CGU' : 'Terms'}
              </a>
              <a href={`/saas/${slug}/cgv`} className="hover:text-neutral-300">
                {isFr ? 'CGV' : 'Sales terms'}
              </a>
              <a href={`/saas/${slug}/legal`} className="hover:text-neutral-300">
                {isFr ? 'Mentions légales' : 'Legal notice'}
              </a>
              <a href={`/saas/${slug}/contact`} className="hover:text-neutral-300">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
