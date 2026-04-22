import { createSupabaseBrowser } from '@/lib/auth-v2/supabase';
import type { Business } from './types';

export async function fetchBusinessesClient(): Promise<Business[]> {
  const sb = createSupabaseBrowser();
  const { data, error } = await sb
    .from('businesses')
    .select('*')
    .eq('status', 'active')
    .order('name', { ascending: true });
  if (error) throw new Error(`fetchBusinessesClient: ${error.message}`);
  return (data ?? []) as Business[];
}
