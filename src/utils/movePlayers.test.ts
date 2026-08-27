import { describe, expect, it } from "vitest"
import { bothPlayers, normalizePlayers, togglePlayerDraft } from "./movePlayers"

describe("movePlayers", () => {
  it("normalizes single and duplicate entries, defaulting empty to A", () => {
    expect(normalizePlayers("B")).toEqual(["B"])
    expect(normalizePlayers(["B", "A", "B"])).toEqual(["A", "B"])
    expect(normalizePlayers([])).toEqual(["A"])
  })

  it("detects both players", () => {
    expect(bothPlayers(["A", "B"])).toBe(true)
    expect(bothPlayers(["A"])).toBe(false)
  })

  it("toggles draft without emptying the selection", () => {
    expect(togglePlayerDraft(["A"], "B")).toEqual(["A", "B"])
    expect(togglePlayerDraft(["A", "B"], "A")).toEqual(["B"])
    expect(togglePlayerDraft(["A"], "A")).toEqual(["A"])
  })
})
