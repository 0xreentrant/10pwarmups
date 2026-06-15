import { DECKS } from "../data/decks"
import type { Deck, Move, QuestionOption } from "../types/domain"

const SERIES_DECKS = DECKS.filter(d => d.series)

export function deckLabel(deck: Deck): string {
  return deck.series ? deck.id : deck.name
}

export function homeSectionHash(deck: Deck): string {
  return deck.series ? `series-${deck.series}` : "named-flows"
}

export function getMoveNote(deck: Deck, moveIndex: number): string | null {
  const note = deck.notes?.[moveIndex]
  return note?.trim() ? note : null
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

export function createDistractorPool(decks: Deck[]): string[] {
  const names = new Set<string>()
  decks.forEach(d => {
    d.moves.forEach(mv => names.add(mv.text))
  })
  return shuffleArray([...names])
}

interface PoolState {
  pool: string[]
  cursor: number
}

function pickDistractors(poolState: PoolState, answerText: string, decks: Deck[]): string[] {
  const chosen: string[] = []
  while (chosen.length < 3) {
    if (poolState.cursor >= poolState.pool.length) {
      poolState.pool = createDistractorPool(decks)
      poolState.cursor = 0
    }
    const name = poolState.pool[poolState.cursor++]
    if (name === answerText) continue
    if (chosen.includes(name)) continue
    chosen.push(name)
  }
  return chosen
}

function buildQuestionOptions(correctMove: Move, poolState: PoolState, decks: Deck[]): QuestionOption[] {
  const distractors = pickDistractors(poolState, correctMove.text, decks)
  return shuffleArray([
    { ...correctMove, correct: true },
    ...distractors.map(text => ({ text, correct: false })),
  ])
}

export function precomputeDeckOptions(deck: Deck, decks: Deck[]): QuestionOption[][] {
  const poolState: PoolState = { pool: createDistractorPool(decks), cursor: 0 }
  return deck.moves.map(move => buildQuestionOptions(move, poolState, decks))
}

export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const then = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - then.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return diffDays + " days ago"
  if (diffDays < 30) return Math.floor(diffDays / 7) + " weeks ago"
  return Math.floor(diffDays / 30) + " months ago"
}

export function formatDuration(secs: number): string {
  const mm = Math.floor(secs / 60).toString().padStart(2, "0")
  const ss = (secs % 60).toString().padStart(2, "0")
  return `${mm}:${ss}`
}

export function nextDeckId(deckId: string): string | null {
  const idx = SERIES_DECKS.findIndex(d => d.id === deckId)
  if (idx === -1 || idx === SERIES_DECKS.length - 1) return null
  return SERIES_DECKS[idx + 1].id
}
