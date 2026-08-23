export const VOLUME_STORAGE_KEY = "tp_volume"

export type VolumeSettings = {
  volume: number
  muted: boolean
}

export const DEFAULT_VOLUME: VolumeSettings = { volume: 1, muted: false }

function clampVolume(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_VOLUME.volume
  return Math.min(1, Math.max(0, n))
}

export function loadVolumeSettings(): VolumeSettings {
  if (typeof window === "undefined") return DEFAULT_VOLUME
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (!raw) return DEFAULT_VOLUME
    const parsed = JSON.parse(raw) as Partial<VolumeSettings>
    return {
      volume: clampVolume(typeof parsed.volume === "number" ? parsed.volume : DEFAULT_VOLUME.volume),
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_VOLUME.muted,
    }
  } catch {
    return DEFAULT_VOLUME
  }
}

export function saveVolumeSettings(settings: VolumeSettings): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      VOLUME_STORAGE_KEY,
      JSON.stringify({
        volume: clampVolume(settings.volume),
        muted: Boolean(settings.muted),
      }),
    )
  } catch {}
}

export function applyVolumeSettings(
  media: HTMLMediaElement,
  settings: VolumeSettings,
  opts?: { forceMuted?: boolean },
): void {
  media.volume = clampVolume(settings.volume)
  media.muted = opts?.forceMuted ? true : settings.muted
}
