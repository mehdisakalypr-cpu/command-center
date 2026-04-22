'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { fetchBusinessesClient } from './client';
import { ALL_BUSINESSES_SLUG, type Business } from './types';

type Ctx = {
  businesses: Business[];
  loading: boolean;
  selectedSlug: string;
  setSelectedSlug: (slug: string) => void;
  selected: Business | null;
  reload: () => Promise<void>;
};

const BusinessContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'cc_admin_selected_business';

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlugState] = useState<string>(ALL_BUSINESSES_SLUG);

  const reload = useCallback(async () => {
    try {
      const list = await fetchBusinessesClient();
      setBusinesses(list);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelectedSlugState(raw);
    } catch {}
    void reload();
  }, [reload]);

  const setSelectedSlug = useCallback((slug: string) => {
    setSelectedSlugState(slug);
    try { localStorage.setItem(STORAGE_KEY, slug); } catch {}
  }, []);

  const selected = selectedSlug === ALL_BUSINESSES_SLUG
    ? null
    : businesses.find(b => b.slug === selectedSlug) ?? null;

  return (
    <BusinessContext.Provider value={{ businesses, loading, selectedSlug, setSelectedSlug, selected, reload }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinesses(): Ctx {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusinesses must be used within BusinessProvider');
  return ctx;
}
