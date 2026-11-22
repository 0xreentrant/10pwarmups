import { DECKS } from "../data/decks"
import type { Deck } from "../types/domain"

export type WarmupSearchHit = {
  deckId: string
  deckName: string
  series: string
  moveText: string
  score: number
}

export type WarmupSearchEntry = {
  deckId: string
  deckName: string
  series: string
  moveText: string
  haystack: string
}

function seriesLabel(deck: Deck): string {
  if (deck.series) return deck.series
  return deck.name
}

export function buildWarmupSearchEntries(decks: Deck[] = DECKS): WarmupSearchEntry[] {
  const entries: WarmupSearchEntry[] = []
  const seen = new Set<string>()

  for (const deck of decks) {
    const series = seriesLabel(deck)
    for (const move of deck.moves) {
      const moveText = move.text.trim()
      if (!moveText) continue
      const key = `${deck.id}\0${moveText.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({
        deckId: deck.id,
        deckName: deck.name,
        series,
        moveText,
        haystack: moveText.toLowerCase(),
      })
    }
  }

  return entries
}

/** Simple fuzzy score: higher is better. Returns null when no match. */
export function fuzzyScore(query: string, haystack: string): number | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  if (haystack === q) return 1000
  if (haystack.startsWith(q)) return 900 - Math.min(haystack.length - q.length, 100)
  const idx = haystack.indexOf(q)
  if (idx >= 0) return 800 - idx - Math.min(haystack.length - q.length, 50)

  let qi = 0
  let score = 0
  let consecutive = 0
  let firstMatch = -1
  for (let hi = 0; hi < haystack.length && qi < q.length; hi++) {
    if (haystack[hi] !== q[qi]) {
      consecutive = 0
      continue
    }
    if (firstMatch < 0) firstMatch = hi
    consecutive += 1
    score += 10 + consecutive * 4
    if (hi === qi) score += 5
    qi += 1
  }
  if (qi < q.length) return null
  return score - firstMatch
}

export function searchWarmups(
  query: string,
  entries: WarmupSearchEntry[] = buildWarmupSearchEntries(),
  limit = 12,
): WarmupSearchHit[] {
  const q = query.trim()
  if (!q) return []

  const hits: WarmupSearchHit[] = []
  for (const entry of entries) {
    const score = fuzzyScore(q, entry.haystack)
    if (score == null) continue
    hits.push({
      deckId: entry.deckId,
      deckName: entry.deckName,
      series: entry.series,
      moveText: entry.moveText,
      score,
    })
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const byMove = a.moveText.localeCompare(b.moveText)
    if (byMove !== 0) return byMove
    return a.deckId.localeCompare(b.deckId)
  })

  return hits.slice(0, limit)
}
