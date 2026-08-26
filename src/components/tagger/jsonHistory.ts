export const DEFAULT_JSON_HISTORY_MAX = 50

export type JsonHistoryStacks = {
  past: string[]
  future: string[]
}

/** Push current onto past and clear future before applying next committed JSON. */
export function commitJsonHistory(
  past: string[],
  current: string,
  next: string,
  max = DEFAULT_JSON_HISTORY_MAX,
): JsonHistoryStacks | null {
  if (current === next || !current.trim()) return null
  return { past: [...past, current].slice(-max), future: [] }
}

export function undoJsonHistory(
  past: string[],
  future: string[],
  current: string,
): (JsonHistoryStacks & { current: string }) | null {
  if (past.length === 0) return null
  const previous = past[past.length - 1]!
  return {
    past: past.slice(0, -1),
    future: [current, ...future],
    current: previous,
  }
}

export function redoJsonHistory(
  past: string[],
  future: string[],
  current: string,
): (JsonHistoryStacks & { current: string }) | null {
  if (future.length === 0) return null
  const next = future[0]!
  return {
    past: [...past, current],
    future: future.slice(1),
    current: next,
  }
}
