import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import type { Business } from './types';

export async function listBusinesses(opts: { onlyActive?: boolean } = {}): Promise<Business[]> {
  const admin = createSupabaseAdmin();
  let q = admin.from('businesses').select('*').order('name', { ascending: true });
  if (opts.onlyActive !== false) q = q.eq('status', 'active');
  const { data, error } = await q;
  if (error) throw new Error(`listBusinesses: ${error.message}`);
  return (data ?? []) as Business[];
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`getBusinessBySlug: ${error.message}`);
  return (data as Business | null) ?? null;
}

export async function getBusinessByDomain(domain: string): Promise<Business | null> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('businesses')
    .select('*')
    .eq('domain', domain)
    .maybeSingle();
  if (error) throw new Error(`getBusinessByDomain: ${error.message}`);
  return (data as Business | null) ?? null;
}
