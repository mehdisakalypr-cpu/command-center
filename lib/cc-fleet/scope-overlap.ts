// Scope overlap detection — glob-ensemblist test.
// Two scopes overlap if ANY path matched by scope A could also be matched by scope B.

import { CRITICAL_ZONES } from './types'

function globToRegex(glob: string): RegExp {
  // Minimal glob → regex: ** = any, * = segment, ? = single char.
  // Trailing /** also matches the folder itself.
  let src = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex metachars except * ?
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
  return new RegExp('^' + src + '$')
}

function pathMatches(path: string, glob: string): boolean {
  return globToRegex(glob).test(path)
}

// A pseudo-path "representative" of a glob is the prefix before any wildcard.
// We sample both directions: does any glob-A match any literal prefix of glob-B?
function prefixOf(glob: string): string {
  const idx = glob.search(/[*?]/)
  return idx === -1 ? glob : glob.slice(0, idx).replace(/\/$/, '')
}

export function scopesOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  for (const ga of a) {
    for (const gb of b) {
      if (ga === gb) return true
      // If one is a prefix zone of the other, they overlap.
      const pa = prefixOf(ga)
      const pb = prefixOf(gb)
      if (pa && pb) {
        if (pa === pb) return true
        if (pa.startsWith(pb + '/') || pb.startsWith(pa + '/')) return true
      }
      // Regex cross-check: does glob A match glob B's literal prefix, or vice versa.
      if (pa && pathMatches(pa, gb)) return true
      if (pb && pathMatches(pb, ga)) return true
    }
  }
  return false
}

export function touchesCriticalZone(scope: string[]): boolean {
  for (const g of scope) {
    if (scopesOverlap([g], CRITICAL_ZONES)) return true
  }
  return false
}
