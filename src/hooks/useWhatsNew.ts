import { useCallback, useState } from "react"
import { APP_RELEASE_VERSION } from "../data/whatsNew"
import { markReleaseSeen, shouldShowWhatsNew } from "../utils/whatsNewStorage"

export function useWhatsNew() {
  const [open, setOpen] = useState(() => shouldShowWhatsNew())

  const dismiss = useCallback(() => {
    markReleaseSeen(APP_RELEASE_VERSION)
    setOpen(false)
  }, [])

  return { open, dismiss }
}
