import type { Deck, Series } from "../types/domain"

export let SERIES: Series[] = []
export let DECKS: Deck[] = []

export function applyDeckCatalog(nextSeries: Series[], nextDecks: Deck[]) {
  SERIES = nextSeries
  DECKS = nextDecks
}
