import { useCallback, useEffect, useState } from "react"

export const PLAYBACK_SPEED_STORAGE_KEY = "tp_tagger_playback_speed"
export const DEFAULT_PLAYBACK_SPEED = 1
export const MIN_PLAYBACK_SPEED = 0.25
export const MAX_PLAYBACK_SPEED = 2
export const PLAYBACK_SPEED_STEP = 0.05

export function clampPlaybackSpeed(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_PLAYBACK_SPEED
  const rounded = Math.round(rate / PLAYBACK_SPEED_STEP) * PLAYBACK_SPEED_STEP
  return Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, rounded))
}

export function loadPlaybackSpeed(): number {
  if (typeof window === "undefined") return DEFAULT_PLAYBACK_SPEED
  try {
    const raw = localStorage.getItem(PLAYBACK_SPEED_STORAGE_KEY)
    if (raw == null) return DEFAULT_PLAYBACK_SPEED
    return clampPlaybackSpeed(Number(raw))
  } catch {
    return DEFAULT_PLAYBACK_SPEED
  }
}

export function savePlaybackSpeed(rate: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PLAYBACK_SPEED_STORAGE_KEY, String(clampPlaybackSpeed(rate)))
  } catch {}
}

export function usePersistedPlaybackSpeed(
  media: HTMLMediaElement | null,
): [number, (rate: number) => void] {
  const [playbackSpeed, setPlaybackSpeedState] = useState(loadPlaybackSpeed)
  const setPlaybackSpeed = useCallback((rate: number) => {
    const next = clampPlaybackSpeed(rate)
    savePlaybackSpeed(next)
    setPlaybackSpeedState(next)
  }, [])

  useEffect(() => {
    if (!media) return
    media.playbackRate = playbackSpeed
  }, [media, playbackSpeed])

  return [playbackSpeed, setPlaybackSpeed]
}
