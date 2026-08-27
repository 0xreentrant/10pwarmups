import { playableIndicesFromTimestamps, resolveMoveTimestamps } from "../data/moveTimestamps"

/** True when at least one move has a tagged start time. */
export function deckHasTaggedMoves(deckId: string, moveCount: number): boolean {
  return playableIndicesFromTimestamps(resolveMoveTimestamps(deckId, moveCount, 0)).length > 0
}
