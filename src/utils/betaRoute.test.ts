import { describe, it, expect } from "vitest"
import { isValidBetaWarmupParam, parseBetaWarmupParam } from "./betaRoute"

describe("betaRoute", () => {
  it("parses series letters", () => {
    expect(parseBetaWarmupParam("F")).toEqual({ mode: "series", letter: "F" })
  })

  it("parses deck ids", () => {
    expect(parseBetaWarmupParam("B3")).toEqual({ mode: "deck", deckId: "B3" })
  })

  it("rejects invalid params", () => {
    expect(parseBetaWarmupParam("ZZZ")).toBe(null)
    expect(isValidBetaWarmupParam("Z")).toBe(false)
  })
})
