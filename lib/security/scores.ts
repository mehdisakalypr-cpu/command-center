/**
 * Security scoring for CC cockpit.
 * Formula: score = 100 - (critical × 20 + high × 10 + medium × 3 + low × 1)
 * Capped in [0, 100]. Only counts items with status in open|in_progress.
 */

export type SecuritySite = 'ftg' | 'cc' | 'ofa' | 'estate' | 'shift' | 'global'
export type SecurityCategory =
  | 'backdoor' | 'auth' | 'middleware' | 'headers' | 'rls'
  | 'webhook' | 'secrets' | 'ddos' | 'deps' | 'cors'
  | 'incident' | 'stack'
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type SecurityStatus = 'open' | 'in_progress' | 'done' | 'wontfix' | 'verified'

export type SecurityItem = {
  id: string
  site: SecuritySite
  category: SecurityCategory
  severity: SecuritySeverity
  status: SecurityStatus
  title: string
  description: string | null
  remediation: string | null
  owner: string | null
  evidence_url: string | null
  commit_hash: string | null
  detected_at: string
  resolved_at: string | null
  updated_at: string
}

export type SeverityCounts = {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

const SEVERITY_WEIGHT: Record<SecuritySeverity, number> = {
  critical: 20,
  high: 10,
  medium: 3,
  low: 1,
  info: 0,
}

export function emptyCounts(): SeverityCounts {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
}

/** Count open/in_progress items by severity. done/wontfix/verified = resolved. */
export function countBySeverity(items: SecurityItem[]): SeverityCounts {
  const c = emptyCounts()
  for (const it of items) {
    if (it.status === 'done' || it.status === 'wontfix' || it.status === 'verified') continue
    c[it.severity] += 1
  }
  return c
}

/** Compute score 0-100 from counts. */
export function scoreFromCounts(c: SeverityCounts): number {
  const penalty =
    c.critical * SEVERITY_WEIGHT.critical +
    c.high * SEVERITY_WEIGHT.high +
    c.medium * SEVERITY_WEIGHT.medium +
    c.low * SEVERITY_WEIGHT.low
  const raw = 100 - penalty
  return Math.max(0, Math.min(100, raw))
}

export function scoreForSite(items: SecurityItem[], site: SecuritySite): number {
  return scoreFromCounts(countBySeverity(items.filter((i) => i.site === site)))
}

export function scoreColor(score: number): 'green' | 'orange' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'orange'
  return 'red'
}

export function scoreEmoji(score: number): string {
  const c = scoreColor(score)
  return c === 'green' ? '🟢' : c === 'orange' ? '🟠' : '🔴'
}

export const SITES: SecuritySite[] = ['ftg', 'cc', 'ofa', 'estate', 'shift', 'global']
export const CATEGORIES: SecurityCategory[] = [
  'backdoor', 'auth', 'middleware', 'headers', 'rls',
  'webhook', 'secrets', 'ddos', 'deps', 'cors',
]

export const SITE_LABELS: Record<SecuritySite, string> = {
  ftg: 'Feel The Gap',
  cc: 'Command Center',
  ofa: 'One For All',
  estate: 'The Estate',
  shift: 'Shift Dynamics',
  global: 'Transverse',
}

export const CATEGORY_LABELS: Record<SecurityCategory, string> = {
  backdoor: 'Backdoors',
  auth: 'Auth',
  middleware: 'Middleware',
  headers: 'HTTP Headers',
  rls: 'RLS Supabase',
  webhook: 'Webhooks',
  secrets: 'Secrets',
  ddos: 'DDoS/WAF',
  deps: 'Deps vulns',
  cors: 'CORS',
  incident: 'Incidents',
  stack: 'Stack',
}

export const SEVERITY_LABELS: Record<SecuritySeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
}

export const STATUS_LABELS: Record<SecurityStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  wontfix: "Won't fix",
  verified: 'Verified',
}
