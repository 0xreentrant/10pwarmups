import { describe, expect, it } from "vitest"
import {
  buildJsonText,
  formatVideoTimeMs,
  parseTimestampsJson,
  timeFromClientX,
} from "./taggerTimestamps"

describe("formatVideoTimeMs", () => {
  it("formats minutes, seconds, and milliseconds", () => {
    expect(formatVideoTimeMs(0)).toBe("0:00.000")
    expect(formatVideoTimeMs(83.456)).toBe("1:23.456")
    expect(formatVideoTimeMs(61.001)).toBe("1:01.001")
  })
})

describe("timeFromClientX", () => {
  it("maps track edges and midpoint, clamping outside the track", () => {
    expect(timeFromClientX(100, 100, 200, 40)).toBe(0)
    expect(timeFromClientX(300, 100, 200, 40)).toBe(40)
    expect(timeFromClientX(200, 100, 200, 40)).toBe(20)
    expect(timeFromClientX(50, 100, 200, 40)).toBe(0)
    expect(timeFromClientX(400, 100, 200, 40)).toBe(40)
  })
})

describe("parseTimestampsJson", () => {
  it("parses player field on object timestamps", () => {
    const text = JSON.stringify({
      deckId: "x",
      timestamps: [
        { name: "A", player: "a", t: 1 },
        { name: "B", player: "b", t: 2 },
      ],
    })
    expect(parseTimestampsJson(text, 2)).toEqual({
      ok: true,
      timestamps: [1, 2],
      names: ["A", "B"],
      partners: ["A", "B"],
    })
  })

  it("parses object timestamps", () => {
    const text = JSON.stringify({
      deckId: "x",
      timestamps: [{ name: "A", t: 1 }, { name: "B", t: 2 }],
    })
    expect(parseTimestampsJson(text, 2)).toEqual({
      ok: true,
      timestamps: [1, 2],
      names: ["A", "B"],
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
      names: ["A", "B", ""],
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

  it("nulls removed move by name when json is shorter than moveCount", () => {
    const refNames = ["Alpha", "Beta", "Gamma"]
    const text = JSON.stringify({
      deckId: "x",
      timestamps: [
        { name: "Alpha", t: 1 },
        { name: "Gamma", t: 3 },
      ],
    })
    expect(parseTimestampsJson(text, 3, refNames)).toEqual({
      ok: true,
      timestamps: [1, null, 3],
      names: ["Alpha", "Beta", "Gamma"],
    })
  })

  it("matches duplicate names by occurrence rank", () => {
    const refNames = ["Granby", "Pass", "Granby", "Finish"]
    const text = JSON.stringify({
      timestamps: [
        { name: "Granby", t: 1 },
        { name: "Pass", t: 2 },
        { name: "Finish", t: 4 },
      ],
    })
    expect(parseTimestampsJson(text, 4, refNames)).toEqual({
      ok: true,
      timestamps: [1, 2, null, 4],
      names: ["Granby", "Pass", "Granby", "Finish"],
    })
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

describe("buildJsonText", () => {
  it("includes move names, player, and null times in export", () => {
    const json = buildJsonText("A1", [0, null, 2.5], ["First", "Second", "Third"], ["A", "B", "A"])
    const parsed = JSON.parse(json)
    expect(parsed.deckId).toBe("A1")
    expect(parsed.timestamps).toEqual([
      { name: "First", player: "a", t: 0 },
      { name: "Second", player: "b", t: null },
      { name: "Third", player: "a", t: 2.5 },
    ])
  })
})
