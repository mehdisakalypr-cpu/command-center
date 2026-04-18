import Link from 'next/link'

export const metadata = { title: 'Ad Factory — Command Center' }

const C = {
  bg: '#040D1C', card: '#0A1A2E', border: 'rgba(201,168,76,.2)',
  accent: '#C9A84C', text: '#E8E0D0', muted: '#9BA8B8',
  green: '#10B981', blue: '#3B82F6', purple: '#A78BFA',
}

const FTG_BASE = 'https://feel-the-gap.vercel.app'

type Card = {
  href: string
  icon: string
  title: string
  desc: string
  status: 'live' | 'stub' | 'ready'
}

const CARDS: Card[] = [
  {
    href: `${FTG_BASE}/admin/ad-factory`,
    icon: '🏠',
    title: 'Hub Ad Factory',
    desc: 'Vue d\'ensemble du moteur + status providers (Gemini nano-banana actif, Seedance/ElevenLabs/HeyGen en stub jusqu\'à clés).',
    status: 'live',
  },
  {
    href: `${FTG_BASE}/admin/ad-factory/avatars`,
    icon: '🎭',
    title: 'Avatar Factory',
    desc: 'Génère des avatars IA depuis texte (4 previews cascade nano-banana · CF Flux · Pollinations). Bibliothèque réutilisable cross-projets.',
    status: 'live',
  },
  {
    href: `${FTG_BASE}/admin/ad-factory/scenes`,
    icon: '🌆',
    title: 'Scene Factory',
    desc: 'Backgrounds animés : from-prompt (générer de zéro) OU from-image existante (OFA hero upgrader). Catégories + saisons.',
    status: 'ready',
  },
  {
    href: `${FTG_BASE}/admin/ad-factory/projects`,
    icon: '🎬',
    title: 'Projets / Scénarios',
    desc: 'Brief L\'Oignon 45s pré-rempli (4 segments). Fork industrialize en 324 variants (langues × produits × pays).',
    status: 'ready',
  },
]

export default function AdFactoryCCPage() {
  return (
    <div style={{ color: C.text, padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ fontSize: 11, color: C.accent, letterSpacing: '.2em', textTransform: 'uppercase' }}>Ops & Contenu · Cross-site</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 8px' }}>🎬 Ad Factory</h1>
      <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 24, maxWidth: 760 }}>
        Moteur centralisé de production de vidéos IA (ads, posts réseaux, hero sites clients OFA, support avatars).
        Hébergé dans FTG, accessible depuis CC via ces liens. Tourne en stub jusqu'à activation des clés Seedance/ElevenLabs/HeyGen.
        Brique Avatar Factory 100% opérationnelle (4 clés Gemini déjà en env Vercel FTG).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 28 }}>
        {CARDS.map((c) => (
          <a
            key={c.href}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 18,
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              transition: 'all .2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <span style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 999, letterSpacing: '.1em', textTransform: 'uppercase',
                background: c.status === 'live' ? 'rgba(16,185,129,.15)' : c.status === 'ready' ? 'rgba(59,130,246,.15)' : 'rgba(167,139,250,.15)',
                color: c.status === 'live' ? C.green : c.status === 'ready' ? C.blue : C.purple,
              }}>
                {c.status === 'live' ? '● Live' : c.status === 'ready' ? '● Ready' : '○ Stub'}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{c.desc}</div>
            <div style={{ fontSize: 10, color: C.accent, marginTop: 10 }}>Ouvrir dans FTG →</div>
          </a>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10 }}>📋 Workflow recommandé</div>
        <ol style={{ fontSize: 13, lineHeight: 1.9, color: C.text, margin: 0, paddingLeft: 20 }}>
          <li><strong>Avatar Factory</strong> : crée 2-3 avatars de base (ex: Aïssata CIV, Fatou SEN, Mamadou MAR)</li>
          <li><strong>Scene Factory</strong> : crée 5-8 backgrounds réutilisables (marché, champs, port, boutique, maison)</li>
          <li><strong>Projets</strong> : crée 1 projet scénario (brief L'Oignon pré-rempli comme template)</li>
          <li><strong>Studio</strong> : édite les 4 segments + valide chaque preview (checkpoints humains)</li>
          <li><strong>Fork Industrialize</strong> : matrix langues × produits × pays × avatars → N variants</li>
          <li><strong>Jobs</strong> : batch render (Seedance API) → mp4 par variant</li>
          <li><strong>Distribute</strong> : 4 formats auto (ffmpeg) → publish IG/TikTok/YT/LinkedIn/FB/X/OFA-site</li>
        </ol>
      </div>

      <div style={{ marginTop: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10 }}>🔑 Env vars à set (Vercel FTG) pour activation prod</div>
        <ul style={{ fontSize: 12, lineHeight: 1.8, color: C.muted, margin: 0, paddingLeft: 18, fontFamily: 'Menlo, monospace' }}>
          <li><code style={{ color: C.text }}>SEEDANCE_API_KEY</code> + <code style={{ color: C.text }}>SEEDANCE_PROVIDER=enhancor</code> ($0.40/s, 40% discount)</li>
          <li><code style={{ color: C.text }}>ELEVENLABS_API_KEY</code> + <code style={{ color: C.text }}>ELEVENLABS_VOICE_ID</code></li>
          <li><code style={{ color: C.text }}>HEYGEN_API_KEY</code> (optionnel, pour lip-sync avatars)</li>
          <li><code style={{ color: C.text }}>META_IG_ACCESS_TOKEN</code> + <code style={{ color: C.text }}>META_IG_BUSINESS_ID</code> (publish IG Reels)</li>
          <li><code style={{ color: C.text }}>META_FB_PAGE_TOKEN</code> + <code style={{ color: C.text }}>META_FB_PAGE_ID</code></li>
          <li><code style={{ color: C.text }}>GOOGLE_API_KEY</code> (Drive folder ingest)</li>
          <li><code style={{ color: C.text }}>CF_ACCOUNT_ID</code> + <code style={{ color: C.text }}>CF_API_KEY</code> (Flux image fallback)</li>
        </ul>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
          Tant qu'une clé est absente → le provider correspondant tourne en stub (log + placeholder URL).
          Zéro ligne de code à changer à l'activation.
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: C.muted, textAlign: 'center' }}>
        Scénario pilote : <strong style={{ color: C.accent }}>L'Oignon — Aïssata CIV</strong> · arc substitution import · wordplay <em>Feel→Fill</em> · voir <code style={{ color: C.text }}>project_ftg_ad_oignon.md</code> en mémoire.
      </div>
    </div>
  )
}
