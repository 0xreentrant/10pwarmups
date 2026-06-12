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
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span id="move-notes-title" className="font-disp font-bold text-[0.85rem] uppercase tracking-wide">{move.text}</span>
        <button type="button" className="bg-transparent border-0 p-0 px-0.5 cursor-pointer text-muted text-lg leading-none shrink-0 hover:text-text" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <p className="m-0 text-muted leading-normal">{note ?? "No notes for this move"}</p>
    </Popover>
  )
}
