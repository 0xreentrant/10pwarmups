/** Map a pointer X on the track rect to a clamped time in [0, duration]. */
export function timeFromClientX(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  duration: number,
): number {
  if (duration <= 0 || trackWidth <= 0) return 0
  const ratio = (clientX - trackLeft) / trackWidth
  return Math.min(duration, Math.max(0, ratio * duration))
}

export { isFiniteTimestamp, moveIndexAtTime } from "../../data/moveTimestamps"

export type ParseTimestampsResult =
  | { ok: true; timestamps: (number | null)[] }
  | { ok: false; error: string }

/** Parse tagger JSON: `{ deckId?, timestamps: (number|null)[] | { name?, t }[] }`. deckId ignored. */
export function parseTimestampsJson(text: string, moveCount: number): ParseTimestampsResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: "Invalid JSON" }
  }
  if (!raw || typeof raw !== "object" || !("timestamps" in raw)) {
    return { ok: false, error: "Missing timestamps" }
  }
  const list = (raw as { timestamps: unknown }).timestamps
  if (!Array.isArray(list)) {
    return { ok: false, error: "timestamps must be an array" }
  }
  if (list.length > moveCount) {
    return { ok: false, error: `Need at most ${moveCount} timestamps, got ${list.length}` }
  }
  const timestamps: (number | null)[] = []
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (item === null) {
      timestamps.push(null)
      continue
    }
    if (typeof item === "number" && Number.isFinite(item)) {
      timestamps.push(item)
      continue
    }
    if (item && typeof item === "object" && "t" in item) {
      const t = (item as { t: unknown }).t
      if (t === null) {
        timestamps.push(null)
        continue
      }
      if (typeof t === "number" && Number.isFinite(t)) {
        timestamps.push(t)
        continue
      }
    }
    return { ok: false, error: `Bad timestamp at index ${i}` }
  }
  while (timestamps.length < moveCount) timestamps.push(null)
  return { ok: true, timestamps }
}
