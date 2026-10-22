import { describe, expect, it } from "vitest"
import { posterSrcForDeck, videoSrcForDeck } from "./deckVideo"

describe("posterSrcForDeck", () => {
  it("maps open and move stills for a deck with a clip", () => {
    expect(videoSrcForDeck("A1")).toBe("/videos/A1.mp4")
    expect(posterSrcForDeck("A1", "open")).toBe("/posters/A1/open.webp")
    expect(posterSrcForDeck("A1", 2)).toBe("/posters/A1/2.webp")
  })

  it("returns null when the deck has no video", () => {
    expect(posterSrcForDeck("no-such-deck", "open")).toBeNull()
    expect(posterSrcForDeck("no-such-deck", 0)).toBeNull()
  })
})
