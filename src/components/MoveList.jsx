import MoveLabel from "./MoveLabel"
import MoveNotesPopover from "./MoveNotesPopover"
import { useMoveNotesPopover } from "../hooks/useMoveNotesPopover"

export default function MoveList({ deck, moveSequence, visibleThroughIndex }) {
  const { moveIndex, popoverRef, open, close } = useMoveNotesPopover()

  return (
    <div className="move-list" style={{ position: "relative" }}>
      {deck.moves.map((move, i) => {
        if (i > visibleThroughIndex) return null
        const answered = moveSequence[i]
        const symCls = "move-symbol" + (answered?.correct ? " correct" : answered ? " wrong" : "")
        return (
          <div key={i} className="move-row">
            <span className={symCls}>{answered?.correct ? "✓" : answered ? "✗" : "○"}</span>
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
