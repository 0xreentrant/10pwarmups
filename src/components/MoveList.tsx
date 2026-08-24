import MoveLabel from "./MoveLabel"
import MoveNotesPopover from "./MoveNotesPopover"
import { useMoveNotesPopover } from "../hooks/useMoveNotesPopover"
import type { Deck, MoveAnswer } from "../types/domain"

interface MoveListProps {
  deck: Deck
  moveSequence: MoveAnswer[]
  visibleThroughIndex: number
  /** When set, only these indices are listed (still capped by visibleThroughIndex). */
  moveIndices?: readonly number[]
  /** When set, move label click jumps (e.g. video seek) instead of opening notes. */
  onMoveClick?: (moveIndex: number) => void
}

export default function MoveList({ deck, moveSequence, visibleThroughIndex, moveIndices, onMoveClick }: MoveListProps) {
  const { moveIndex, popoverRef, open, close } = useMoveNotesPopover()
  const indices = moveIndices ?? deck.moves.map((_, i) => i)

  return (
    <div className="relative">
      {indices.map(i => {
        if (i > visibleThroughIndex) return null
        const move = deck.moves[i]
        if (!move) return null
        const answered = moveSequence[i]
        const symbolClass = answered?.correct
          ? "text-green"
          : answered
          ? "text-accent"
          : "text-muted"
        return (
          <div key={i} className="flex gap-2.5 py-0.5 items-baseline text-xs">
            <span className={`min-w-3.5 ${symbolClass}`}>{answered?.correct ? "✓" : answered ? "✗" : "○"}</span>
            <button
              type="button"
              className="move-label-btn"
              onClick={() => onMoveClick ? onMoveClick(i) : open(i)}
            >
              <MoveLabel move={move} />
            </button>
          </div>
        )
      })}
      <MoveNotesPopover
        deck={deck}
        moveIndex={moveIndex}
        popoverRef={popoverRef}
        onClose={close}
      />
    </div>
  )
}
