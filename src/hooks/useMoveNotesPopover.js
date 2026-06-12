import { useCallback, useRef, useState } from "react"

export function useMoveNotesPopover() {
  const [moveIndex, setMoveIndex] = useState(null)
  const popoverRef = useRef(null)

  const close = useCallback(() => {
    setMoveIndex(null)
  }, [])

  const open = useCallback(index => {
    setMoveIndex(index)
  }, [])

  return { moveIndex, popoverRef, open, close }
}
