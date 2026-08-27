import { describe, expect, it } from "vitest"
import { MOVE_TIMESTAMPS } from "../data/moveTimestamps"
import { deckHasTaggedMoves } from "./deckTimestamps"

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
