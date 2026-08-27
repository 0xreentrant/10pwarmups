import { DECKS } from "../data/decks"
import { getScheduleState, type SeriesId } from "../data/warmupSchedule"
import type { Deck } from "../types/domain"

const SERIES_LETTERS = new Set(["A", "B", "C", "D", "E", "F", "G", "H"])

export function isSeriesLetter(param: string): param is SeriesId {
  return SERIES_LETTERS.has(param)
}

export function defaultWeekSeriesLetter(): SeriesId | null {
  return getScheduleState().featuredGroup
}

export function homePathForDeck(deck: Deck) {
  if (deck.series) {
    return {
      to: "/series/$letter" as const,
      params: { letter: deck.series as SeriesId },
    }
  }
  return {
    to: "/all" as const,
    hash: "named-flows",
    hashScrollIntoView: false as const,
  }
}

export function homePathForDeckId(deckId: string) {
  const deck = DECKS.find(d => d.id === deckId)
  if (!deck) return { to: "/" as const }
  return homePathForDeck(deck)
}
