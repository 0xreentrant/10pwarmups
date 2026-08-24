import { act, renderHook } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import type { Deck, Session } from "../../../types/domain"
import { CORRECT_REVEAL_PLAYBACK_RATE, useAnteRound } from "./useAnteRound"

const play = vi.fn()
const hold = vi.fn()
const cancel = vi.fn()
const togglePlayback = vi.fn(() => false)

vi.mock("../quiz/useSegmentPlayer", async importOriginal => {
  const actual = await importOriginal<typeof import("../quiz/useSegmentPlayer")>()
  return {
    ...actual,
    useSegmentPlayer: () => ({
      play,
      hold,
      cancel,
      togglePlayback,
      segmentActive: false,
      segmentPaused: false,
    }),
  }
})

const deck: Deck = {
  id: "test",
  name: "Test",
  series: "A",
  moves: [
    { text: "Move A", partner: "A" },
    { text: "Move B", partner: "A" },
    { text: "Move C", partner: "A" },
  ],
}

const timestamps = [0, 10, 20]

function makeSession(): Session {
  return {
    moveSequence: [],
    moveOrder: [0, 1, 2],
    currentStreak: 0,
    startTime: Date.now(),
    pausedAt: null,
    accumulatedPauseMs: 0,
    allOptions: [],
    options: [
      { text: "Wrong", correct: false },
      { text: "Move A", correct: true },
      { text: "Other", correct: false },
    ],
    locked: false,
  }
}

function fakeVideo(duration = 30): HTMLVideoElement {
  return {
    readyState: 1,
    duration,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLVideoElement
}

describe("useAnteRound wrong-answer playback", () => {
  beforeEach(() => {
    play.mockReset()
    hold.mockReset()
    cancel.mockReset()
    togglePlayback.mockReset()
    togglePlayback.mockReturnValue(false)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("plays the reveal segment after a wrong pick, same as a correct answer", () => {
    const onOptionClick = vi.fn()
    const { result } = renderHook(() =>
      useAnteRound({
        deck,
        session: makeSession(),
        videoEl: fakeVideo(),
        onOptionClick,
        timestamps,
        config: { buzzHoldMs: null, correctHoldMs: 300 },
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    act(() => {
      result.current.answer(0)
    })

    expect(onOptionClick).toHaveBeenCalledWith(0)
    expect(result.current.drill.phase).toBe("wrong")
    expect(play).toHaveBeenLastCalledWith(
      { from: 0, to: 10 },
      expect.objectContaining({ rate: CORRECT_REVEAL_PLAYBACK_RATE }),
    )
  })

  it("still holds on a buzzer timeout instead of auto-playing the reveal", () => {
    const onTapOut = vi.fn()
    const { result } = renderHook(() =>
      useAnteRound({
        deck,
        session: makeSession(),
        videoEl: fakeVideo(),
        onOptionClick: vi.fn(),
        onTapOut,
        timestamps,
        config: { buzzHoldMs: null },
      }),
    )

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(onTapOut).toHaveBeenCalled()
    expect(result.current.drill.phase).toBe("wrong")
    expect(result.current.drill.picked).toBeNull()
    expect(hold).toHaveBeenCalledWith(0)
    expect(play).not.toHaveBeenCalled()
  })

  it("defers locking the session until the last-move reveal finishes", () => {
    const onOptionClick = vi.fn()
    const session = makeSession()
    session.moveSequence = [
      { moveIndex: 0, correct: true },
      { moveIndex: 1, correct: true },
    ]
    session.options = [
      { text: "Wrong", correct: false },
      { text: "Move C", correct: true },
      { text: "Other", correct: false },
    ]
    const { result } = renderHook(() =>
      useAnteRound({
        deck,
        session,
        videoEl: fakeVideo(),
        onOptionClick,
        timestamps,
        config: { buzzHoldMs: null, correctHoldMs: 300 },
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    act(() => {
      result.current.answer(1)
    })

    expect(onOptionClick).not.toHaveBeenCalled()
    expect(result.current.drill.phase).toBe("correct")

    const onEnd = play.mock.calls.at(-1)?.[1]?.onEnd as (() => void) | undefined
    expect(onEnd).toBeTypeOf("function")
    act(() => {
      onEnd!()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onOptionClick).toHaveBeenCalledWith(1)
    expect(result.current.drill.phase).toBe("done")
  })

  it("pauses and resumes the ante clock", () => {
    const onTapOut = vi.fn()
    const { result } = renderHook(() =>
      useAnteRound({
        deck,
        session: makeSession(),
        videoEl: fakeVideo(),
        onOptionClick: vi.fn(),
        onTapOut,
        timestamps,
        config: { buzzHoldMs: null },
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current.live).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    const remBeforePause = result.current.remaining
    expect(remBeforePause).toBeLessThan(6000)

    act(() => {
      result.current.togglePause()
    })

    expect(result.current.paused).toBe(true)
    expect(result.current.live).toBe(false)
    const frozen = result.current.remaining

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.remaining).toBe(frozen)
    expect(onTapOut).not.toHaveBeenCalled()

    act(() => {
      result.current.togglePause()
    })

    expect(result.current.paused).toBe(false)
    expect(result.current.live).toBe(true)

    act(() => {
      vi.advanceTimersByTime(frozen + 100)
    })

    expect(onTapOut).toHaveBeenCalled()
  })

  it("toggles reveal playback during correct phase", () => {
    const { result } = renderHook(() =>
      useAnteRound({
        deck,
        session: makeSession(),
        videoEl: fakeVideo(),
        onOptionClick: vi.fn(),
        timestamps,
        config: { buzzHoldMs: null, correctHoldMs: 300 },
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    act(() => {
      result.current.answer(1)
    })

    expect(result.current.drill.phase).toBe("correct")

    act(() => {
      result.current.togglePause()
    })

    expect(togglePlayback).toHaveBeenCalled()
  })
})
