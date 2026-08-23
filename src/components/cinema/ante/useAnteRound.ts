import { useEffect, useRef, useState } from "react"
import { getLongestStreak } from "../../../appMachine"
import type { Deck, QuestionOption, Session } from "../../../types/domain"
import { useMoveTimeline } from "../useMoveTimeline"
import { useTimers } from "../quiz/quizMotion"
import { leadInSegment, revealSegment, useSegmentPlayer } from "../quiz/useSegmentPlayer"

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
export type DrillPhase = "asking" | "correct" | "wrong" | "done"
export type DrillResult = "hit" | "miss"

/** Presentation view of the quiz for ante UI; session owns real progress. */
export interface AnteDrillView {
  phase: DrillPhase
  picked: number | null
  moveIdx: number
  total: number
  options: QuestionOption[]
  streak: number
  best: number
  misses: number
  history: DrillResult[]
  beat: number
  move: Deck["moves"][number]
}

export interface AnteRoundConfig {
  /** How long a buzzer holds before auto-advancing; null waits for next(). */
  buzzHoldMs?: number | null
  /** Loop the missed segment at slow speed during a buzzer instead of freezing. */
  buzzReplay?: boolean
  /** Post-reveal pause before the next move; defaults to 460ms / 800ms by stake. */
  correctHoldMs?: number | ((won: number) => number)
}

