import Popover from "./Popover"
import { formatReleaseDate } from "../data/whatsNew"

const INSTALL_HELP_URL = "https://support.google.com/chrome/answer/9658361"

export default function WhatsNewPopover({ open, onDismiss }) {
  return (
    <Popover open={open} onClose={onDismiss} titleId="whats-new-title">
      <div className="popover-header">
        <span id="whats-new-title" className="popover-title" style={{ color: "var(--accent)" }}>
          What&apos;s New
        </span>
        <button type="button" className="popover-close" aria-label="Close" onClick={onDismiss}>×</button>
      </div>
      <p className="meta" style={{ marginBottom: 8, letterSpacing: "0.06em" }}>{formatReleaseDate()}</p>
      <p className="popover-body">
        Trainer works offline, and you can <a href={INSTALL_HELP_URL} target="_blank" rel="noopener noreferrer">install it to your phone like an app</a>
        <br /><br />
        Check the <a href="updates.html" target="_blank" rel="noopener noreferrer">latest updates</a>.
      </p>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={onDismiss}>Got it</button>
      </div>
    </Popover>
  )
}
