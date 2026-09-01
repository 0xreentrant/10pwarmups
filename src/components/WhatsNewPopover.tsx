import { Link } from "@tanstack/react-router"
import Popover from "./Popover"
import { formatReleaseDate } from "../data/whatsNew"

const POPOVER_LINK = "text-text underline decoration-accent underline-offset-2 hover:text-accent"

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
      <ul className="m-0 pl-4 list-disc text-muted leading-normal space-y-1.5">
        <li>
          <Link to="/" className={POPOVER_LINK} onClick={onDismiss}>
            Home
          </Link>
          {" "}is now the week schedule for today&apos;s warmups
        </li>
        <li>Train and Review are full-bleed video on every deck</li>
        <li>Preview other rotation weeks from the schedule</li>
        <li>Videos play on iPhone Safari</li>
        <li>Video volume remembered across sessions</li>
      </ul>
      <p className="m-0 mt-2.5 text-muted leading-normal">
        Check the <a href="updates.html" className={POPOVER_LINK} target="_blank" rel="noopener noreferrer">latest updates</a>.
      </p>
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-primary" onClick={onDismiss}>Got it</button>
      </div>
    </Popover>
  )
}
