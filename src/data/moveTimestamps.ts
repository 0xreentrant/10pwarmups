/** Per-deck move start times (seconds), from /tagger. null = not tagged yet. */

export let MOVE_TIMESTAMPS: Record<string, (number | null)[]> = {}

export function applyMoveTimestamps(next: Record<string, (number | null)[]>) {
  MOVE_TIMESTAMPS = next
}

function alignTaggedTimestamps(
  tagged: readonly (number | null)[] | undefined,
  moveCount: number,
): (number | null)[] {
  if (moveCount <= 0) return []
  if (!tagged?.length) return Array.from({ length: moveCount }, () => null)
  const out = tagged.slice(0, moveCount)
  while (out.length < moveCount) out.push(null)
  return out
}

/** Saved tags by move index; pad with null when deck grew, truncate when it shrank. */
export function resolveMoveTimestamps(
  deckId: string,
  moveCount: number,
  _duration: number,
): (number | null)[] {
  return alignTaggedTimestamps(MOVE_TIMESTAMPS[deckId], moveCount)
}

export function playableIndicesFromTimestamps(
  timestamps: readonly (number | null | undefined)[],
): number[] {
  return timestamps
    .map((t, i) => (isFiniteTimestamp(t) ? i : -1))
    .filter(i => i >= 0)
}

/** Quiz order: all moves, or only those with a tagged start time. */
export function playableMoveIndices(
  deckId: string,
  moveCount: number,
  timestamps?: readonly (number | null)[],
): number[] {
  const tagged = timestamps ?? alignTaggedTimestamps(MOVE_TIMESTAMPS[deckId], moveCount)
  if (tagged.length === moveCount) {
    const playable = playableIndicesFromTimestamps(tagged)
    if (playable.length > 0 && playable.length < moveCount) return playable
  }
  return Array.from({ length: moveCount }, (_, i) => i)
}

export function prevPlayableMoveIndex(
  timestamps: readonly (number | null | undefined)[],
  moveIdx: number,
): number {
  for (let i = moveIdx - 1; i >= 0; i--) {
    if (isFiniteTimestamp(timestamps[i])) return i
  }
  return -1
}

export function nextPlayableMoveIndex(
  timestamps: readonly (number | null | undefined)[],
  moveIdx: number,
): number {
  for (let i = moveIdx + 1; i < timestamps.length; i++) {
    if (isFiniteTimestamp(timestamps[i])) return i
  }
  return -1
}

export function clampPrevPlayable(
  timestamps: readonly (number | null | undefined)[],
  from: number,
): number {
  const prev = prevPlayableMoveIndex(timestamps, from)
  if (prev >= 0) return prev
  return playableIndicesFromTimestamps(timestamps)[0] ?? 0
}

export function clampNextPlayable(
  timestamps: readonly (number | null | undefined)[],
  from: number,
): number {
  const next = nextPlayableMoveIndex(timestamps, from)
  if (next >= 0) return next
  const playable = playableIndicesFromTimestamps(timestamps)
  return playable[playable.length - 1] ?? from
}

export function isFiniteTimestamp(t: number | null | undefined): t is number {
  return typeof t === "number" && Number.isFinite(t)
}

/**
 * Move whose start is the latest at or before time (by time value, not list order).
 * Sorted lists match index-scan; unsorted tags (e.g. A2) still pick the true current start.
 * Skips null/NaN slots; returns -1 when no finite start is at or before time.
 */
export function moveIndexAtTime(
  timestamps: readonly (number | null | undefined)[],
  time: number,
): number {
  let idx = -1
  let bestT = -Infinity
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i]
    if (!isFiniteTimestamp(t)) continue
    if (time >= t && t >= bestT) {
      bestT = t
      idx = i
    }
  }
  return idx
}
