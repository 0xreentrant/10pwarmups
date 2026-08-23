import { useEffect, useMemo, useState } from "react"

export interface MoveTimeline {
  duration: number
  timestamps: number[]
  moveIndexAt: (time: number) => number
}

// ponytail: no per-move video tags exist yet, so each move gets an equal
// slice of the clip. Good enough to demo the sync interaction; the upgrade
// path is a small per-deck timestamp file (or a manual tagging pass) once a
// concept is picked for production.
export function useMoveTimeline(moveCount: number, videoEl: HTMLVideoElement | null): MoveTimeline | null {
  const [duration, setDuration] = useState<number | null>(null)

  useEffect(() => {
    if (!videoEl) return
    if (videoEl.readyState >= 1 && videoEl.duration) {
      setDuration(videoEl.duration)
      return
    }
    const onLoaded = () => setDuration(videoEl.duration)
    videoEl.addEventListener("loadedmetadata", onLoaded)
    return () => videoEl.removeEventListener("loadedmetadata", onLoaded)
  }, [videoEl])

  // Stable identity: consumers key playback effects on this object, so a new
  // one per render would restart the clip on every unrelated state change.
  return useMemo(() => {
    if (!duration) return null

    const step = duration / moveCount
    const timestamps = Array.from({ length: moveCount }, (_, i) => i * step)

    return {
      duration,
      timestamps,
      moveIndexAt: (time: number) => {
        let idx = 0
        for (let i = 0; i < timestamps.length; i++) {
          if (time >= timestamps[i]) idx = i
        }
        return idx
      },
    }
  }, [duration, moveCount])
}
