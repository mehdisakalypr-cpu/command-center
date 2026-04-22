'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-v2/client-fetch';
import { useBusinesses } from '@/lib/businesses/context';
import { publicUrlForBusiness, type Business } from '@/lib/businesses/types';

type Overview = {
  business: Business;
  clients: number;
  waitlist: number;
  events_30d: number;
  landing_live: boolean;
  landing_url: string | null;
  forge_status: string | null;
};

const GOLD = '#C9A84C';

const SOURCE_ICON: Record<string, string> = {
  hisoka: '🃏',
  ftg: '🌍',
  ofa: '🎨',
  estate: '🏨',
  shiftdynamics: '⚡',
  gapup: '📮',
  manual: '📌',
};

const QUICK_LINKS = [
  { label: 'CRM', icon: '🪪', href: '/admin/crm-hub/clients' },
  { label: 'CMS', icon: '✏️', href: '/admin/cms' },
  { label: 'Campaigns', icon: '📡', href: '/admin/campaigns' },
  { label: 'Simulator', icon: '🧮', href: '/admin/simulator' },
  { label: 'Ki Sense', icon: '🧘', href: '/admin/ki-sense' },
  { label: 'Security', icon: '🛡️', href: '/admin/security' },
];

export default function BusinessesDashboard() {
  const { setSelectedSlug } = useBusinesses();
  const [overview, setOverview] = useState<Overview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/businesses/overview')
      .then(r => r.json())
      .then(j => { if (!cancelled) setOverview(j.overview ?? []); })
      .catch(e => { if (!cancelled) setError(String(e?.message ?? e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      padding: '24px',
      color: '#E8E0D0',
      fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif",
      minHeight: '100vh',
      background: '#040D1C',
    }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '.7rem', letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, fontWeight: 700, marginBottom: 4 }}>
          Businesses
        </div>
        <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#E8E0D0' }}>
          Portfolio — chaque business, un registre, un scope
        </h1>
        <p style={{ fontSize: '.72rem', color: '#7D8BA0', marginTop: 6 }}>
          Toutes les rubriques (CMS, CRM, campagnes, simulateur, Ki Sense, sécurité) peuvent filtrer via le picker en haut à droite.
          Clique <strong>Scope</strong> pour présélectionner le business avant d'ouvrir une rubrique.
        </p>
      </header>

      {loading && <div style={{ color: '#7D8BA0' }}>Chargement…</div>}
      {error && <div style={{ color: '#E06A6A' }}>Erreur: {error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {overview.map(({ business: b, clients, waitlist, events_30d, landing_live, landing_url, forge_status }) => {
            const publicUrl = publicUrlForBusiness(b);
            const effectiveLandingUrl = landing_url ?? publicUrl;
            return (
              <div key={b.id} style={{
                padding: 16,
                background: 'rgba(201,168,76,.03)',
                border: '1px solid rgba(201,168,76,.15)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{SOURCE_ICON[b.source] ?? '🏷️'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#E8E0D0' }}>{b.name}</div>
                    <div style={{ fontSize: '.6rem', color: '#5A6A7A', letterSpacing: '.05em' }}>
                      {b.source} · {b.slug} · {b.status}
                      {forge_status && ` · forge ${forge_status}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <MiniStat label="Clients" value={clients} />
                  <MiniStat label="Waitlist" value={waitlist} />
                  <MiniStat label="Events 30j" value={events_30d} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: '.68rem' }}>
                  <span style={{
                    padding: '2px 6px',
                    background: landing_live ? 'rgba(100,200,100,.12)' : 'rgba(125,139,160,.1)',
                    color: landing_live ? '#7CCB7C' : '#5A6A7A',
                    borderRadius: 3,
                    fontSize: '.6rem',
                    letterSpacing: '.06em',
                  }}>
                    {landing_live ? 'LANDING LIVE' : 'NO LANDING'}
                  </span>
                  <a
                    href={effectiveLandingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#C4CDD8', textDecoration: 'none', fontSize: '.66rem' }}
                  >
                    {new URL(effectiveLandingUrl).host} ↗
                  </a>
                </div>

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {QUICK_LINKS.map(ql => (
                    <Link
                      key={ql.href}
                      href={ql.href}
                      onClick={() => setSelectedSlug(b.slug)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        fontSize: '.62rem',
                        background: 'rgba(201,168,76,.06)',
                        color: '#C4CDD8',
                        border: '1px solid rgba(201,168,76,.1)',
                        borderRadius: 4,
                        textDecoration: 'none',
                      }}
                      title={`Ouvrir ${ql.label} avec scope=${b.name}`}
                    >
                      <span>{ql.icon}</span><span>{ql.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {overview.length === 0 && (
            <div style={{ color: '#5A6A7A', fontSize: '.72rem' }}>
              Aucun business enregistré. Lance un run Hisoka puis promote une idée — le trigger l'ajoutera ici.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: '4px 10px',
      background: '#0A1A2E',
      border: '1px solid rgba(255,255,255,.05)',
      borderRadius: 4,
    }}>
      <div style={{ fontSize: '.95rem', fontWeight: 700, color: GOLD, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '.54rem', color: '#5A6A7A', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {label}
      </div>
    </div>
  );
}
