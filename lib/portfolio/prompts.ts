/**
 * Per-page-type prompts for the portfolio page generator. Each builder
 * returns the full system + user prompt sent to the cascade.
 *
 * The LLM output convention is strict: a single TSX block, default-exported
 * React Server Component for Next.js App Router, no markdown fences, no
 * commentary. Components Nav, Footer, ChatbotWidget are imported from
 * `@/components/*` and are assumed to exist in the target repo.
 */

import type { PortfolioProduct, PageType } from './products'

const COMMON_RULES = `
RULES (HARD):
- Output ONE valid TSX block. No markdown fences, no prose before/after.
- The output MUST start with imports, then \`export default function <Name>() {\`.
  Concretely:
    import Nav from "@/components/Nav";
    import Footer from "@/components/Footer";
    import ChatbotWidget from "@/components/ChatbotWidget";

    export default function HomePage() {
      return (
        <main>...</main>
      );
    }
- Default-export a React Server Component (no "use client" unless animations require client).
- Import Nav, Footer, ChatbotWidget from "@/components/Nav", "@/components/Footer", "@/components/ChatbotWidget".
- Use inline styles or Tailwind classes only. Do NOT import any external CSS file.
- Page background: \${COLOR_BG}. Primary: \${COLOR_PRIMARY}. Accent: \${COLOR_ACCENT}.
- Hero (where applicable): full-width, prominent headline, gradient using primary+accent.
- Always wrap content in <main style={{ minHeight: '100vh', background: 'var(--bg)' }}> with --bg as inline CSS var.
- Render <Nav /> at top, <Footer /> at bottom, <ChatbotWidget /> floating bottom-right.
- French copy. Native, persuasive, concrete. NO buzzwords ("révolutionnaire", "leader", "next-gen").
- All headlines under 9 words. Bullet items under 14 words.
- Include semantic HTML: <header>, <section>, <article>, <h1>/<h2>/<h3> hierarchy.
- Accessible: every interactive element labelled, color contrast ≥ 4.5:1.
`

function header(product: PortfolioProduct, pageType: PageType): string {
  return `You are generating a single page TSX file for ${product.name} — ${product.tagline}.

PRODUCT CONTEXT:
- name: ${product.name}
- tagline: ${product.tagline}
- description: ${product.description}
- baseUrl: ${product.baseUrl}
- colors: primary=${product.colorPrimary} accent=${product.colorAccent} bg=${product.colorBg}

PAGE TYPE: ${pageType}
`
}

function commonReplaced(rules: string, p: PortfolioProduct): string {
  return rules
    .replace(/\$\{COLOR_BG\}/g, p.colorBg)
    .replace(/\$\{COLOR_PRIMARY\}/g, p.colorPrimary)
    .replace(/\$\{COLOR_ACCENT\}/g, p.colorAccent)
}

const HOME = (p: PortfolioProduct) => `
SECTIONS REQUIRED (in order):
1. Hero — H1, sub-H, 2 CTAs (primary "Voir une démo" → /demo, secondary "Voir les offres" → /offres). Background uses CSS gradient(primary,accent).
2. "Le problème" — 3 short sentences naming the customer pain (concrete, 1 metric).
3. "Ce que ${p.name} fait" — 4 cards (icon emoji + title + 1-line desc).
4. "Comment ça marche" — 3 numbered steps, max 12 words each.
5. "Pour qui" — 3 personas with 1-line trigger each.
6. "Pricing teaser" — 1 line + button "Voir les 3 offres" → /offres.
7. Final CTA band — gradient strip with single CTA → /contact.
`

const SERVICES = (p: PortfolioProduct) => `
SECTIONS REQUIRED:
1. Hero (compact) — H1 "Services ${p.name}", 1 sub-line.
2. 4 service cards: title, 2-line description, "ce que vous obtenez" 3-bullet list, no price.
3. "Pile technique" strip — 8 logos / lib names that power the product (text only, no <img>).
4. FAQ teaser — 3 questions, each linked to /faq#anchor.
5. CTA band → /demo.
`

