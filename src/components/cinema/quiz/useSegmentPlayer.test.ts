import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useSegmentPlayer } from "./useSegmentPlayer"

function fakeVideo(): HTMLVideoElement {
  let currentTime = 0
  let paused = true
  let playbackRate = 1
  return {
    get currentTime() {
      return currentTime
    },
    set currentTime(value: number) {
      currentTime = value
    },
    get paused() {
      return paused
    },
    get playbackRate() {
      return playbackRate
    },
    set playbackRate(value: number) {
      playbackRate = value
    },
    get ended() {
      return false
    },
    pause() {
      paused = true
    },
    play() {
      paused = false
      return Promise.resolve()
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLVideoElement
}

describe("useSegmentPlayer", () => {
  it("pauses and resumes an active reveal segment", () => {
    const video = fakeVideo()
    const onEnd = vi.fn()
    const { result } = renderHook(() => useSegmentPlayer(video))

    act(() => {
      result.current.play({ from: 0, to: 10 }, { onEnd })
    })

    expect(result.current.segmentActive).toBe(true)
    expect(result.current.segmentPaused).toBe(false)

    act(() => {
      video.currentTime = 4
      expect(result.current.togglePlayback()).toBe(true)
    })

    expect(video.paused).toBe(true)
    expect(result.current.segmentPaused).toBe(true)

    act(() => {
      expect(result.current.togglePlayback()).toBe(true)
    })

    expect(video.paused).toBe(false)
    expect(result.current.segmentPaused).toBe(false)
    expect(onEnd).not.toHaveBeenCalled()
  })
})
