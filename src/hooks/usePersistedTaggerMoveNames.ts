export const TAGGER_MOVE_NAMES_STORAGE_KEY = "tp_tagger_move_names"

export type MoveNamesByDeck = Record<string, string[]>

export function loadMoveNamesByDeck(): MoveNamesByDeck {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(TAGGER_MOVE_NAMES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    const out: MoveNamesByDeck = {}
    for (const [deckId, names] of Object.entries(parsed)) {
      if (!Array.isArray(names)) continue
      const texts = names.filter((n): n is string => typeof n === "string")
      if (texts.length > 0) out[deckId] = texts
    }
    return out
  } catch {
    return {}
  }
}

export function saveMoveNamesForDeck(deckId: string, names: string[]): void {
  if (typeof window === "undefined" || !deckId) return
  try {
    const stored = loadMoveNamesByDeck()
    stored[deckId] = names
    localStorage.setItem(TAGGER_MOVE_NAMES_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

export function clearMoveNamesForDeck(deckId: string): void {
  if (typeof window === "undefined" || !deckId) return
  try {
    const stored = loadMoveNamesByDeck()
    if (!(deckId in stored)) return
    delete stored[deckId]
    localStorage.setItem(TAGGER_MOVE_NAMES_STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

export function resolveMoveNames(
  deckId: string,
  defaultNames: string[],
  stored: MoveNamesByDeck,
): string[] {
  const saved = stored[deckId]
  if (!saved || saved.length !== defaultNames.length) return defaultNames
  return saved
}
