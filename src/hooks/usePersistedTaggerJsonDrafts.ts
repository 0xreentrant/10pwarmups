import { DECKS } from "../data/decks"
import { MOVE_TIMESTAMPS } from "../data/moveTimestamps"
import { parseTimestampsJson } from "../components/tagger/taggerTimestamps"
import type { Partner } from "../types/domain"
import { normalizePlayers } from "../utils/movePlayers"

export const TAGGER_JSON_DRAFTS_STORAGE_KEY = "tp_tagger_json_drafts"

export type JsonDraftsByDeck = Record<string, string>

export type TaggerJsonDocument = {
  deckId: string
  names: string[]
  players: Partner[][]
  timestamps: (number | null)[]
}

export function loadJsonDraftsByDeck(): JsonDraftsByDeck {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(TAGGER_JSON_DRAFTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const out: JsonDraftsByDeck = {}
    for (const [deckId, text] of Object.entries(parsed)) {
      if (typeof text === "string") out[deckId] = text
    }
    return out
  } catch {
    return {}
  }
}

export function saveJsonDraftForDeck(deckId: string, text: string): void {
  if (typeof window === "undefined" || !deckId) return
  try {
    const stored = loadJsonDraftsByDeck()
    stored[deckId] = text
    localStorage.setItem(TAGGER_JSON_DRAFTS_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

export function clearJsonDraftForDeck(deckId: string): void {
  if (typeof window === "undefined" || !deckId) return
  try {
    const stored = loadJsonDraftsByDeck()
    if (!(deckId in stored)) return
    delete stored[deckId]
    localStorage.setItem(TAGGER_JSON_DRAFTS_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

export function resolveJsonDraft(deckId: string, savedText: string): string {
  const stored = loadJsonDraftsByDeck()
  if (deckId in stored) return stored[deckId] ?? ""
  return savedText
}

export function taggerJsonDocument(text: string): TaggerJsonDocument | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!raw || typeof raw !== "object" || !("timestamps" in raw)) return null
  const list = (raw as { timestamps: unknown }).timestamps
  if (!Array.isArray(list) || list.length === 0) return null
  const result = parseTimestampsJson(text, list.length)
  if (!result.ok) return null
  const deckId = typeof (raw as { deckId?: unknown }).deckId === "string"
    ? (raw as { deckId: string }).deckId
    : ""
  const names = result.names ?? Array.from({ length: list.length }, (_, i) => `Move ${i + 1}`)
  const players = (result.playerLists ?? names.map(() => ["A"] as Partner[])).map(row => normalizePlayers(row))
  const timestamps = result.timestamps.slice(0, names.length)
  while (timestamps.length < names.length) timestamps.push(null)
  return { deckId, names, players, timestamps }
}

export function taggerJsonLoadError(text: string): string {
  let count = 1
  try {
    const raw = JSON.parse(text) as { timestamps?: unknown }
    if (Array.isArray(raw?.timestamps) && raw.timestamps.length > 0) count = raw.timestamps.length
  } catch {}
  const result = parseTimestampsJson(text, count)
  return result.ok ? "Invalid JSON" : result.error
}

export function taggerJsonMatchesCatalog(text: string, deckId: string): boolean {
  const doc = taggerJsonDocument(text)
  const deck = DECKS.find(item => item.id === deckId)
  if (!doc || !deck || doc.names.length !== deck.moves.length) return false
  const stamps = MOVE_TIMESTAMPS[deckId] ?? []
  for (let i = 0; i < deck.moves.length; i++) {
    if (doc.names[i] !== deck.moves[i].text) return false
    const players = normalizePlayers(deck.moves[i].players)
    const got = doc.players[i] ?? []
    if (got.length !== players.length || got.some((player, index) => player !== players[index])) return false
    if ((doc.timestamps[i] ?? null) !== (stamps[i] ?? null)) return false
  }
  return true
}

export function patchCatalogFromTaggerJson(text: string): void {
  const doc = taggerJsonDocument(text)
  if (!doc?.deckId) return
  const deck = DECKS.find(item => item.id === doc.deckId)
  if (!deck) return
  const notes: Record<number, string> = {}
  if (deck.notes) {
    for (const [key, value] of Object.entries(deck.notes)) {
      const index = Number(key)
      if (Number.isInteger(index) && index >= 0 && index < doc.names.length && value) notes[index] = value
    }
  }
  deck.moves = doc.names.map((name, index) => ({
    text: name,
    players: doc.players[index] ?? ["A"],
  }))
  deck.notes = Object.keys(notes).length > 0 ? notes : undefined
  MOVE_TIMESTAMPS[doc.deckId] = doc.timestamps.slice()
}
