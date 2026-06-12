import { createPortal } from "react-dom"
import { getMoveNote } from "../utils/deckUtils"

export default function MoveNotesPopover({ deck, moveIndex, popoverRef, onClose }) {
  if (moveIndex === null) return null

  const move = deck.moves[moveIndex]
  const note = getMoveNote(deck, moveIndex)

  return createPortal(
    <>
      <div className="move-notes-backdrop" aria-hidden="true" onMouseDown={onClose} />
      <div
        ref={popoverRef}
        className="move-notes-popover"
        role="dialog"
        aria-labelledby="move-notes-title"
      >
        <div className="move-notes-header">
          <span id="move-notes-title" className="move-notes-title">{move.text}</span>
          <button type="button" className="move-notes-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <p className="move-notes-body">{note ?? "No notes for this move"}</p>
      </div>
    </>,
    document.body
  )
}
