import { useEffect, useMemo, useState } from "react"
import { moveIndexAtTime, resolveMoveTimestamps } from "../../data/moveTimestamps"
import { FALLBACK_TIMELINE_SEC } from "../../utils/deckVideo"

export interface MoveTimeline {
  duration: number
  timestamps: number[]
  moveIndexAt: (time: number) => number
}

export function useMoveTimeline(
  deckId: string,
  moveCount: number,
  videoEl: HTMLVideoElement | null,
  fallbackDurationSec = FALLBACK_TIMELINE_SEC,
  /** When length matches moveCount, used instead of MOVE_TIMESTAMPS / equal slice. */
  timestampOverrides?: number[] | null,
): MoveTimeline | null {
  const [duration, setDuration] = useState<number | null>(() =>
    videoEl ? null : fallbackDurationSec,
  )

  useEffect(() => {
    if (!videoEl) {
      setDuration(fallbackDurationSec)
      return
    }
    if (videoEl.readyState >= 1 && videoEl.duration) {
      setDuration(videoEl.duration)
      return
    }
    const onLoaded = () => setDuration(videoEl.duration)
    videoEl.addEventListener("loadedmetadata", onLoaded)
    return () => videoEl.removeEventListener("loadedmetadata", onLoaded)
  }, [videoEl, fallbackDurationSec])

  // Stable identity: consumers key playback effects on this object, so a new
  // one per render would restart the clip on every unrelated state change.
  return useMemo(() => {
    if (!duration) return null

    const timestamps =
      timestampOverrides && timestampOverrides.length === moveCount
        ? timestampOverrides
        : resolveMoveTimestamps(deckId, moveCount, duration)

    return {
      duration,
      timestamps,
      moveIndexAt: (time: number) => moveIndexAtTime(timestamps, time),
    }
  }, [deckId, duration, moveCount, timestampOverrides])
}
