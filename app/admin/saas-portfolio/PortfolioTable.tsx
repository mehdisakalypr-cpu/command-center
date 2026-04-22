'use client';

import { useMemo, useState } from 'react';

export type SaasRow = {
  num: number;
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  deployed_url: string;
  landing_rendered_at: string | null;
  autonomy_score: number;
  hero_title: string | null;
  waitlist_count: number;
};

export default function PortfolioTable({ rows }: { rows: SaasRow[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.slug.toLowerCase().includes(needle) ||
        r.tagline.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        String(r.num).includes(needle),
    );
  }, [rows, q]);

  return (
    <>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="search"
          placeholder="🔍 Filtrer par nom, slug, catégorie, numéro…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 420,
            background: '#0A1A2E',
            border: '1px solid rgba(201,168,76,.2)',
            color: '#E6EEF7',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            outline: 'none',
          }}
        />
        <span style={{ color: '#9BA8B8', fontSize: 12 }}>
          {filtered.length}/{rows.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: '#0A1A2E',
            padding: 24,
            borderRadius: 8,
            border: '1px solid rgba(201,168,76,.15)',
            color: '#9BA8B8',
            fontSize: 14,
          }}
        >
          {rows.length === 0
            ? 'Aucun SaaS live encore. Une fois qu\'une idée Hisoka ≥ 0.92 autonomie est rendue par saas-forge, elle apparaîtra ici.'
            : 'Aucun projet ne correspond au filtre.'}
        </div>
      ) : (
        <div
          style={{
            background: '#0A1A2E',
            borderRadius: 8,
            border: '1px solid rgba(201,168,76,.15)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                {['#', 'Nom', 'Catégorie', 'Autonomie', 'Waitlist', 'Rendu le', 'Landing'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        color: '#6BCB77',
                        borderBottom: '1px solid rgba(107,203,119,.15)',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <td style={{ padding: '8px 10px', color: '#6BCB77', fontWeight: 600 }}>
                    #{r.num}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ color: '#9BA8B8', fontSize: 11 }}>
                      {r.hero_title ?? r.tagline}
                    </div>
                    <div style={{ color: '#6B7A8E', fontSize: 10, marginTop: 2 }}>
                      slug: {r.slug}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#9BA8B8', fontSize: 11 }}>
                    {r.category}
                  </td>
                  <td style={{ padding: '8px 10px' }}>{r.autonomy_score.toFixed(2)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.waitlist_count}</td>
                  <td style={{ padding: '8px 10px', color: '#9BA8B8', fontSize: 11 }}>
                    {r.landing_rendered_at
                      ? new Date(r.landing_rendered_at).toLocaleString('fr-FR')
                      : '—'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <a
                      href={r.deployed_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        border: '1px solid #6BCB77',
                        color: '#6BCB77',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🚀 Ouvrir ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
