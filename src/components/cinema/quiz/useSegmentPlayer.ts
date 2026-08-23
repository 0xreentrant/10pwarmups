import { useCallback, useEffect, useRef } from "react"
import { isFiniteTimestamp, nextPlayableMoveIndex, prevPlayableMoveIndex } from "../../../data/moveTimestamps"
import type { MoveTimeline } from "../useMoveTimeline"

export interface Segment {
  from: number
  to: number
}

/** The tape the quiz is allowed to show: everything up to the move being asked. */
export function leadInSegment(timeline: MoveTimeline, moveIdx: number): Segment {
  const to = timeline.timestamps[moveIdx]
  const prev = prevPlayableMoveIndex(timeline.timestamps, moveIdx)
  const from = prev >= 0 ? timeline.timestamps[prev]! : 0
  return { from, to: isFiniteTimestamp(to) ? to : from }
}

/** The answer itself, played back only once the guess is locked in. */
export function revealSegment(timeline: MoveTimeline, moveIdx: number): Segment {
  const from = timeline.timestamps[moveIdx]
  const next = nextPlayableMoveIndex(timeline.timestamps, moveIdx)
  const to = next >= 0 ? timeline.timestamps[next]! : timeline.duration
  return { from: isFiniteTimestamp(from) ? from : 0, to }
}

interface PlayOptions {
  rate?: number
  onEnd?: () => void
}

const EMPTY_SEGMENT_SEC = 0.06

export function useSegmentPlayer(videoEl: HTMLVideoElement | null) {
  const rafRef = useRef(0)

  const cancel = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  useEffect(() => cancel, [cancel])

  const hold = useCallback((time: number) => {
    cancel()
    if (!videoEl) return
    videoEl.pause()
    videoEl.playbackRate = 1
    videoEl.currentTime = time
  }, [cancel, videoEl])

  const play = useCallback((segment: Segment, options: PlayOptions = {}) => {
    const { rate = 1, onEnd } = options
    if (!videoEl) {
      onEnd?.()
      return
    }
    cancel()

    if (segment.to - segment.from < EMPTY_SEGMENT_SEC) {
      videoEl.pause()
      videoEl.currentTime = segment.to
      onEnd?.()
      return
    }

    videoEl.playbackRate = rate
    videoEl.currentTime = segment.from

    const watch = () => {
      if (videoEl.currentTime >= segment.to || videoEl.ended) {
        videoEl.pause()
        videoEl.playbackRate = 1
        rafRef.current = 0
        onEnd?.()
        return
      }
      rafRef.current = requestAnimationFrame(watch)
    }

    const started = videoEl.play()
    if (started && typeof started.catch === "function") started.catch(() => {})
    rafRef.current = requestAnimationFrame(watch)
  }, [cancel, videoEl])

  return { play, hold, cancel }
}
