export type BusinessSource =
  | 'hisoka'
  | 'ftg'
  | 'ofa'
  | 'estate'
  | 'shiftdynamics'
  | 'gapup'
  | 'manual';

export type BusinessStatus = 'active' | 'paused' | 'archived';

export type BusinessStack = {
  framework?: string;
  llc_id?: string | null;
  stripe_account_id?: string | null;
  domain?: string;
  origin?: string;
  monthly_mrr?: number;
  [key: string]: unknown;
};

export type Business = {
  id: string;
  slug: string;
  name: string;
  source: BusinessSource;
  origin_idea_id: string | null;
  status: BusinessStatus;
  domain: string | null;
  stack: BusinessStack;
  created_at: string;
  updated_at: string;
};

export const ALL_BUSINESSES_SLUG = '__all__';

export function publicUrlForBusiness(b: Pick<Business, 'slug' | 'domain'>): string {
  if (b.domain) return `https://${b.domain}`;
  return `https://${b.slug}.gapup.io`;
}
