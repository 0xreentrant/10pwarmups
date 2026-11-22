import { describe, expect, it } from "vitest"
import type { Deck } from "../types/domain"
import {
  buildWarmupSearchEntries,
  fuzzyScore,
  searchWarmups,
} from "./warmupSearch"

const decks: Deck[] = [
  {
    id: "A1",
    series: "A",
    name: "Kneeling",
    moves: [
      { text: "Seated Granby", players: ["A"] },
      { text: "Kneeling Granby", players: ["A"] },
      { text: "Banana Split", players: ["A"] },
    ],
  },
  {
    id: "B1",
    series: "B",
    name: "Black Mamba",
    moves: [
      { text: "Granby", players: ["B"] },
      { text: "Omoplata", players: ["B"] },
    ],
  },
  {
    id: "ramey-flow",
    name: "Ramey Flow",
    moves: [{ text: "Hip Bump", players: ["A"] }],
  },
]

describe("fuzzyScore", () => {
  it("scores exact and prefix matches highest", () => {
    expect(fuzzyScore("granby", "granby")).toBeGreaterThan(
      fuzzyScore("granby", "kneeling granby")!,
    )
    expect(fuzzyScore("kneel", "kneeling granby")).toBeGreaterThan(
      fuzzyScore("granby", "kneeling granby")!,
    )
  })

  it("matches subsequences", () => {
    expect(fuzzyScore("gby", "granby")).not.toBeNull()
    expect(fuzzyScore("xyz", "granby")).toBeNull()
  })
})

describe("searchWarmups", () => {
  const entries = buildWarmupSearchEntries(decks)

  it("finds moves by fuzzy name and includes series", () => {
    const hits = searchWarmups("granby", entries)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some(h => h.moveText === "Granby" && h.series === "B")).toBe(true)
    expect(hits.some(h => h.moveText.includes("Granby") && h.deckId === "A1")).toBe(true)
  })

  it("returns empty for blank query", () => {
    expect(searchWarmups("   ", entries)).toEqual([])
  })

  it("uses deck name as series for named flows", () => {
    const hits = searchWarmups("hip bump", entries)
    expect(hits[0]?.deckId).toBe("ramey-flow")
    expect(hits[0]?.series).toBe("Ramey Flow")
  })
})
