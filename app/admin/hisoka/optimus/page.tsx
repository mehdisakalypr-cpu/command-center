import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const GOLD = '#C9A84C';
const BG = '#0A1A2E';
const FG = '#E6EEF7';
const DIM = '#9BA8B8';
const GOOD = '#6BCB77';
const WARN = '#FFB84C';
const BAD = '#FF6B6B';

function readDoc(rel: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  } catch {
    return null;
  }
}

function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
  const matches = Array.from(line.matchAll(pattern));
  let lastIdx = 0;
  let key = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > lastIdx) nodes.push(line.slice(lastIdx, start));
    const token = m[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key++}
          style={{ background: 'rgba(201,168,76,.1)', padding: '1px 4px', borderRadius: 2, fontSize: '0.9em' }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIdx = start + token.length;
  }
  if (lastIdx < line.length) nodes.push(line.slice(lastIdx));
  return nodes;
}

function renderMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const out: ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCode) {
        out.push(
          <pre
            key={`c${i}`}
            style={{
              background: '#112233',
              padding: 10,
              borderRadius: 4,
              fontSize: 11,
              overflowX: 'auto',
              margin: '8px 0',
            }}
          >
            {codeBuf.join('\n')}
          </pre>,
        );
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeBuf.push(line);
      return;
    }
    if (line.startsWith('### ')) {
      out.push(
        <h3 key={i} style={{ color: GOLD, fontSize: 13, marginTop: 14, marginBottom: 6 }}>
          {renderInline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      out.push(
        <h2 key={i} style={{ color: GOLD, fontSize: 15, marginTop: 18, marginBottom: 8, fontWeight: 700 }}>
          {renderInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      out.push(
        <h1 key={i} style={{ color: GOLD, fontSize: 18, marginTop: 20, marginBottom: 10, fontWeight: 700 }}>
          {renderInline(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith('> ')) {
      out.push(
        <blockquote
          key={i}
          style={{
            borderLeft: `3px solid ${GOLD}`,
            paddingLeft: 10,
            color: DIM,
            margin: '6px 0',
            fontStyle: 'italic',
          }}
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
    } else if (/^[-*] /.test(line)) {
      out.push(
        <li key={i} style={{ marginLeft: 20, marginBottom: 2 }}>
          {renderInline(line.slice(2))}
        </li>,
      );
    } else if (line.trim() === '---') {
      out.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(201,168,76,.2)', margin: '12px 0' }} />);
    } else if (line.trim() === '') {
      out.push(<div key={i} style={{ height: 6 }} />);
    } else {
      out.push(
        <div key={i} style={{ marginBottom: 2 }}>
          {renderInline(line)}
        </div>,
      );
    }
  });
  return out;
}

export default async function OptimusPage() {
  const admin = createSupabaseAdmin();
  const { data: idea } = await admin
    .from('business_ideas')
    .select('id, name, slug, tagline, rationale, score, rank, autonomy_score, llc_gate, visibility, build_priority, pushed_to_minato_at, minato_ticket_id')
    .ilike('name', '%optimus%')
    .order('score', { ascending: false })
    .maybeSingle();

  const docV1 = readDoc('docs/hisoka-ideas/optimus-research.md');
  const docV2 = readDoc('docs/hisoka-ideas/optimus-research-v2.md');
  const docML = readDoc('docs/hisoka-ideas/optimus-ml-stack.md');

  return (
    <div style={{ padding: 24, color: FG, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: GOLD, marginBottom: 8 }}>
        🤖 Optimus — Trading Bot autonome
      </h1>
      <div style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>
        Cockpit projet — recherches stack, état queue Minato, priorité build.
      </div>

      {!idea && (
        <div style={{ padding: 20, background: 'rgba(255,107,107,.1)', color: BAD, borderRadius: 4, marginBottom: 20 }}>
          ⚠ Aucune idée &quot;Optimus&quot; trouvée dans <code>business_ideas</code>. Lancer une hunt Hisoka d&apos;abord.
        </div>
      )}

      {idea && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <Card label="Rang auto" value={idea.rank ?? '—'} accent={idea.rank === 1 ? GOOD : GOLD} />
          <Card
            label="Priorité build"
            value={idea.build_priority ?? '—'}
            accent={idea.build_priority === 1 ? GOOD : DIM}
            sub={idea.build_priority == null ? 'auto' : 'manuelle'}
          />
          <Card
            label="Score Hisoka"
            value={Number(idea.score ?? 0).toFixed(0)}
            sub={`autonomie ${Number(idea.autonomy_score ?? 0).toFixed(2)}`}
          />
          <Card
            label="Queue Minato"
            value={idea.minato_ticket_id ? '✓ poussé' : '—'}
            accent={idea.minato_ticket_id ? GOOD : DIM}
            sub={idea.pushed_to_minato_at ? new Date(idea.pushed_to_minato_at).toLocaleDateString('fr-FR') : 'pas encore'}
          />
        </div>
      )}

      {idea?.tagline && (
        <div style={{ background: BG, padding: 16, borderRadius: 6, border: `1px solid rgba(201,168,76,.2)`, marginBottom: 20 }}>
          <div style={{ color: GOLD, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Tagline</div>
          <div>{idea.tagline}</div>
          {idea.llc_gate && idea.llc_gate !== 'none' && (
            <div style={{ marginTop: 8, color: idea.llc_gate === 'blocked' ? BAD : WARN, fontSize: 11 }}>
              🔐 LLC gate: <strong>{idea.llc_gate}</strong>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <a
          href="/admin/hisoka"
          style={{
            background: 'rgba(201,168,76,.15)',
            color: GOLD,
            border: `1px solid ${GOLD}`,
            padding: '6px 12px',
            borderRadius: 4,
            fontSize: 11,
            textDecoration: 'none',
          }}
        >
          ← Portfolio Hisoka
        </a>
        {idea && (
          <a
            href={`/admin/hisoka/${idea.slug}`}
            style={{
              background: 'transparent',
              color: DIM,
              border: `1px solid ${DIM}`,
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: 11,
              textDecoration: 'none',
            }}
          >
            Voir fiche complète
          </a>
        )}
      </div>

      <DocBlock
        title="🔍 Recherche V2 (exhaustive, free + payant, analyse vs execution)"
        markdown={docV2}
        missing="optimus-research-v2.md encore en cours de generation — agent actif, reload dans quelques minutes."
      />
      <DocBlock
        title="🧠 ML / Pattern Recognition / Backtest stack"
        markdown={docML}
        missing="optimus-ml-stack.md en cours de generation — agent actif, reload dans quelques minutes."
      />
      <DocBlock
        title="📄 Recherche V1 (first pass, free-focused)"
        markdown={docV1}
        missing="optimus-research.md introuvable."
      />
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  accent = GOLD,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ background: BG, borderRadius: 6, padding: 12, border: `1px solid rgba(201,168,76,.2)` }}>
      <div style={{ color: GOLD, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: accent, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: DIM, fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DocBlock({ title, markdown, missing }: { title: string; markdown: string | null; missing: string }) {
  return (
    <details style={{ marginBottom: 12, background: BG, borderRadius: 6, border: `1px solid rgba(201,168,76,.2)` }}>
      <summary style={{ padding: 12, cursor: 'pointer', color: GOLD, fontSize: 13, fontWeight: 600 }}>
        {title}
      </summary>
      <div style={{ padding: '0 16px 16px 16px', color: FG, fontSize: 12, lineHeight: 1.6 }}>
        {markdown ? renderMarkdown(markdown) : <div style={{ color: DIM, fontStyle: 'italic' }}>{missing}</div>}
      </div>
    </details>
  );
}
