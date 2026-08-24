import { describe, expect, it } from "vitest"
import {
  MOVE_TIMESTAMPS,
  moveIndexAtTime,
  playableIndicesFromTimestamps,
  playableMoveIndices,
  resolveMoveTimestamps,
} from "./moveTimestamps"

describe("resolveMoveTimestamps", () => {
  it("returns tagged A1 starts when move count matches", () => {
    expect(resolveMoveTimestamps("A1", 5, 50)).toEqual(MOVE_TIMESTAMPS.A1)
  })

  it("returns nulls when the deck is untagged", () => {
    expect(resolveMoveTimestamps("untagged", 5, 10)).toEqual([null, null, null, null, null])
  })

  it("keeps saved tags when deck count mismatches, padding or truncating", () => {
    expect(resolveMoveTimestamps("B1", 4, 20)).toEqual(MOVE_TIMESTAMPS.B1.slice(0, 4))
    expect(resolveMoveTimestamps("A1", 3, 30)).toEqual(MOVE_TIMESTAMPS.A1.slice(0, 3))
    expect(resolveMoveTimestamps("H3", 22, 50)).toEqual([
      ...MOVE_TIMESTAMPS.H3,
      null,
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it("does not synthesize equal slices when tags overrun duration", () => {
    expect(resolveMoveTimestamps("A1", 5, 10)).toEqual(MOVE_TIMESTAMPS.A1)
  })
})

describe("moveIndexAtTime", () => {
  it("picks latest start by time when unsorted", () => {
    const times = [0, 3.79, 4.79, 6.24, 6.03, 7.54]
    expect(moveIndexAtTime(times, 6.24)).toBe(3)
    expect(moveIndexAtTime(times, 6.1)).toBe(4)
  })

  it("skips null and non-finite slots", () => {
    expect(moveIndexAtTime([0, null, 10], 5)).toBe(0)
    expect(moveIndexAtTime([0, null, 10], 10)).toBe(2)
    expect(moveIndexAtTime([null, null], 1)).toBe(-1)
    expect(moveIndexAtTime([NaN, 4], 4)).toBe(1)
  })
})

describe("playableMoveIndices", () => {
  it("returns all indices for fully tagged decks", () => {
    expect(playableMoveIndices("A1", MOVE_TIMESTAMPS.A1.length)).toEqual([0, 1, 2, 3, 4])
  })

  it("omits null slots for partially tagged decks", () => {
    const order = playableMoveIndices("A2", MOVE_TIMESTAMPS.A2.length)
    expect(order).not.toContain(11)
    expect(order).not.toContain(17)
    expect(order.length).toBe(playableIndicesFromTimestamps(MOVE_TIMESTAMPS.A2).length)
  })

  it("falls back to every move when the deck is untagged", () => {
    expect(playableMoveIndices("B1", 4)).toEqual([0, 1, 2, 3])
  })

  it("uses override timestamps when provided (tagger live tags)", () => {
    expect(playableMoveIndices("A4", 4, [0, null, 10, 20])).toEqual([0, 2, 3])
  })

  it("keeps A4 kob → wheel kick → under jack consecutive when tagged", () => {
    const a4 = MOVE_TIMESTAMPS.A4
    const order = playableMoveIndices("A4", a4.length)
    const kob = order.indexOf(4)
    expect(kob).toBeGreaterThanOrEqual(0)
    expect(order.slice(kob, kob + 3)).toEqual([4, 5, 6])
  })
})
