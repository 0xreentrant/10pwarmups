import Popover from "./Popover"
import { formatReleaseDate } from "../data/whatsNew"

const INSTALL_HELP_URL = "https://support.google.com/chrome/answer/9658361"

const POPOVER_LINK = "text-text underline decoration-accent underline-offset-2 hover:text-accent"

export default function WhatsNewPopover({ open, onDismiss }) {
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
        Trainer works offline, and you can <a href={INSTALL_HELP_URL} className={POPOVER_LINK} target="_blank" rel="noopener noreferrer">install it to your phone like an app</a>
        <br /><br />
        Check the <a href="updates.html" className={POPOVER_LINK} target="_blank" rel="noopener noreferrer">latest updates</a>.
      </p>
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-primary" onClick={onDismiss}>Got it</button>
      </div>
    </Popover>
  )
}
