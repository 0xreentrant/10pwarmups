import Popover from "./Popover"

export default function ResetConfirmPopover({ open, onConfirm, onCancel }) {
  return (
    <Popover open={open} onClose={onCancel} titleId="reset-confirm-title">
      <div className="popover-header">
        <span id="reset-confirm-title" className="popover-title">Reset all progress?</span>
        <button type="button" className="popover-close" aria-label="Close" onClick={onCancel}>×</button>
      </div>
      <p className="popover-body">This clears every deck&apos;s streak and attempt history. It can&apos;t be undone.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className="btn" onClick={onConfirm}>Confirm reset</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </Popover>
  )
}
