import { describe, expect, it, beforeEach } from "vitest"
import {
  TAGGER_NOTE_DRAFTS_STORAGE_KEY,
  clearNoteDraftForDeck,
  loadNoteDraftsByDeck,
  resolveNoteDraft,
  saveNoteDraftForDeck,
} from "./usePersistedTaggerNoteDrafts"

describe("usePersistedTaggerNoteDrafts helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns saved text when no draft exists", () => {
    expect(resolveNoteDraft("A1", "from file")).toBe("from file")
  })

  it("returns stored draft when present", () => {
    saveNoteDraftForDeck("A1", "draft text")
    expect(resolveNoteDraft("A1", "from file")).toBe("draft text")
  })

  it("persists per deck in localStorage", () => {
    saveNoteDraftForDeck("A1", "one")
    saveNoteDraftForDeck("A2", "two")
    expect(loadNoteDraftsByDeck()).toEqual({ A1: "one", A2: "two" })
    expect(localStorage.getItem(TAGGER_NOTE_DRAFTS_STORAGE_KEY)).toBeTruthy()
  })

  it("clearNoteDraftForDeck removes one deck without touching others", () => {
    saveNoteDraftForDeck("A1", "one")
    saveNoteDraftForDeck("A2", "two")
    clearNoteDraftForDeck("A1")
    expect(loadNoteDraftsByDeck()).toEqual({ A2: "two" })
    expect(resolveNoteDraft("A1", "from file")).toBe("from file")
  })
})
