import { useCallback, useEffect, useRef, useState } from "react"
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
  const activeRef = useRef<{ segment: Segment; options: PlayOptions } | null>(null)
  const [segmentActive, setSegmentActive] = useState(false)
  const [segmentPaused, setSegmentPaused] = useState(false)

  const clearActive = useCallback(() => {
    activeRef.current = null
    setSegmentActive(false)
    setSegmentPaused(false)
  }, [])

  const cancel = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  useEffect(() => cancel, [cancel])

  const hold = useCallback((time: number) => {
    cancel()
    clearActive()
    if (!videoEl) return
    videoEl.pause()
    videoEl.playbackRate = 1
    videoEl.currentTime = time
  }, [cancel, clearActive, videoEl])

  const play = useCallback((segment: Segment, options: PlayOptions = {}) => {
    const { rate = 1, onEnd } = options
    if (!videoEl) {
      onEnd?.()
      return
    }
    cancel()

    if (segment.to - segment.from < EMPTY_SEGMENT_SEC) {
      clearActive()
      videoEl.pause()
      videoEl.currentTime = segment.to
      onEnd?.()
      return
    }

    // Offline / broken src: advance without waiting on a tape that never moves.
    if (videoEl.error || videoEl.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      clearActive()
      onEnd?.()
      return
    }

    activeRef.current = { segment, options: { rate, onEnd } }
    setSegmentActive(true)
    setSegmentPaused(false)

    videoEl.playbackRate = rate
    videoEl.currentTime = segment.from

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      videoEl.pause()
      videoEl.playbackRate = 1
      rafRef.current = 0
      clearActive()
      onEnd?.()
    }

    const watch = () => {
      if (videoEl.error || videoEl.currentTime >= segment.to || videoEl.ended) {
        finish()
        return
      }
      rafRef.current = requestAnimationFrame(watch)
    }

    const started = videoEl.play()
    if (started && typeof started.catch === "function") {
      started.catch(() => {
        cancel()
        finish()
      })
    }
    rafRef.current = requestAnimationFrame(watch)
  }, [cancel, clearActive, videoEl])

  const togglePlayback = useCallback((): boolean => {
    if (!videoEl || !activeRef.current) return false
    const { segment, options } = activeRef.current
    if (!videoEl.paused) {
      cancel()
      videoEl.pause()
      setSegmentPaused(true)
      return true
    }
    if (videoEl.currentTime >= segment.to) return false
    play({ from: videoEl.currentTime, to: segment.to }, options)
    return true
  }, [cancel, play, videoEl])

  return { play, hold, cancel, togglePlayback, segmentActive, segmentPaused }
}
