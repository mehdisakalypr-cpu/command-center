// Anti-loop detection (v2 §2). Called by dispatcher before accepting a heartbeat/progress update.
// Returns {shouldAbort, reason} — abort action is caller's responsibility.

export interface AntiLoopState {
  tool_errors_consecutive: number       // incremented by dispatcher on tool error
  file_edits_same_file: Record<string, number>  // path → count w/o green test
  progress_hashes: string[]             // last N progress hashes
}

export const MAX_TOOL_ERRORS = 5
export const MAX_SAME_FILE_EDITS = 3
export const ZOMBIE_SAME_HASH_TICKS = 3
export const HEARTBEAT_STALE_MS = 15 * 60 * 1000  // 15 min

export function antiLoopCheck(
  s: AntiLoopState,
  heartbeatAgeMs: number | null,
): { shouldAbort: boolean; reason?: string } {
  if (s.tool_errors_consecutive >= MAX_TOOL_ERRORS) {
    return { shouldAbort: true, reason: `${MAX_TOOL_ERRORS} consecutive tool errors` }
  }
  for (const [path, n] of Object.entries(s.file_edits_same_file)) {
    if (n >= MAX_SAME_FILE_EDITS) {
      return { shouldAbort: true, reason: `${n} edits to ${path} without green test` }
    }
  }
  if (s.progress_hashes.length >= ZOMBIE_SAME_HASH_TICKS) {
    const tail = s.progress_hashes.slice(-ZOMBIE_SAME_HASH_TICKS)
    if (new Set(tail).size === 1) {
      return { shouldAbort: true, reason: `progress hash stuck for ${ZOMBIE_SAME_HASH_TICKS} ticks` }
    }
  }
  if (heartbeatAgeMs !== null && heartbeatAgeMs > HEARTBEAT_STALE_MS) {
    return { shouldAbort: true, reason: `heartbeat stale ${Math.round(heartbeatAgeMs / 60000)}min` }
  }
  return { shouldAbort: false }
}
