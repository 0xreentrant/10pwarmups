import MoveLabel from "./MoveLabel"
import MoveNotesPopover from "./MoveNotesPopover"
import { useMoveNotesPopover } from "../hooks/useMoveNotesPopover"

export default function MoveList({ deck, moveSequence, visibleThroughIndex }) {
  const { moveIndex, popoverRef, open, close } = useMoveNotesPopover()

  return (
    <div className="relative">
      {deck.moves.map((move, i) => {
        if (i > visibleThroughIndex) return null
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
              onClick={() => open(i)}
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
