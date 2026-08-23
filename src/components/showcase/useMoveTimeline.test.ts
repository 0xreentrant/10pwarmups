import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useMoveTimeline } from "./useMoveTimeline"

function fakeVideo(duration: number): HTMLVideoElement {
  return {
    readyState: 1,
    duration,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLVideoElement
}

describe("useMoveTimeline", () => {
  it("spreads moves evenly across the clip and maps time back to move index", () => {
    const { result } = renderHook(() => useMoveTimeline(5, fakeVideo(10)))
    const timeline = result.current!

    expect(timeline.timestamps).toEqual([0, 2, 4, 6, 8])
    expect(timeline.moveIndexAt(0)).toBe(0)
    expect(timeline.moveIndexAt(5)).toBe(2)
    expect(timeline.moveIndexAt(9.9)).toBe(4)
  })

  it("keeps a stable identity across re-renders so playback effects do not restart", () => {
    const video = fakeVideo(10)
    const { result, rerender } = renderHook(() => useMoveTimeline(5, video))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it("returns null until the video element is available", () => {
    const { result } = renderHook(() => useMoveTimeline(5, null))
    expect(result.current).toBeNull()
  })
})
