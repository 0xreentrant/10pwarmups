import { useCallback, useEffect, useRef } from "react"

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Feedback beats are shortened, never skipped, so the loop still reads. */
export function beatMs(ms: number): number {
  return prefersReducedMotion() ? Math.min(ms, 220) : ms
}

export function useTimers() {
  const ids = useRef<number[]>([])

  const clearAll = useCallback(() => {
    ids.current.forEach(id => window.clearTimeout(id))
    ids.current = []
  }, [])

  useEffect(() => clearAll, [clearAll])

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, beatMs(ms))
    ids.current.push(id)
  }, [])

  return { after, clearAll }
}
