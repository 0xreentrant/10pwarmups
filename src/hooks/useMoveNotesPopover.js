import { useCallback, useEffect, useRef, useState } from "react"

export function useMoveNotesPopover() {
  const [moveIndex, setMoveIndex] = useState(null)
  const popoverRef = useRef(null)

  const close = useCallback(() => {
    setMoveIndex(null)
  }, [])

  const open = useCallback(index => {
    setMoveIndex(index)
  }, [])

  useEffect(() => {
    if (moveIndex === null) return

    function handleKeyDown(e) {
      if (e.key === "Escape") close()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [moveIndex, close])

  return { moveIndex, popoverRef, open, close }
}
