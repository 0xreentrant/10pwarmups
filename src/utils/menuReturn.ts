/** Session memory for returning to /all with scroll after train/review. */

import { homePathForDeck, homePathForDeckId } from "./seriesRoute"
import type { Deck } from "../types/domain"

let returnToAll = false
let allScrollY: number | null = null

export function rememberAllMenuReturn(scrollY: number) {
  returnToAll = true
  allScrollY = scrollY
}

export function consumeReturnToAll(): boolean {
  if (!returnToAll) return false
  returnToAll = false
  return true
}

export function consumeAllScrollY(): number | null {
  returnToAll = false
  const y = allScrollY
  allScrollY = null
  return y
}

export function clearMenuReturn() {
  returnToAll = false
  allScrollY = null
}

export function sessionHomePathForDeckId(deckId: string) {
  if (consumeReturnToAll()) return { to: "/all" as const }
  return homePathForDeckId(deckId)
}

export function sessionHomePathForDeck(deck: Deck) {
  if (consumeReturnToAll()) return { to: "/all" as const }
  return homePathForDeck(deck)
}
