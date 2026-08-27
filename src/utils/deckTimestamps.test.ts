import { describe, expect, it } from "vitest"
import { MOVE_TIMESTAMPS } from "../data/moveTimestamps"
import {
  deckHasTaggedMoves,
  firstTaggedSeriesLetter,
  seriesHasTaggedDecks,
  seriesLetterForScheduleDemo,
} from "./deckTimestamps"

describe("deckHasTaggedMoves", () => {
  it("is false when every timestamp is null", () => {
    expect(deckHasTaggedMoves("H1", 14)).toBe(false)
    expect(deckHasTaggedMoves("untagged", 4)).toBe(false)
  })

  it("is true when at least one move is tagged", () => {
    expect(deckHasTaggedMoves("H3", 16)).toBe(true)
    expect(deckHasTaggedMoves("A1", MOVE_TIMESTAMPS.A1.length)).toBe(true)
  })
})

describe("seriesLetterForScheduleDemo", () => {
  it("keeps a series that already has Train rows", () => {
    expect(seriesHasTaggedDecks("A")).toBe(true)
    expect(seriesLetterForScheduleDemo("A")).toBe("A")
  })

  it("falls back when today's series has no tagged decks", () => {
    expect(seriesHasTaggedDecks("F")).toBe(false)
    expect(seriesLetterForScheduleDemo("F")).toBe(firstTaggedSeriesLetter())
    expect(seriesLetterForScheduleDemo("F")).toBe("A")
  })
})
