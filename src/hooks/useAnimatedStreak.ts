import { useEffect, useState } from "react"

export const STREAK_REVEAL_MS = 1400
export const PERFECT_CELEBRATION_DELAY_MS = 350
export const CELEBRATION_DURATION_SEC = 2
export const CELEBRATION_MULTIPLICATION = 20
export const CELEBRATION_REACH = 1

export function useAnimatedStreak(target: number, playId: number) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) {
      setValue(target)
      return
    }

    setValue(0)
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / STREAK_REVEAL_MS)
      const eased = 1 - (1 - t) ** 3
      setValue(target * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else setValue(target)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, playId])

  return value
}

export function usePerfectCelebration(isPerfect: boolean, playId: number) {
  const [celebrationPlayId, setCelebrationPlayId] = useState(0)

  useEffect(() => {
    if (!isPerfect) {
      setCelebrationPlayId(0)
      return
    }

    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const revealMs = reducedMotion ? 0 : STREAK_REVEAL_MS

    const timer = window.setTimeout(() => {
      setCelebrationPlayId(id => id + 1)
    }, revealMs + PERFECT_CELEBRATION_DELAY_MS)

    return () => clearTimeout(timer)
  }, [isPerfect, playId])

  return celebrationPlayId
}
