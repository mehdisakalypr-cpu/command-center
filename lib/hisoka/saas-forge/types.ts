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
  /** Visual prompt describing a concrete use-case scene (who, doing what, how the product helps — visualized). Used to generate hero_image_url. */
  hero_image_prompt?: string;
  /** Pollinations-rendered use-case illustration, full-width hero background. */
  hero_image_url?: string;
  generated_with?: string;
};

export type LandingRenderResult =
  | { ok: true; content: LandingContent; cost_usd: number; provider: string }
  | { ok: false; error: string };
