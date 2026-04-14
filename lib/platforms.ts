/**
 * Platform registry — une définition unique par produit. Utilisée par /admin/platforms
 * et par l'ingest infra + documents + comptabilité pour normaliser les scopes.
 */
export type PlatformKey = 'ofa' | 'ftg' | 'cc' | 'estate' | 'shift'

export type Platform = {
  key: PlatformKey
  name: string
  icon: string
  color: string
  public_url?: string
  admin_url?: string
  production_ready: boolean                // is it past the launch checklist?
  launch_target?: string                   // ISO date
  description: string
}

export const PLATFORMS: Record<PlatformKey, Platform> = {
  ofa: {
    key: 'ofa', name: 'One For All', icon: '🏗️', color: '#C9A84C',
    public_url: 'https://oneforall.app',
    admin_url: 'https://one-for-all-app.vercel.app/admin',
    production_ready: false, launch_target: '2026-05-01',
    description: 'AI-generated websites + SEO/GEO Boost for SMBs worldwide',
  },
  ftg: {
    key: 'ftg', name: 'Feel The Gap', icon: '📊', color: '#0284c7',
    public_url: 'https://feelthegap.world',
    admin_url: 'https://feel-the-gap.vercel.app/admin',
    production_ready: false, launch_target: '2026-05-08',
    description: 'Global trade data + AI business plans SaaS',
  },
  cc: {
    key: 'cc', name: 'Command Center', icon: '🎛️', color: '#A855F7',
    public_url: 'https://cc-dashboard.vercel.app',
    admin_url: 'https://cc-dashboard.vercel.app/admin',
    production_ready: true,
    description: 'Internal cockpit · agents · Minato · metrics',
  },
  estate: {
    key: 'estate', name: 'The Estate', icon: '🏨', color: '#10B981',
    production_ready: false, launch_target: '2026-06-01',
    description: 'Hotel SaaS · invest + operations',
  },
  shift: {
    key: 'shift', name: 'Shift Dynamics', icon: '📈', color: '#F59E0B',
    production_ready: false, launch_target: '2026-06-15',
    description: 'Consulting stratégique site + CRM',
  },
}

export const PLATFORM_TABS = [
  { key: 'documents', label: 'Documents', icon: '📑', desc: 'Contrats signés + factures + nomenclature' },
  { key: 'accounting', label: 'Comptabilité', icon: '💼', desc: 'Stripe↔Mercury, QBO class, CPA James Baker' },
  { key: 'launch',     label: 'Prod launch',  icon: '🚀', desc: 'Checklist pré-prod + capacité infra + coûts' },
] as const
export type PlatformTab = typeof PLATFORM_TABS[number]['key']
