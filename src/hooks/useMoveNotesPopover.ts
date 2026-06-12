import { useCallback, useRef, useState } from "react"

export function useMoveNotesPopover() {
  const [moveIndex, setMoveIndex] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setMoveIndex(null)
  }, [])

  const open = useCallback((index: number) => {
    setMoveIndex(index)
  }, [])

  return { moveIndex, popoverRef, open, close }
}
