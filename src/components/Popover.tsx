import { useEffect } from "react"
import type { ReactNode, RefObject } from "react"
import { createPortal } from "react-dom"

interface PopoverProps {
  open: boolean
  onClose: () => void
  titleId: string
  popoverRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
}

export default function Popover({ open, onClose, titleId, popoverRef, children }: PopoverProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className="popover-backdrop" aria-hidden="true" onMouseDown={onClose} />
      <div
        ref={popoverRef}
        className="popover"
        role="dialog"
        aria-labelledby={titleId}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
