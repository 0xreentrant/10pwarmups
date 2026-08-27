import { DECKS } from "../data/decks"
import type { SeriesId } from "../data/warmupSchedule"

const SERIES_LETTERS = new Set(["A", "B", "C", "D", "E", "F", "G", "H"])

export type BetaRouteTarget =
  | { mode: "series"; letter: SeriesId }
  | { mode: "deck"; deckId: string }

export function parseBetaWarmupParam(param: string): BetaRouteTarget | null {
  if (SERIES_LETTERS.has(param)) {
    return { mode: "series", letter: param as SeriesId }
  }
  if (DECKS.some(d => d.id === param)) {
    return { mode: "deck", deckId: param }
  }
  return null
}

export function isValidBetaWarmupParam(param: string): boolean {
  return parseBetaWarmupParam(param) !== null
}
