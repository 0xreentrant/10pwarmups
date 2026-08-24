export const TAGGER_NOTE_DRAFTS_STORAGE_KEY = "tp_tagger_note_drafts"

export type NoteDraftsByDeck = Record<string, string>

export function loadNoteDraftsByDeck(): NoteDraftsByDeck {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(TAGGER_NOTE_DRAFTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const out: NoteDraftsByDeck = {}
    for (const [deckId, text] of Object.entries(parsed)) {
      if (typeof text === "string") out[deckId] = text
    }
    return out
  } catch {
    return {}
  }
}

export function saveNoteDraftForDeck(deckId: string, text: string): void {
  if (typeof window === "undefined" || !deckId) return
  try {
    const stored = loadNoteDraftsByDeck()
    stored[deckId] = text
    localStorage.setItem(TAGGER_NOTE_DRAFTS_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

export function clearNoteDraftForDeck(deckId: string): void {
  if (typeof window === "undefined" || !deckId) return
  try {
    const stored = loadNoteDraftsByDeck()
    if (!(deckId in stored)) return
    delete stored[deckId]
    localStorage.setItem(TAGGER_NOTE_DRAFTS_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

export function resolveNoteDraft(deckId: string, savedText: string): string {
  const stored = loadNoteDraftsByDeck()
  if (deckId in stored) return stored[deckId] ?? ""
  return savedText
}
