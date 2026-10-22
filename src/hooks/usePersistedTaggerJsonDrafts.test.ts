import { describe, expect, it, beforeEach } from "vitest"
import { DECKS } from "../data/decks"
import { MOVE_TIMESTAMPS } from "../data/moveTimestamps"
import { buildJsonText } from "../components/tagger/taggerTimestamps"
import {
  TAGGER_JSON_DRAFTS_STORAGE_KEY,
  clearJsonDraftForDeck,
  loadJsonDraftsByDeck,
  resolveJsonDraft,
  saveJsonDraftForDeck,
  taggerJsonMatchesCatalog,
} from "./usePersistedTaggerJsonDrafts"

function a1CatalogJson(stampAt0?: number): string {
  const deck = DECKS.find(item => item.id === "A1")
  if (!deck) throw new Error("missing A1")
  const names = deck.moves.map(move => move.text)
  const players = deck.moves.map(move => move.players)
  const stamps = (MOVE_TIMESTAMPS.A1 ?? []).slice(0, names.length)
  while (stamps.length < names.length) stamps.push(null)
  if (stampAt0 !== undefined) stamps[0] = stampAt0
  return buildJsonText("A1", stamps, names, players)
}

describe("usePersistedTaggerJsonDrafts helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns saved text when no draft exists", () => {
    expect(resolveJsonDraft("A1", "from catalog")).toBe("from catalog")
  })

  it("returns stored draft when present", () => {
    saveJsonDraftForDeck("A1", "draft text")
    expect(resolveJsonDraft("A1", "from catalog")).toBe("draft text")
  })

  it("persists per deck in localStorage", () => {
    saveJsonDraftForDeck("A1", "one")
    saveJsonDraftForDeck("A2", "two")
    expect(loadJsonDraftsByDeck()).toEqual({ A1: "one", A2: "two" })
    expect(localStorage.getItem(TAGGER_JSON_DRAFTS_STORAGE_KEY)).toBeTruthy()
  })

  it("clearJsonDraftForDeck removes one deck without touching others", () => {
    saveJsonDraftForDeck("A1", "one")
    saveJsonDraftForDeck("A2", "two")
    clearJsonDraftForDeck("A1")
    expect(loadJsonDraftsByDeck()).toEqual({ A2: "two" })
    expect(resolveJsonDraft("A1", "from catalog")).toBe("from catalog")
  })

  it("ignores non-string values and unreadable storage", () => {
    localStorage.setItem(TAGGER_JSON_DRAFTS_STORAGE_KEY, JSON.stringify({ A1: 12, A2: "ok", A3: null }))
    expect(loadJsonDraftsByDeck()).toEqual({ A2: "ok" })
    localStorage.setItem(TAGGER_JSON_DRAFTS_STORAGE_KEY, "{")
    expect(loadJsonDraftsByDeck()).toEqual({})
  })

  it("matches the live catalog by names, players, and timestamps", () => {
    expect(taggerJsonMatchesCatalog(a1CatalogJson(), "A1")).toBe(true)
    expect(taggerJsonMatchesCatalog(a1CatalogJson(0.25), "A1")).toBe(false)
  })
})
