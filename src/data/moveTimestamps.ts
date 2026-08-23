/** Per-deck move start times (seconds), from /tagger. */
export const MOVE_TIMESTAMPS: Record<string, number[]> = {
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
    19.364475682904295,
    20.10709871295845,
    20.88685289451531,
    21.778000530580297,
    22.605329,
    24.112350933333335,
    25.61937286666667,
    27.126394800000003,
    28.633416733333334,
    30.140438666666668,
    31.647460600000002,
    33.154482533333336,
    34.66150446666667,
    36.168526400000005,
    37.67554833333334,
    39.18257026666667,
    40.6895922,
    42.196614133333334,
    43.70363606666667,
  ],
}

/** Tagged starts when length matches and times fit the clip; else equal slices. */
export function resolveMoveTimestamps(
  deckId: string,
  moveCount: number,
  duration: number,
): number[] {
  const tagged = MOVE_TIMESTAMPS[deckId]
  // ponytail: skip tags that overrun the clip (jsdom mock duration is 10s).
  if (
    tagged &&
    tagged.length === moveCount &&
    tagged.every(t => t <= duration)
  ) {
    return tagged
  }
  if (moveCount <= 0 || duration <= 0) return []
  const step = duration / moveCount
  return Array.from({ length: moveCount }, (_, i) => i * step)
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
