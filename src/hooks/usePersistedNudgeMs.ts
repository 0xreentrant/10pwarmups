import { useCallback, useState } from "react"

export const NUDGE_MS_STORAGE_KEY = "tp_tagger_nudge_ms"
export const DEFAULT_NUDGE_MS = 2000
export const MIN_NUDGE_MS = 100
export const MAX_NUDGE_MS = 60_000

export function clampNudgeMs(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_NUDGE_MS
  return Math.min(MAX_NUDGE_MS, Math.max(MIN_NUDGE_MS, Math.round(n)))
}

export function loadNudgeMs(): number {
  if (typeof window === "undefined") return DEFAULT_NUDGE_MS
  try {
    const raw = localStorage.getItem(NUDGE_MS_STORAGE_KEY)
    if (raw == null) return DEFAULT_NUDGE_MS
    return clampNudgeMs(Number(raw))
  } catch {
    return DEFAULT_NUDGE_MS
  }
}

export function saveNudgeMs(ms: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(NUDGE_MS_STORAGE_KEY, String(clampNudgeMs(ms)))
  } catch {}
}

export function usePersistedNudgeMs(): [number, (ms: number) => void] {
  const [nudgeMs, setNudgeMsState] = useState(loadNudgeMs)
  const setNudgeMs = useCallback((ms: number) => {
    const next = clampNudgeMs(ms)
    saveNudgeMs(next)
    setNudgeMsState(next)
  }, [])
  return [nudgeMs, setNudgeMs]
}
