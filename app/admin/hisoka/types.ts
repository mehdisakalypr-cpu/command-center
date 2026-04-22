export type IdeaRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  autonomy_score: number;
  score: number;
  rank: number | null;
  llc_gate: 'none' | 'needs_llc' | 'post_expat' | 'blocked';
  assets_leveraged: string[] | null;
  leverage_configs: Array<{ label: string; leverage: number }> | null;
};
