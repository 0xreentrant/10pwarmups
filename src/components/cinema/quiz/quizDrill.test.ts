import { describe, expect, it } from "vitest"
import { drillReducer, type DrillState } from "./useQuizDrill"
import { leadInSegment, revealSegment } from "./useSegmentPlayer"
import type { MoveTimeline } from "../useMoveTimeline"

function state(overrides: Partial<DrillState> = {}): DrillState {
  return {
    runId: 0,
    moveIdx: 0,
    phase: "asking",
    picked: null,
    streak: 0,
    best: 0,
    misses: 0,
    history: [],
    beat: 0,
    ...overrides,
  }
}

const timeline: MoveTimeline = {
  duration: 30,
  timestamps: [0, 10, 20],
  moveIndexAt: () => 0,
}

describe("drillReducer", () => {
  it("builds a streak on correct calls and tracks the best run", () => {
    let s = drillReducer(state(), { type: "ANSWER", picked: 1, correct: true })
    expect(s.phase).toBe("correct")
    expect(s.streak).toBe(1)
    s = drillReducer(s, { type: "NEXT", total: 3, advanceOnWrong: true })
    s = drillReducer(s, { type: "ANSWER", picked: 0, correct: true })
    expect(s.moveIdx).toBe(1)
    expect(s.streak).toBe(2)
    expect(s.best).toBe(2)
    expect(s.history).toEqual(["hit", "hit"])
  })

  it("resets the streak on a miss but keeps the best", () => {
    const s = drillReducer(
      state({ streak: 4, best: 4 }),
      { type: "ANSWER", picked: 2, correct: false },
    )
    expect(s.phase).toBe("wrong")
    expect(s.streak).toBe(0)
    expect(s.best).toBe(4)
    expect(s.misses).toBe(1)
  })

  it("re-poses the same move when wrong answers do not advance", () => {
    const wrong = drillReducer(state({ moveIdx: 2 }), { type: "ANSWER", picked: 0, correct: false })
    const retry = drillReducer(wrong, { type: "NEXT", total: 8, advanceOnWrong: false })
    expect(retry.moveIdx).toBe(2)
    expect(retry.phase).toBe("asking")
    expect(retry.picked).toBeNull()
  })

  it("finishes after the last move", () => {
    const answered = drillReducer(state({ moveIdx: 2 }), { type: "ANSWER", picked: 0, correct: true })
    const done = drillReducer(answered, { type: "NEXT", total: 3, advanceOnWrong: true })
    expect(done.phase).toBe("done")
  })

  it("ignores answers while feedback is on screen", () => {
    const answered = drillReducer(state(), { type: "ANSWER", picked: 0, correct: true })
    const again = drillReducer(answered, { type: "ANSWER", picked: 1, correct: false })
    expect(again).toBe(answered)
  })
})

describe("segment bounds", () => {
  it("shows the tape only up to the move under question", () => {
    expect(leadInSegment(timeline, 0)).toEqual({ from: 0, to: 0 })
    expect(leadInSegment(timeline, 2)).toEqual({ from: 10, to: 20 })
  })

  it("reveals from the question boundary to the next move, or the end", () => {
    expect(revealSegment(timeline, 1)).toEqual({ from: 10, to: 20 })
    expect(revealSegment(timeline, 2)).toEqual({ from: 20, to: 30 })
  })

  it("skips untagged moves when bounding segments", () => {
    const gapped: MoveTimeline = {
      duration: 40,
      timestamps: [0, 10, null, 20, 30],
      moveIndexAt: () => 0,
    }
    expect(leadInSegment(gapped, 3)).toEqual({ from: 10, to: 20 })
    expect(revealSegment(gapped, 1)).toEqual({ from: 10, to: 20 })
    expect(revealSegment(gapped, 3)).toEqual({ from: 20, to: 30 })
  })
})
