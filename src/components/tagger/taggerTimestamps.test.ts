import { describe, expect, it } from "vitest"
import { moveIndexAtTime, parseTimestampsJson, timeFromClientX } from "./taggerTimestamps"

describe("timeFromClientX", () => {
  it("maps left edge to 0 and right edge to duration", () => {
    expect(timeFromClientX(100, 100, 200, 40)).toBe(0)
    expect(timeFromClientX(300, 100, 200, 40)).toBe(40)
  })

  it("clamps outside the track", () => {
    expect(timeFromClientX(50, 100, 200, 40)).toBe(0)
    expect(timeFromClientX(400, 100, 200, 40)).toBe(40)
  })

  it("maps midpoint", () => {
    expect(timeFromClientX(200, 100, 200, 40)).toBe(20)
  })
})

describe("parseTimestampsJson", () => {
  it("parses object timestamps", () => {
    const text = JSON.stringify({
      deckId: "x",
      timestamps: [{ name: "A", t: 1 }, { name: "B", t: 2 }],
    })
    expect(parseTimestampsJson(text, 2)).toEqual({
      ok: true,
      timestamps: [1, 2],
    })
  })

  it("parses bare number timestamps", () => {
    const text = JSON.stringify({ deckId: "x", timestamps: [0.5, 1.5, 2.5] })
    expect(parseTimestampsJson(text, 3)).toEqual({
      ok: true,
      timestamps: [0.5, 1.5, 2.5],
    })
  })

  it("parses null timestamps as missing", () => {
    const text = JSON.stringify({
      deckId: "x",
      timestamps: [{ name: "A", t: 1 }, { name: "B", t: null }, 3],
    })
    expect(parseTimestampsJson(text, 3)).toEqual({
      ok: true,
      timestamps: [1, null, 3],
    })
  })

  it("pads shorter arrays with nulls", () => {
    const text = JSON.stringify({ timestamps: [1, 2, null, 4] })
    expect(parseTimestampsJson(text, 6)).toEqual({
      ok: true,
      timestamps: [1, 2, null, 4, null, null],
    })
  })

  it("pads sparse partial list to moveCount", () => {
    const partial = Array.from({ length: 11 }, (_, i) => i * 0.5)
    const text = JSON.stringify({ timestamps: partial })
    const result = parseTimestampsJson(text, 30)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.timestamps).toHaveLength(30)
    expect(result.timestamps.slice(0, 11)).toEqual(partial)
    expect(result.timestamps.slice(11)).toEqual(Array(19).fill(null))
  })

  it("rejects too many timestamps and bad json", () => {
    expect(parseTimestampsJson("{", 2).ok).toBe(false)
    expect(parseTimestampsJson(JSON.stringify({ timestamps: [1, 2, 3] }), 2).ok).toBe(false)
    const tooLong = parseTimestampsJson(JSON.stringify({ timestamps: [1, 2, 3] }), 2)
    expect(tooLong.ok).toBe(false)
    if (tooLong.ok) return
    expect(tooLong.error).toBe("Need at most 2 timestamps, got 3")
  })
})

describe("moveIndexAtTime", () => {
  it("picks the latest start at or before time", () => {
    expect(moveIndexAtTime([0, 2, 5, 9], 0)).toBe(0)
    expect(moveIndexAtTime([0, 2, 5, 9], 2)).toBe(1)
    expect(moveIndexAtTime([0, 2, 5, 9], 4.9)).toBe(1)
    expect(moveIndexAtTime([0, 2, 5, 9], 9)).toBe(3)
  })

  it("uses latest start time when list order is unsorted", () => {
    const times = [0, 3.79, 4.79, 6.24, 6.03, 7.54]
    expect(moveIndexAtTime(times, 6.24)).toBe(3)
    expect(moveIndexAtTime(times, 6.1)).toBe(4)
  })

  it("skips null slots and returns -1 when nothing matches", () => {
    expect(moveIndexAtTime([null, 10, 20], 5)).toBe(-1)
    expect(moveIndexAtTime([null, 10, 20], 15)).toBe(1)
    expect(moveIndexAtTime([0, null, 20], 5)).toBe(0)
  })
})
