import Popover from "./Popover"

interface ReviewConfirmPopoverProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ReviewConfirmPopover({ open, onConfirm, onCancel }: ReviewConfirmPopoverProps) {
  return (
    <Popover open={open} onClose={onCancel} titleId="review-confirm-title">
      <div className="flex justify-between items-start gap-2 mb-1.5">
        <span id="review-confirm-title" className="font-disp font-bold text-[0.85rem] uppercase tracking-wide">Switch to review?</span>
        <button type="button" className="bg-transparent border-0 p-0 px-0.5 cursor-pointer text-muted text-lg leading-none shrink-0 hover:text-text" aria-label="Close" onClick={onCancel}>×</button>
      </div>
      <p className="m-0 text-muted leading-normal">Leaving training ends this attempt and resets your quiz progress for this session.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" className="btn py-1.5 px-3" onClick={onConfirm}>Go to review</button>
        <button type="button" className="btn btn-ghost py-1.5 px-3" onClick={onCancel}>Keep training</button>
      </div>
    </Popover>
  )
}
