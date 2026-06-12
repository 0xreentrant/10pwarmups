import Popover from "./Popover"

export default function ResetConfirmPopover({ open, onConfirm, onCancel }) {
  return (
    <Popover open={open} onClose={onCancel} titleId="reset-confirm-title">
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span id="reset-confirm-title" className="font-disp font-bold text-[0.85rem] uppercase tracking-wide">Reset all progress?</span>
        <button type="button" className="bg-transparent border-0 p-0 px-0.5 cursor-pointer text-muted text-lg leading-none shrink-0 hover:text-text" aria-label="Close" onClick={onCancel}>×</button>
      </div>
      <p className="m-0 text-muted leading-normal">This clears every deck&apos;s streak and attempt history. It can&apos;t be undone.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" className="btn" onClick={onConfirm}>Confirm reset</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </Popover>
  )
}
