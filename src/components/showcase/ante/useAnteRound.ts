import { useEffect, useRef, useState } from "react"
import type { Deck } from "../../../types/domain"
import { useMoveTimeline } from "../useMoveTimeline"
import { useTimers } from "../quiz/quizMotion"
import { leadInSegment, revealSegment, useSegmentPlayer } from "../quiz/useSegmentPlayer"
import { useQuizDrill } from "../quiz/useQuizDrill"

export const ANTE_CLOCK_MS = 6000
export const ANTE_TOP_STAKE = 4
/** No peek button in these variants: time is the only currency, so three
 * stall steps walk the stake all the way down x4 -> x1 before the buzzer. */
export const ANTE_STALL_STEPS = [1500, 3000, 4500]

export function anteStake(elapsedMs: number): number {
  return Math.max(1, ANTE_TOP_STAKE - ANTE_STALL_STEPS.filter(s => elapsedMs >= s).length)
}

/** Strobe pays information in flashes: one at the open, one per stall step,
 * each a little longer than the last. */
const STROBE_STARTS = [120, ...ANTE_STALL_STEPS]
const STROBE_DURS = [240, 340, 460, 620]

export function strobeLit(elapsedMs: number): boolean {
  return STROBE_STARTS.some((start, i) => elapsedMs >= start && elapsedMs < start + STROBE_DURS[i])
}

export type AnteMark = number | "miss" | "clock"

export interface AnteRoundConfig {
  /** How long a buzzer holds before auto-advancing; null waits for next(). */
  buzzHoldMs?: number | null
  /** Loop the missed segment at slow speed during a buzzer instead of freezing. */
  buzzReplay?: boolean
  /** Post-reveal pause before the next move; defaults to 460ms / 800ms by stake. */
  correctHoldMs?: number | ((won: number) => number)
}

export interface AnteRound {
  drill: ReturnType<typeof useQuizDrill>
  ready: boolean
  live: boolean
  remaining: number
  elapsed: number
  /** Live drained stake while the clock is open; opening stake otherwise. */
  stake: number
  paid: number | null
  /** Payout once the call is in: the win, 0 on a bust, null while open. */
  settled: number | null
  score: number
  card: AnteMark[]
  answer: (optionIndex: number) => void
  /** Advance out of a settled round early; the manual path for buzzHoldMs: null. */
  next: () => void
  restart: () => void
}

export function useAnteRound(
  deck: Deck,
  videoEl: HTMLVideoElement | null,
  { buzzHoldMs = 1600, buzzReplay = false, correctHoldMs }: AnteRoundConfig = {},
): AnteRound {
  const clockRef = useRef(0)
  const askedAtRef = useRef(0)
  const paidRef = useRef<number | null>(null)
  const [live, setLive] = useState(false)
  const [ready, setReady] = useState(false)
  const [remaining, setRemaining] = useState(ANTE_CLOCK_MS)
  const [score, setScore] = useState(0)
  const [paid, setPaid] = useState<number | null>(null)
  const [marks, setMarks] = useState<Record<number, AnteMark>>({})
  const timeline = useMoveTimeline(deck.moves.length, videoEl)
  const { play, hold, cancel } = useSegmentPlayer(videoEl)
  const drill = useQuizDrill(deck)
  const { after, clearAll } = useTimers()
  paidRef.current = paid

  useEffect(() => {
    return () => {
      if (clockRef.current) window.clearTimeout(clockRef.current)
    }
  }, [])

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, ANTE_CLOCK_MS - (performance.now() - askedAtRef.current)))
    }, 60)
    return () => window.clearInterval(id)
  }, [live, drill.beat])

  useEffect(() => {
    if (!timeline) return

    if (drill.phase === "asking") {
      setReady(false)
      setLive(false)
      setRemaining(ANTE_CLOCK_MS)
      setPaid(null)
      const openClock = () => {
        askedAtRef.current = performance.now()
        setRemaining(ANTE_CLOCK_MS)
        setPaid(null)
        setReady(true)
        setLive(true)
        clockRef.current = window.setTimeout(() => {
          clockRef.current = 0
          setLive(false)
          setMarks(m => ({ ...m, [drill.history.length]: "clock" }))
          drill.forfeit()
        }, ANTE_CLOCK_MS)
      }
      if (drill.moveIdx === 0) {
        hold(0)
        openClock()
      } else {
        play(leadInSegment(timeline, drill.moveIdx), { onEnd: openClock })
      }
    } else if (drill.phase === "correct") {
      setReady(false)
      const won = paidRef.current ?? 1
      // The tape pays out at the speed you earned: a blind call whips through it.
      const hold = typeof correctHoldMs === "function"
        ? correctHoldMs(won)
        : correctHoldMs ?? (won >= 3 ? 800 : 460)
      play(revealSegment(timeline, drill.moveIdx), {
        rate: 1 + won * 0.3,
        onEnd: () => after(hold, drill.next),
      })
    } else if (drill.phase === "wrong") {
      setReady(false)
      const buzzed = drill.picked === null
      if (buzzed && buzzReplay) {
        const loop = () => play(revealSegment(timeline, drill.moveIdx), { rate: 0.75, onEnd: loop })
        loop()
      } else {
        hold(timeline.timestamps[drill.moveIdx])
      }
      if (!buzzed) {
        after(1600, drill.next)
      } else if (buzzHoldMs !== null) {
        after(buzzHoldMs, drill.next)
      }
    }

    return () => {
      if (clockRef.current) window.clearTimeout(clockRef.current)
      clockRef.current = 0
      cancel()
    }
  }, [timeline, drill.phase, drill.moveIdx, drill.beat])

  const answer = (optionIndex: number) => {
    if (drill.phase !== "asking" || !live) return
    if (clockRef.current) window.clearTimeout(clockRef.current)
    clockRef.current = 0
    setLive(false)
    clearAll()
    const won = anteStake(performance.now() - askedAtRef.current)
    const slot = drill.history.length
    const correct = drill.answer(optionIndex)
    if (correct) {
      setPaid(won)
      setScore(s => s + won)
      setMarks(m => ({ ...m, [slot]: won }))
    } else {
      setPaid(null)
      setMarks(m => ({ ...m, [slot]: "miss" }))
    }
  }

  const next = () => {
    clearAll()
    drill.next()
  }

  const restart = () => {
    if (clockRef.current) window.clearTimeout(clockRef.current)
    clockRef.current = 0
    setLive(false)
    clearAll()
    setMarks({})
    setScore(0)
    setPaid(null)
    drill.restart()
  }

  const elapsed = ANTE_CLOCK_MS - remaining
  const settled = drill.phase === "correct" ? paid : drill.phase === "wrong" ? 0 : null
  const card: AnteMark[] = drill.history.map((result, i) => marks[i] ?? (result === "hit" ? 1 : "miss"))

  return {
    drill,
    ready,
    live,
    remaining,
    elapsed,
    stake: live ? anteStake(elapsed) : ANTE_TOP_STAKE,
    paid,
    settled,
    score,
    card,
    answer,
    next,
    restart,
  }
}
