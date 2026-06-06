import { DECKS } from "../data/decks"

const SERIES_DECKS = DECKS.filter(d => d.series)

export function deckLabel(deck) {
  return deck.series ? deck.id : deck.name
}

export function generateOptions(correctMove, correctDeckId) {
  const pool = []
  DECKS.forEach(d => {
    if (d.id === correctDeckId) return
    d.moves.forEach(mv => pool.push(mv))
  })
  const shuffledPool = pool.sort(() => Math.random() - 0.5)
  const wrongs = []
  const seen = new Set([correctMove.text])
  for (const mv of shuffledPool) {
    if (!seen.has(mv.text)) { seen.add(mv.text); wrongs.push(mv) }
    if (wrongs.length === 3) break
  }
  while (wrongs.length < 3) wrongs.push({ text: "Unknown Move " + wrongs.length, partner: "A" })
  const opts = [
    { ...correctMove, correct: true },
    ...wrongs.map(mv => ({ ...mv, correct: false }))
  ]
  return opts.sort(() => Math.random() - 0.5)
}

export function formatRelativeDate(iso) {
  if (!iso) return ""
  const then = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - then) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return diffDays + " days ago"
  if (diffDays < 30) return Math.floor(diffDays / 7) + " weeks ago"
  return Math.floor(diffDays / 30) + " months ago"
}

export function formatDuration(secs) {
  const mm = Math.floor(secs / 60).toString().padStart(2, "0")
  const ss = (secs % 60).toString().padStart(2, "0")
  return `${mm}:${ss}`
}

export function nextDeckId(deckId) {
  const idx = SERIES_DECKS.findIndex(d => d.id === deckId)
  if (idx === -1 || idx === SERIES_DECKS.length - 1) return null
  return SERIES_DECKS[idx + 1].id
}
