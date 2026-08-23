/** Decks with a committed mp4 under public/videos/{id}.mp4 */
const VIDEO_DECK_IDS = new Set([
  "A1", "A2", "A3", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D1", "D2", "D3", "D4",
  "E1", "E2", "E3", "E4",
  "F1", "F2", "F3", "F4",
  "G1", "G2", "G3", "G4",
  "H1", "H2", "H3", "H4",
  "ramey-flow",
])

/** Local training clip, or null when the deck has no video yet. */
export function videoSrcForDeck(deckId: string): string | null {
  if (!VIDEO_DECK_IDS.has(deckId)) return null
  return `/videos/${deckId}.mp4`
}

export const FALLBACK_TIMELINE_SEC = 30
