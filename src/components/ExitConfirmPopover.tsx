import Popover from "./Popover"

interface ExitConfirmPopoverProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ExitConfirmPopover({ open, onConfirm, onCancel }: ExitConfirmPopoverProps) {
  return (
    <Popover open={open} onClose={onCancel} titleId="exit-confirm-title">
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span id="exit-confirm-title" className="font-disp font-bold text-[0.85rem] uppercase tracking-wide">Leave this test?</span>
        <button type="button" className="bg-transparent border-0 p-0 px-0.5 cursor-pointer text-muted text-lg leading-none shrink-0 hover:text-text" aria-label="Close" onClick={onCancel}>×</button>
      </div>
      <p className="m-0 text-muted leading-normal">Your timer is paused. Leaving now will end this attempt and return to the deck list.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" className="btn" onClick={onConfirm}>Leave test</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Keep training</button>
      </div>
    </Popover>
  )
}
