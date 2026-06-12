import Popover from "./Popover"
import { getMoveNote } from "../utils/deckUtils"

export default function MoveNotesPopover({ deck, moveIndex, popoverRef, onClose }) {
  if (moveIndex === null) return null

  const move = deck.moves[moveIndex]
  const note = getMoveNote(deck, moveIndex)

  return (
    <Popover
      open
      onClose={onClose}
      titleId="move-notes-title"
      popoverRef={popoverRef}
    >
      <div className="popover-header">
        <span id="move-notes-title" className="popover-title">{move.text}</span>
        <button type="button" className="popover-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <p className="popover-body">{note ?? "No notes for this move"}</p>
    </Popover>
  )
}
