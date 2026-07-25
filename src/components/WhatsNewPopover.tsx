import { Link } from "@tanstack/react-router"
import { appActor } from "../appActor"
import Popover from "./Popover"
import { formatReleaseDate } from "../data/whatsNew"

const POPOVER_LINK = "text-text underline decoration-accent underline-offset-2 hover:text-accent"
const MARVIN_FLOW_ID = "marvin-flow"

interface WhatsNewPopoverProps {
  open: boolean
  onDismiss: () => void
}

export default function WhatsNewPopover({ open, onDismiss }: WhatsNewPopoverProps) {
  return (
    <Popover open={open} onClose={onDismiss} titleId="whats-new-title">
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span id="whats-new-title" className="font-disp font-bold text-[0.85rem] uppercase tracking-wide text-accent">
          What&apos;s New
        </span>
        <button type="button" className="bg-transparent border-0 p-0 px-0.5 cursor-pointer text-muted text-lg leading-none shrink-0 hover:text-text" aria-label="Close" onClick={onDismiss}>×</button>
      </div>
      <p className="text-[11px] text-muted mt-0.5 mb-2 tracking-wide">{formatReleaseDate()}</p>
      <p className="m-0 text-muted leading-normal">
        <Link
          to="/$deckId/training"
          params={{ deckId: MARVIN_FLOW_ID }}
          className={POPOVER_LINK}
          onClick={() => {
            appActor.send({ type: "START_DECK", deckId: MARVIN_FLOW_ID })
            onDismiss()
          }}
        >
          Marvin Flow
        </Link>
        {" "}is in the trainer. Review mode shows the full move list without the quiz - tap Review next to Train on any deck. Video links are bigger and easier to tap.
        <br /><br />
        Check the <a href="updates.html" className={POPOVER_LINK} target="_blank" rel="noopener noreferrer">latest updates</a>.
      </p>
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-primary" onClick={onDismiss}>Got it</button>
      </div>
    </Popover>
  )
}
