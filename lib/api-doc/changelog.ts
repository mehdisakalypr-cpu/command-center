import type { Endpoint, EndpointParam, ParsedAST } from './types'

export interface ChangelogChange {
  kind:
    | 'endpoint_added'
    | 'endpoint_removed'
    | 'param_added_required'
    | 'param_removed'
    | 'param_optional_to_required'
    | 'response_code_removed'
    | 'summary_changed'
  breaking: boolean
  path: string
  method: string
  detail: string
}

export interface ChangelogDiff {
  from_version: string | null
  to_version: string
  breaking_count: number
  non_breaking_count: number
  changes: ChangelogChange[]
}

function key(e: Pick<Endpoint, 'path' | 'method'>): string {
  return `${e.method.toUpperCase()} ${e.path}`
}

function indexParams(params: EndpointParam[]): Map<string, EndpointParam> {
  const m = new Map<string, EndpointParam>()
  for (const p of params) m.set(`${p.in}:${p.name}`, p)
  return m
}

export function computeChangelog(
  prev: ParsedAST | null,
  next: ParsedAST,
  prevVersion: string | null,
  nextVersion: string,
): ChangelogDiff {
  const changes: ChangelogChange[] = []

  if (!prev) {
    return {
      from_version: null,
      to_version: nextVersion,
      breaking_count: 0,
      non_breaking_count: next.endpoints.length,
      changes: next.endpoints.map((e) => ({
        kind: 'endpoint_added',
        breaking: false,
        path: e.path,
        method: e.method,
        detail: `initial: ${key(e)}`,
      })),
    }
  }

  const prevMap = new Map(prev.endpoints.map((e) => [key(e), e]))
  const nextMap = new Map(next.endpoints.map((e) => [key(e), e]))

  for (const [k, ep] of prevMap) {
    if (!nextMap.has(k)) {
      changes.push({
        kind: 'endpoint_removed',
        breaking: true,
        path: ep.path,
        method: ep.method,
        detail: `removed ${k}`,
      })
    }
  }

  for (const [k, ep] of nextMap) {
    if (!prevMap.has(k)) {
      changes.push({
        kind: 'endpoint_added',
        breaking: false,
        path: ep.path,
        method: ep.method,
        detail: `added ${k}`,
      })
      continue
    }

    const prevEp = prevMap.get(k)!
    const prevParams = indexParams(prevEp.params)
    const nextParams = indexParams(ep.params)

    for (const [pk, np] of nextParams) {
      const pp = prevParams.get(pk)
      if (!pp) {
        if (np.required) {
          changes.push({
            kind: 'param_added_required',
            breaking: true,
            path: ep.path,
            method: ep.method,
            detail: `param requis ajouté: ${np.in}.${np.name}`,
          })
        }
        continue
      }
      if (!pp.required && np.required) {
        changes.push({
          kind: 'param_optional_to_required',
          breaking: true,
          path: ep.path,
          method: ep.method,
          detail: `param ${np.in}.${np.name} optionnel → requis`,
        })
      }
    }

    for (const [pk, pp] of prevParams) {
      if (!nextParams.has(pk)) {
        changes.push({
          kind: 'param_removed',
          breaking: true,
          path: ep.path,
          method: ep.method,
          detail: `param supprimé: ${pp.in}.${pp.name}`,
        })
      }
    }

    const prevCodes = new Set(Object.keys(prevEp.response_schemas ?? {}))
    const nextCodes = new Set(Object.keys(ep.response_schemas ?? {}))
    for (const c of prevCodes) {
      if (!nextCodes.has(c)) {
        changes.push({
          kind: 'response_code_removed',
          breaking: true,
          path: ep.path,
          method: ep.method,
          detail: `response ${c} supprimée`,
        })
      }
    }

    if ((prevEp.summary ?? '') !== (ep.summary ?? '')) {
      changes.push({
        kind: 'summary_changed',
        breaking: false,
        path: ep.path,
        method: ep.method,
        detail: `summary: "${prevEp.summary ?? ''}" → "${ep.summary ?? ''}"`,
      })
    }
  }

  const breaking_count = changes.filter((c) => c.breaking).length
  return {
    from_version: prevVersion,
    to_version: nextVersion,
    breaking_count,
    non_breaking_count: changes.length - breaking_count,
    changes,
  }
}
