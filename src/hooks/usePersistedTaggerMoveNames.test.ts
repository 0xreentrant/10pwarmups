import { describe, expect, it, beforeEach } from "vitest"
import {
  TAGGER_MOVE_NAMES_STORAGE_KEY,
  clearMoveNamesForDeck,
  loadMoveNamesByDeck,
  resolveMoveNames,
  saveMoveNamesForDeck,
} from "./usePersistedTaggerMoveNames"

describe("usePersistedTaggerMoveNames helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns defaults when nothing is stored", () => {
    expect(resolveMoveNames("A1", ["Alpha", "Beta"], {})).toEqual(["Alpha", "Beta"])
  })

  it("returns stored names when length matches", () => {
    const stored = { A1: ["Renamed", "Beta"] }
    expect(resolveMoveNames("A1", ["Alpha", "Beta"], stored)).toEqual(["Renamed", "Beta"])
  })

  it("ignores stored names when length mismatches", () => {
    const stored = { A1: ["Only one"] }
    expect(resolveMoveNames("A1", ["Alpha", "Beta"], stored)).toEqual(["Alpha", "Beta"])
  })

  it("persists per deck in localStorage", () => {
    saveMoveNamesForDeck("A1", ["One", "Two"])
    saveMoveNamesForDeck("A2", ["First"])
    expect(loadMoveNamesByDeck()).toEqual({ A1: ["One", "Two"], A2: ["First"] })
    expect(localStorage.getItem(TAGGER_MOVE_NAMES_STORAGE_KEY)).toBeTruthy()
  })

  it("clearMoveNamesForDeck removes one deck without touching others", () => {
    saveMoveNamesForDeck("A1", ["One", "Two"])
    saveMoveNamesForDeck("A2", ["First"])
    clearMoveNamesForDeck("A1")
    expect(loadMoveNamesByDeck()).toEqual({ A2: ["First"] })
  })
})
