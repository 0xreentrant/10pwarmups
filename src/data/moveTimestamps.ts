/** Per-deck move start times (seconds), from /tagger. null = not tagged yet. */
export const MOVE_TIMESTAMPS: Record<string, (number | null)[]> = {
  A1: [
    0,
    11.12784969140625,
    23.59028144140625,
    35.900732316406256,
    43.955718691406254,
  ],
  A2: [
    0,
    3.7879576275184155,
    4.734801990837461,
    5.8858676874214,
    6.925539929497216,
    7.482507202037831,
    10.118818958730078,
    11.604065018838385,
    14.760212896568541,
    16.022672047660603,
    17.84209847129328,
    null,
    19.727183508614903,
    20.882138,
    21.930241,
    22.469932,
    24.184998,
    null,
    null,
    null,
    null,
    null,
    26.213021,
    30.424569603066274,
    null,
    33.630115,
    38.40995864457656,
    null,
    null,
    null,
  ],
}

/** Tagged starts when length matches and times fit the clip; else equal slices. */
export function resolveMoveTimestamps(
  deckId: string,
  moveCount: number,
  duration: number,
): (number | null)[] {
  const tagged = MOVE_TIMESTAMPS[deckId]
  // ponytail: skip tags that overrun the clip (jsdom mock duration is 10s).
  if (
    tagged &&
    tagged.length === moveCount &&
    tagged.every(t => !isFiniteTimestamp(t) || t <= duration)
  ) {
    return tagged
  }
  if (moveCount <= 0 || duration <= 0) return []
  const step = duration / moveCount
  return Array.from({ length: moveCount }, (_, i) => i * step)
}

export function playableIndicesFromTimestamps(
  timestamps: readonly (number | null | undefined)[],
): number[] {
  return timestamps
    .map((t, i) => (isFiniteTimestamp(t) ? i : -1))
    .filter(i => i >= 0)
}

/** Quiz order: all moves, or only those with a tagged start time. */
export function playableMoveIndices(deckId: string, moveCount: number): number[] {
  const tagged = MOVE_TIMESTAMPS[deckId]
  if (tagged?.length === moveCount) {
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
