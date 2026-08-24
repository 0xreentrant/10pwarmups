import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MOVE_TIMESTAMPS } from "../../data/moveTimestamps"
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
  it("returns nulls when the deck has no tagged timestamps", () => {
    const { result } = renderHook(() => useMoveTimeline("untagged", 5, fakeVideo(10)))
    const timeline = result.current!

    expect(timeline.timestamps).toEqual([null, null, null, null, null])
    expect(timeline.moveIndexAt(0)).toBe(-1)
    expect(timeline.moveIndexAt(5)).toBe(-1)
  })

  it("uses tagged timestamps for A1", () => {
    const { result } = renderHook(() =>
      useMoveTimeline("A1", MOVE_TIMESTAMPS.A1.length, fakeVideo(50)),
    )
    expect(result.current!.timestamps).toEqual(MOVE_TIMESTAMPS.A1)
    expect(result.current!.moveIndexAt(0)).toBe(0)
    expect(result.current!.moveIndexAt(12)).toBe(1)
    expect(result.current!.moveIndexAt(40)).toBe(3)
    expect(result.current!.moveIndexAt(44)).toBe(4)
  })

  it("keeps a stable identity across re-renders so playback effects do not restart", () => {
    const video = fakeVideo(10)
    const { result, rerender } = renderHook(() => useMoveTimeline("untagged", 5, video))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it("uses a fallback duration when no video element is present", () => {
    const { result } = renderHook(() => useMoveTimeline("untagged", 5, null, 30))
    expect(result.current!.duration).toBe(30)
    expect(result.current!.timestamps).toEqual([null, null, null, null, null])
  })

  it("uses latest start time when overrides are unsorted", () => {
    const times = [0, 3.79, 4.79, 6.24, 6.03, 7.54]
    const { result } = renderHook(() =>
      useMoveTimeline("A2", times.length, fakeVideo(50), 30, times),
    )
    expect(result.current!.moveIndexAt(6.24)).toBe(3)
    expect(result.current!.moveIndexAt(6.1)).toBe(4)
  })
})
