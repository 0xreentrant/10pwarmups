import { DECKS, SERIES } from "../data/decks"
import { playableIndicesFromTimestamps, resolveMoveTimestamps } from "../data/moveTimestamps"
import type { SeriesId } from "../data/warmupSchedule"

/** True when at least one move has a tagged start time. */
export function deckHasTaggedMoves(deckId: string, moveCount: number): boolean {
  return playableIndicesFromTimestamps(resolveMoveTimestamps(deckId, moveCount, 0)).length > 0
}

export function seriesHasTaggedDecks(letter: SeriesId): boolean {
  return DECKS.some(d => d.series === letter && deckHasTaggedMoves(d.id, d.moves.length))
}

export function firstTaggedSeriesLetter(): SeriesId | null {
  for (const series of SERIES) {
    const letter = series.id as SeriesId
    if (seriesHasTaggedDecks(letter)) return letter
  }
  return null
}

/** Prefer today's series for the home demo; fall back when it has no Train/Review rows. */
export function seriesLetterForScheduleDemo(preferred: SeriesId | null): SeriesId | null {
  if (preferred && seriesHasTaggedDecks(preferred)) return preferred
  return firstTaggedSeriesLetter() ?? preferred
}