const OFFRES = (p: PortfolioProduct) => `
SECTIONS REQUIRED:
1. Hero (compact) — H1 "Offres", H2 "Choisissez selon votre rythme".
2. THREE pricing cards side-by-side. Tier names: Starter / Pro / Scale.
   - Each card: name, price /mois EUR, 6 bullets, primary button "Choisir Starter/Pro/Scale" → /contact?tier=<slug>.
   - Highlight middle card with accent border.
3. "Inclus dans toutes les offres" — 4 bullets row.
4. "Garanties" — 3 short cards (essai 14j, sans engagement, support FR).
5. FAQ teaser → /faq.
`

const FAQ = (p: PortfolioProduct) => `
SECTIONS REQUIRED:
1. Hero (compact) — H1 "FAQ".
2. 8 collapsible (use <details> + <summary>) Q/A blocks grouped in 3 sections:
   - "Produit" (3 questions about how ${p.name} works)
   - "Pricing" (2 questions about offers, billing, downgrade)
   - "Sécurité & data" (3 questions about RGPD, hosting, exports)
3. Bottom CTA: "Une autre question ?" → /contact.
`

const CONTACT = (p: PortfolioProduct) => `
SECTIONS REQUIRED:
1. Hero (compact) — H1 "Contact", H2 "Réponse en moins de 24h".
2. Two-column layout:
   - LEFT: form (name, email, company, message) submitting POST to /api/contact. Use action="/api/contact" form for SSR; on submit show "Merci, message envoyé".
   - RIGHT: contact info card (email contact@${p.repoName}.com, hours, "vous parlez à un humain, pas un bot").
3. Map / location placeholder card (simple <div> with city name).
`

const DEMO = (p: PortfolioProduct) => `
SECTIONS REQUIRED:
1. Hero (compact) — H1 "Démo de ${p.name}", H2 with a known brand the demo is run on.
2. Three side-by-side preview cards mimicking the product output. Each card has a header bar (title + tag like "snapshot", "diff", "digest"), then 6-8 mocked rows of fake but realistic data.
3. "Cliquez pour voir le rapport complet" — link to a static example page on /demo/exemple.
4. Final CTA: "Lancer ma démo" → /contact?from=demo.
`

const LEGAL: Record<string, (p: PortfolioProduct) => string> = {
  cgu: (p) => `
Standard French CGU page for SaaS ${p.name}. Sections: Objet, Acceptation, Compte, Tarifs, Obligations, Propriété intellectuelle, Données, Responsabilité, Résiliation, Loi applicable. Each section: H2 + 2-3 sentences. End with "Dernière mise à jour : 2026-04-26".
`,
  cgv: (p) => `
Standard French CGV page for SaaS ${p.name}. Sections: Champ d'application, Prix, Paiement, Renouvellement, Annulation, Garanties, Réclamations, Droit applicable. End with "Dernière mise à jour : 2026-04-26".
`,
  'mentions-legales': (p) => `
Standard French Mentions Légales page. Sections: Éditeur, Hébergement, Directeur de publication, Propriété intellectuelle, Crédits. Editor placeholder: "${p.name} SAS, RCS Paris, contact@${p.repoName}.com". Hosting: "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789".
`,
  privacy: (p) => `
Standard French Privacy Policy (RGPD). Sections: Données collectées, Finalité, Base légale, Conservation, Destinataires, Droits, Cookies, DPO, Réclamation CNIL. End with last update date 2026-04-26.
`,
}

export function buildPrompt(
  product: PortfolioProduct,
  pageType: PageType,
  brief: string,
): { system: string; prompt: string } {
  let body = ''
  switch (pageType) {
    case 'home':     body = HOME(product); break
    case 'services': body = SERVICES(product); break
    case 'offres':   body = OFFRES(product); break
    case 'faq':      body = FAQ(product); break
    case 'contact':  body = CONTACT(product); break
    case 'demo':     body = DEMO(product); break
    case 'cgu':
    case 'cgv':
    case 'mentions-legales':
    case 'privacy':
      body = LEGAL[pageType](product); break
  }

  const system = `You are a senior Next.js React engineer producing production page TSX. ${commonReplaced(COMMON_RULES, product)}`
  const prompt = `${header(product, pageType)}
SECTION BRIEF (from operator):
${brief.trim() || '(no extra brief — use the description above)'}

${body.trim()}

OUTPUT — single TSX block, nothing else.`

  return { system, prompt }
}
