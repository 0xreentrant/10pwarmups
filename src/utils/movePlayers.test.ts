import { describe, expect, it } from "vitest"
import { bothPlayers, markerDotAppearance, moveLabelClass, normalizePlayers, togglePlayerDraft } from "./movePlayers"

describe("movePlayers", () => {
  it("normalizes single and duplicate entries", () => {
    expect(normalizePlayers("B")).toEqual(["B"])
    expect(normalizePlayers(["B", "A", "B"])).toEqual(["A", "B"])
    expect(normalizePlayers([])).toEqual(["A"])
  })

  it("detects both players", () => {
    expect(bothPlayers(["A", "B"])).toBe(true)
    expect(bothPlayers(["A"])).toBe(false)
  })

  it("picks label class", () => {
    expect(moveLabelClass(["A"])).toBe("text-partner-a")
    expect(moveLabelClass(["B"])).toBe("text-partner-b")
    expect(moveLabelClass(["A", "B"])).toBe("text-partner-both")
  })

  it("toggles draft without emptying", () => {
    expect(togglePlayerDraft(["A"], "B")).toEqual(["A", "B"])
    expect(togglePlayerDraft(["A", "B"], "A")).toEqual(["B"])
    expect(togglePlayerDraft(["A"], "A")).toEqual(["A"])
  })

  it("styles timeline dots by player", () => {
    expect(markerDotAppearance(["A"], false).className).toContain("border-partner-a")
    expect(markerDotAppearance(["B"], true).className).toContain("bg-partner-b")
    expect(markerDotAppearance(["A", "B"], true).style?.background).toContain("linear-gradient")
  })
})
