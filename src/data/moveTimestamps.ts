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
  A3: [
    null,
    0,
    0.704170721989579,
    1.9911870000000003,
    2.4543939999999997,
    3.2224559999999998,
    4.373849,
    null,
    5.913272,
    6.478855,
    9.926200000000001,
    null,
    11.483068000000001,
    15.145908,
    15.937336000000002,
    23.159136,
    24.582459,
    29.283205000000002,
    32.045508999999996,
    36.285678999999995,
    39.994146,
    42.433758999999995,
    46.110257999999995,
    47.23777204257904,
    48.215683999999996,
    54.013438,
    null,
    55.548387999999996,
  ],
  A4: [
    0,
    1.297639376850055,
    6.2221116374126115,
    8.769252461841521,
    12.917453233054317,
    13.936309562825878,
    15.367560121314504,
    17.55082368511071,
    20.29203238187706,
    23.383044,
    null,
    null,
    26.963115493476586,
    32.893132,
    39.259519,
    null,
  ]
,
  B1: [
    0,
    0.8878622592938027,
    1.84361,
    2.840561,
    3.580694,
    4.614002,
    5.951229,
    6.4953590000000005,
    7.639169,
    9.929073,
    12.277496,
    13.497192,
    16.147037,
    18.009732,
    27.129749,
    29.495878426977267,
    36.295784000000005,
    38.760262999999995,
    41.51595,
    46.056946,
    52.056940999999995,
  ]
,
  B2: [
    0,
    2.799984,
    5.309444663301616,
    8.84761959716914,
    15.156485,
    null,
    null,
    null,
    null,
    null,
    17.680886,
    20.30013319889823,
    null,
    28.632828,
    30.216334000395374,
    34.865024999999996,
    38.261914999999995,
    42.462317,
    51.000839000000006,
  ]
,
  B3: [
    null,
    null,
    null,
    null,
    0,
    1.0573459424275609,
    2.0865495974140837,
    3.8233307652038415,
    5.104498,
    7.3732180000000005,
    10.373205,
    14.949208,
    null,
    21.158569,
    25.646955000000002,
    27.425172,
    null,
    31.494374,
    34.034949000000005,
    36.948066999999995,
    38.162622000000006,
  ]
,
  H3: [
    0,
    0.6792283545584733,
    1.5528908986076122,
    2.0959784259895096,
    3.690528,
    4.690528,
    7.490527999999999,
    8.690520000000001,
    17.207979187920564,
    null,
    23.205554490311947,
    26.534917158174885,
    28.576454,
    29.904761,
    32.018495,
    34.999062,
  ]
,
  B4: [
    0,
    1.1329909999999999,
    null,
    null,
    null,
    3.562939,
    5.632935,
    6.600997109706008,
    7.653707635142735,
    9.363705,
    10.533701,
    11.883699,
    null,
    null,
    null,
    13.683695,
    15.933693,
    16.833693,
    17.463692,
    19.173692,
    21.063692,
    23.943692,
    24.303692,
    null,
    null,
  ]
,
  C1: [
    0,
    1.1699959999999998,
    null,
    null,
    null,
    2.6999869999999997,
    3.6899789999999997,
    null,
    4.409975,
    null,
    6.979182518503053,
    7.5191799999999995,
    9.409178,
    11.569176,
    13.279172,
    16.249167,
    17.419167,
    18.229167,
    20.119167,
    24.079167,
    25.159167,
    27.949167,
    28.579167,
  ]
,
  C2: [
    0,
    1.1514614401363443,
    5.062469535577333,
    5.979866496236331,
    6.655843204090329,
    7.380103962505327,
    9.045903706859823,
    11.559403,
    12.733271,
    14.164013066325806,
    15.395256355631304,
    16.454943,
    18.354601,
    21.423631,
    23.90317,
    26.342198,
    29.703184,
    33.060865,
    35.393954,
    39.151009231643236,
    41.17893935520523,
    45.077507,
    47.71221,
    52.38752,
    56.75054566112768,
    60.68569578184918,
    61.53066666666667,
    62.25492742508167,
    63.12404033517967,
  ]
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
