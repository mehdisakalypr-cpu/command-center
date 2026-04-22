'use client';

import { useEffect, useState } from 'react';
import { useBusinesses } from '@/lib/businesses/context';
import { ALL_BUSINESSES_SLUG } from '@/lib/businesses/types';
import { authFetch } from '@/lib/auth-v2/client-fetch';

type SaasClient = {
  id: string;
  idea_slug: string;
  email: string;
  profile: Record<string, unknown> | null;
  current_offer: string | null;
  created_at: string;
  updated_at: string;
};

type WaitlistEntry = {
  id: string;
  idea_slug: string;
  email: string;
  source: string | null;
  created_at: string;
};

type ClientEvent = {
  id: string;
  client_id: string | null;
  idea_slug: string;
  kind: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type BySlug = Record<string, { clients: number; waitlist: number; events: number }>;

type ApiResponse = {
  clients: SaasClient[];
  waitlist: WaitlistEntry[];
  events: ClientEvent[];
  bySlug: BySlug;
};

const GOLD = '#C9A84C';

const EVENT_LABELS: Record<string, string> = {
  magic_link_requested: '✉️ Lien demandé',
  signup: '🎉 Signup',
  login: '🔓 Login',
  profile_updated: '✏️ Profil MAJ',
  logout: '🚪 Logout',
  contact_submitted: '📬 Message envoyé',
  waitlist_joined: '📝 Waitlist',
};

export default function BusinessClientsPage() {
  const { businesses, selected, selectedSlug } = useBusinesses();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = selectedSlug && selectedSlug !== ALL_BUSINESSES_SLUG
      ? `?slug=${encodeURIComponent(selectedSlug)}`
      : '';
    authFetch(`/api/businesses/clients${qs}`)
      .then(r => r.json())
      .then((j: ApiResponse) => { if (!cancelled) setData(j); })
      .catch(e => { if (!cancelled) setError(String(e?.message ?? e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSlug]);

  const scopeLabel = selected ? selected.name : 'Tous les business';

  return (
    <div style={{ padding: '20px 24px', color: '#E8E0D0', fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: '.9rem', color: GOLD, letterSpacing: '.06em', margin: 0 }}>
          Clients SaaS · {scopeLabel}
        </h2>
        <span style={{ fontSize: '.65rem', color: '#5A6A7A' }}>
          magic-link signups · waitlist · events · 30j
        </span>
      </div>

      {loading && <div style={{ color: '#7D8BA0', fontSize: '.75rem' }}>Chargement…</div>}
      {error && <div style={{ color: '#E06A6A', fontSize: '.75rem' }}>Erreur: {error}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <Stat label="Clients" value={data.clients.length} />
            <Stat label="Waitlist" value={data.waitlist.length} />
            <Stat label="Events (200 dern.)" value={data.events.length} />
            <Stat label="Business actifs" value={businesses.length} />
          </div>

          {selectedSlug === ALL_BUSINESSES_SLUG && (
            <section style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: '.7rem', color: '#E8E0D0', marginBottom: 8, letterSpacing: '.06em' }}>
                Par business
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem' }}>
                <thead>
                  <tr>
                    <Th>Slug</Th><Th>Clients</Th><Th>Waitlist</Th><Th>Events</Th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.bySlug).sort((a, b) => b[1].clients - a[1].clients).map(([slug, n]) => {
                    const biz = businesses.find(b => b.slug === slug);
                    return (
                      <tr key={slug}>
                        <Td>{biz?.name ?? slug} <span style={{ color: '#5A6A7A' }}>({slug})</span></Td>
                        <Td>{n.clients}</Td>
                        <Td>{n.waitlist}</Td>
                        <Td>{n.events}</Td>
                      </tr>
                    );
                  })}
                  {Object.keys(data.bySlug).length === 0 && (
                    <tr><Td colSpan={4}><em style={{ color: '#5A6A7A' }}>Aucune activité client encore.</em></Td></tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          <section style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: '.7rem', color: '#E8E0D0', marginBottom: 8, letterSpacing: '.06em' }}>
              Clients — {data.clients.length}
            </h3>
            {data.clients.length === 0 ? (
              <p style={{ color: '#5A6A7A', fontSize: '.72rem' }}>Pas encore de client inscrit.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem' }}>
                <thead>
                  <tr>
                    <Th>Email</Th><Th>Business</Th><Th>Offer</Th><Th>Inscrit</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.clients.map(c => (
                    <tr key={c.id}>
                      <Td>{c.email}</Td>
                      <Td>{businesses.find(b => b.slug === c.idea_slug)?.name ?? c.idea_slug}</Td>
                      <Td>{c.current_offer ?? '—'}</Td>
                      <Td>{new Date(c.created_at).toLocaleDateString('fr-FR')}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h3 style={{ fontSize: '.7rem', color: '#E8E0D0', marginBottom: 8, letterSpacing: '.06em' }}>
              Events récents
            </h3>
            {data.events.length === 0 ? (
              <p style={{ color: '#5A6A7A', fontSize: '.72rem' }}>Aucun event.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem' }}>
                <thead>
                  <tr>
                    <Th>Quand</Th><Th>Business</Th><Th>Kind</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.slice(0, 50).map(e => (
                    <tr key={e.id}>
                      <Td>{new Date(e.created_at).toLocaleString('fr-FR')}</Td>
                      <Td>{businesses.find(b => b.slug === e.idea_slug)?.name ?? e.idea_slug}</Td>
                      <Td>{EVENT_LABELS[e.kind] ?? e.kind}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: '8px 16px',
      background: '#0A1A2E',
      border: '1px solid rgba(255,255,255,.06)',
    }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: GOLD }}>{value}</div>
      <div style={{ fontSize: '.56rem', color: '#5A6A7A', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {label}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{
    textAlign: 'left' as const,
    padding: '8px 12px',
    color: '#5A6A7A',
    fontSize: '.6rem',
    letterSpacing: '.1em',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid rgba(255,255,255,.06)',
  }}>{children}</th>;
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,.04)',
    color: '#9BA8B8',
  }}>{children}</td>;
}
