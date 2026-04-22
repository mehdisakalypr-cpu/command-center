// Archetype → 3D-ish floating icon set for landing hero.
// Pure SVG + CSS 3D transforms, zero deps.

export type IconSet = {
  id: string;
  // Each item: viewBox 24 24 inline path(s). Kept small for bundle.
  icons: { path: string; color: string }[];
};

const MUSIC: IconSet = {
  id: 'music',
  icons: [
    { path: 'M9 17V5l12-2v12', color: '#ec4899' },
    { path: 'M9 17a3 3 0 1 0-3-3', color: '#f472b6' },
    { path: 'M21 15a3 3 0 1 0-3-3', color: '#f9a8d4' },
    { path: 'M9 9l12-2', color: '#a78bfa' },
  ],
};
const DATA: IconSet = {
  id: 'data',
  icons: [
    { path: 'M4 19h16M6 17V9m5 8V5m5 12v-6', color: '#10b981' },
    { path: 'M3 3h18v18H3z', color: '#34d399' },
    { path: 'M7 12l4-4 4 4 5-5', color: '#6ee7b7' },
    { path: 'M12 6v12M6 12h12', color: '#a7f3d0' },
  ],
};
const MARKETPLACE: IconSet = {
  id: 'marketplace',
  icons: [
    { path: 'M6 3h12l2 4H4l2-4zM4 7v13h16V7M10 12h4', color: '#f59e0b' },
    { path: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', color: '#fbbf24' },
    { path: 'M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18', color: '#fcd34d' },
  ],
};
const API: IconSet = {
  id: 'api',
  icons: [
    { path: 'M12 2L3 7l9 5 9-5-9-5zm-9 13l9 5 9-5M3 12l9 5 9-5', color: '#6366f1' },
    { path: 'M8 10h8v4H8z', color: '#818cf8' },
    { path: 'M6 6l4 4-4 4-4-4 4-4zm12 0l4 4-4 4-4-4 4-4z', color: '#a5b4fc' },
  ],
};
const LEGAL: IconSet = {
  id: 'legal',
  icons: [
    { path: 'M12 3v18M4 9l8-6 8 6M6 21h12M7 9l-3 7h6l-3-7zm10 0l-3 7h6l-3-7z', color: '#fbbf24' },
    { path: 'M7 3h10v2H7zM4 5h16v16H4z', color: '#fde68a' },
  ],
};
const CONTENT: IconSet = {
  id: 'content',
  icons: [
    { path: 'M4 4h16v16H4zM4 8h16M8 4v16', color: '#60a5fa' },
    { path: 'M12 5v14M5 12h14', color: '#93c5fd' },
    { path: 'M6 7l6 5 6-5M6 17l6-5 6 5', color: '#bfdbfe' },
  ],
};
const HR: IconSet = {
  id: 'hr',
  icons: [
    { path: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z', color: '#f472b6' },
    { path: 'M17 11a3 3 0 1 0-3-3M7 11a3 3 0 1 1 3-3', color: '#fbcfe8' },
  ],
};
const DEFAULT_SET: IconSet = {
  id: 'default',
  icons: [
    { path: 'M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7z', color: '#10b981' },
    { path: 'M12 2L2 22h20L12 2z', color: '#6366f1' },
    { path: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z', color: '#ec4899' },
  ],
};

const BY_CATEGORY: Record<string, IconSet> = {
  content_platform: CONTENT,
  tool_utility: API,
  middleware_api: API,
  b2b_integration: API,
  marketplace: MARKETPLACE,
  productized_service: HR,
};

const KEYWORD_HINTS: { re: RegExp; set: IconSet }[] = [
  { re: /music|audio|sound|voice|song/i, set: MUSIC },
  { re: /legal|compliance|law|gdpr|patent|contract/i, set: LEGAL },
  { re: /hr|recruit|hire|people|team|coach/i, set: HR },
  { re: /data|trend|analytics|market|sentiment|chart|sensor/i, set: DATA },
  { re: /marketplace|gig|freelance|match|seller|buyer/i, set: MARKETPLACE },
  { re: /content|blog|news|article|writer|seo/i, set: CONTENT },
];

export function pickSceneFor(args: {
  category?: string | null;
  slug?: string | null;
  name?: string | null;
}): IconSet {
  const { category, slug, name } = args;
  if (category && BY_CATEGORY[category]) return BY_CATEGORY[category];
  const text = `${slug ?? ''} ${name ?? ''}`;
  for (const h of KEYWORD_HINTS) {
    if (h.re.test(text)) return h.set;
  }
  return DEFAULT_SET;
}

export type SceneKind = 'music' | 'data' | 'marketplace' | 'api' | 'legal' | 'content' | 'hr' | 'default';

export function pickSceneKind(args: {
  category?: string | null;
  slug?: string | null;
  name?: string | null;
}): SceneKind {
  const set = pickSceneFor(args);
  return set.id as SceneKind;
}