export interface AnteRound {
  drill: AnteDrillView
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

interface FrozenAsk {
  moveIdx: number
  options: QuestionOption[]
}

export interface UseAnteRoundArgs {
  deck: Deck
  session: Session
  videoEl: HTMLVideoElement | null
  onOptionClick: (optionIndex: number) => void
  onRestart?: () => void
  config?: AnteRoundConfig
}

export function useAnteRound({
  deck,
  session,
  videoEl,
  onOptionClick,
  onRestart,
  config = {},
}: UseAnteRoundArgs): AnteRound {
  const { buzzHoldMs = 1600, buzzReplay = false, correctHoldMs } = config
  const clockRef = useRef(0)
  const askedAtRef = useRef(0)
  const paidRef = useRef<number | null>(null)
  const frozenRef = useRef<FrozenAsk | null>(null)
  const sessionRef = useRef(session)
  const onOptionClickRef = useRef(onOptionClick)
  sessionRef.current = session
  onOptionClickRef.current = onOptionClick
  const [phase, setPhase] = useState<DrillPhase>("asking")
  const [picked, setPicked] = useState<number | null>(null)
  const [frozen, setFrozen] = useState<FrozenAsk | null>(null)
  const [beat, setBeat] = useState(0)
  const [live, setLive] = useState(false)
  const [ready, setReady] = useState(false)
  const [remaining, setRemaining] = useState(ANTE_CLOCK_MS)
  const [score, setScore] = useState(0)
  const [paid, setPaid] = useState<number | null>(null)
  const [marks, setMarks] = useState<Record<number, AnteMark>>({})
  const timeline = useMoveTimeline(deck.moves.length, videoEl)
  const { play, hold, cancel } = useSegmentPlayer(videoEl)
  const { after, clearAll } = useTimers()
  paidRef.current = paid
  frozenRef.current = frozen

  const total = deck.moves.length
  const askMoveIdx = frozen?.moveIdx ?? session.moveSequence.length
  const askOptions = frozen?.options ?? session.options
  const history: DrillResult[] = session.moveSequence.map(a => (a.correct ? "hit" : "miss"))
  const misses = history.filter(h => h === "miss").length
  const best = Math.max(getLongestStreak(session.moveSequence), session.currentStreak)
  const done = session.locked || askMoveIdx >= total

  const drill: AnteDrillView = {
    phase: done && phase === "asking" ? "done" : phase,
    picked,
    moveIdx: Math.min(askMoveIdx, Math.max(0, total - 1)),
    total,
    options: askOptions,
    streak: session.currentStreak,
    best,
    misses,
    history,
    beat,
    move: deck.moves[Math.min(askMoveIdx, Math.max(0, total - 1))],
  }

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
  }, [live, beat])

  useEffect(() => {
    if (!timeline) return
    if (phase !== "asking" || session.locked) return

    const moveIdx = session.moveSequence.length
    if (moveIdx >= total) return

    setPaid(null)
    setRemaining(ANTE_CLOCK_MS)

    const openClock = () => {
      const snap = sessionRef.current
      const optsAtOpen = snap.options
      const slot = snap.moveSequence.length
      askedAtRef.current = performance.now()
      setRemaining(ANTE_CLOCK_MS)
      setPaid(null)
      setReady(true)
      setLive(true)
      clockRef.current = window.setTimeout(() => {
        clockRef.current = 0
        setLive(false)
        setMarks(m => ({ ...m, [slot]: "clock" }))
        const wrongIdx = optsAtOpen.findIndex(o => !o.correct)
        setFrozen({ moveIdx: slot, options: optsAtOpen })
        setPhase("wrong")
        setPicked(null)
        setBeat(b => b + 1)
        onOptionClickRef.current(wrongIdx >= 0 ? wrongIdx : 0)
      }, ANTE_CLOCK_MS)
    }

    if (moveIdx === 0) {
      hold(0)
      openClock()
    } else {
      setReady(false)
      setLive(false)
      play(leadInSegment(timeline, moveIdx), { onEnd: openClock })
    }

    return () => {
      if (clockRef.current) window.clearTimeout(clockRef.current)
      clockRef.current = 0
      cancel()
    }
    // beat re-opens the ask after settle; session length is the ask index while asking
  }, [timeline, phase, beat, session.locked, session.moveSequence.length, total])

  useEffect(() => {
    if (!timeline) return
    if (phase !== "correct" && phase !== "wrong") return
    const moveIdx = frozen?.moveIdx
    if (moveIdx == null) return

    setReady(false)
    const buzzed = phase === "wrong" && picked === null

    if (phase === "correct") {
      const won = paidRef.current ?? 1
      const holdMs = typeof correctHoldMs === "function"
        ? correctHoldMs(won)
        : correctHoldMs ?? (won >= 3 ? 800 : 460)
      play(revealSegment(timeline, moveIdx), {
        rate: 1 + won * 0.3,
        onEnd: () => after(holdMs, () => {
          setPhase("asking")
          setPicked(null)
          setFrozen(null)
          setBeat(b => b + 1)
        }),
      })
    } else {
      if (buzzed && buzzReplay) {
        const loop = () => play(revealSegment(timeline, moveIdx), { rate: 0.75, onEnd: loop })
        loop()
      } else {
        hold(timeline.timestamps[moveIdx])
      }
      if (!buzzed) {
        after(1600, () => {
          setPhase("asking")
          setPicked(null)
          setFrozen(null)
          setBeat(b => b + 1)
        })
      } else if (buzzHoldMs !== null) {
        after(buzzHoldMs, () => {
          setPhase("asking")
          setPicked(null)
          setFrozen(null)
          setBeat(b => b + 1)
        })
      }
    }

    return () => {
      cancel()
      clearAll()
    }
  }, [timeline, phase, beat, frozen?.moveIdx, picked])

  const answer = (optionIndex: number) => {
    if (phase !== "asking" || !live || session.locked) return
    if (clockRef.current) window.clearTimeout(clockRef.current)
    clockRef.current = 0
    setLive(false)
    clearAll()
    const opts = session.options
    const moveIdx = session.moveSequence.length
    const correct = !!opts[optionIndex]?.correct
    const won = anteStake(performance.now() - askedAtRef.current)
    setFrozen({ moveIdx, options: opts })
    setPhase(correct ? "correct" : "wrong")
    setPicked(optionIndex)
    setBeat(b => b + 1)
    if (correct) {
      setPaid(won)
      setScore(s => s + won)
      setMarks(m => ({ ...m, [moveIdx]: won }))
    } else {
      setPaid(null)
      setMarks(m => ({ ...m, [moveIdx]: "miss" }))
    }
    onOptionClick(optionIndex)
  }

  const next = () => {
    clearAll()
    setPhase("asking")
    setPicked(null)
    setFrozen(null)
    setBeat(b => b + 1)
  }

  const restart = () => {
    if (clockRef.current) window.clearTimeout(clockRef.current)
    clockRef.current = 0
    setLive(false)
    clearAll()
    setMarks({})
    setScore(0)
    setPaid(null)
    setPhase("asking")
    setPicked(null)
    setFrozen(null)
    setBeat(b => b + 1)
    onRestart?.()
  }

  const elapsed = ANTE_CLOCK_MS - remaining
  const settled = phase === "correct" ? paid : phase === "wrong" ? 0 : null
  const card: AnteMark[] = history.map((result, i) => marks[i] ?? (result === "hit" ? 1 : "miss"))

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
