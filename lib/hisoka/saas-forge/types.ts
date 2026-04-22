export type LandingFeature = {
  title: string;
  description: string;
  icon: string;
};

export type LandingFAQ = {
  question: string;
  answer: string;
};

export type LandingContent = {
  hero_title: string;
  hero_tagline: string;
  hero_cta: string;
  features: LandingFeature[];
  faq: LandingFAQ[];
  footer_note: string;
  lang: string;
  generated_with?: string;
};

export type LandingRenderResult =
  | { ok: true; content: LandingContent; cost_usd: number; provider: string }
  | { ok: false; error: string };
