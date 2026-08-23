import { useEffect } from "react"
import {
  applyVolumeSettings,
  loadVolumeSettings,
  saveVolumeSettings,
} from "../utils/volumeStorage"

/** Restore persisted volume/mute on a media element and write back on change. */
export function usePersistedMediaVolume(
  media: HTMLMediaElement | null,
  opts?: { forceMuted?: boolean },
): void {
  const forceMuted = opts?.forceMuted ?? false

  useEffect(() => {
    if (!media) return

    applyVolumeSettings(media, loadVolumeSettings(), { forceMuted })

    const onVolumeChange = () => {
      const prev = loadVolumeSettings()
      saveVolumeSettings({
        volume: media.volume,
        muted: forceMuted ? prev.muted : media.muted,
      })
    }

    media.addEventListener("volumechange", onVolumeChange)
    return () => media.removeEventListener("volumechange", onVolumeChange)
  }, [media, forceMuted])
}
