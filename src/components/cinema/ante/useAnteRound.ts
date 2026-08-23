import { useEffect, useRef, useState } from "react"
import { getLongestStreak } from "../../../appMachine"
import { isFiniteTimestamp } from "../../../data/moveTimestamps"
import type { Deck, QuestionOption, Session } from "../../../types/domain"
import { useMoveTimeline } from "../useMoveTimeline"
import { useTimers } from "../quiz/quizMotion"
import { revealSegment, useSegmentPlayer } from "../quiz/useSegmentPlayer"

export const ANTE_CLOCK_MS = 6000
export const ANTE_TOP_STAKE = 4
/** Correct-answer reveal always plays at 1x in train mode. */
export const CORRECT_REVEAL_PLAYBACK_RATE = 1
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
  slot: number
  deckMoveIdx: number
  options: QuestionOption[]
}

export interface UseAnteRoundArgs {
  deck: Deck
  session: Session
  videoEl: HTMLVideoElement | null
  onOptionClick: (optionIndex: number) => void
  onTapOut?: () => void
  onRestart?: () => void
  config?: AnteRoundConfig
  /** Optional in-memory timestamps (e.g. tagger preview). */
  timestamps?: (number | null)[] | null
}

export function useAnteRound({
  deck,
  session,
  videoEl,
  onOptionClick,
  onTapOut,
  onRestart,
  config = {},
  timestamps: timestampOverrides = null,
}: UseAnteRoundArgs): AnteRound {
  const { buzzHoldMs = 1600, buzzReplay = false, correctHoldMs } = config
  const clockRef = useRef(0)
  const askedAtRef = useRef(0)
  const paidRef = useRef<number | null>(null)
  const frozenRef = useRef<FrozenAsk | null>(null)
  const sessionRef = useRef(session)
  const onOptionClickRef = useRef(onOptionClick)
  const onTapOutRef = useRef(onTapOut)
  sessionRef.current = session
  onOptionClickRef.current = onOptionClick
  onTapOutRef.current = onTapOut
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
  const timeline = useMoveTimeline(deck.id, deck.moves.length, videoEl, undefined, timestampOverrides)
  const { play, hold, cancel } = useSegmentPlayer(videoEl)
  const { after, clearAll } = useTimers()
  paidRef.current = paid
  frozenRef.current = frozen

  const moveOrder = session.moveOrder
  const total = moveOrder.length
  const askSlot = frozen?.slot ?? session.moveSequence.length
  const deckMoveIdx = frozen?.deckMoveIdx ?? moveOrder[askSlot] ?? 0
  const askOptions = frozen?.options ?? session.options
  const history: DrillResult[] = session.moveSequence.map(a => (a.correct ? "hit" : "miss"))
  const misses = history.filter(h => h === "miss").length
  const best = Math.max(getLongestStreak(session.moveSequence), session.currentStreak)
  const done = session.locked || askSlot >= total

  const drill: AnteDrillView = {
    phase: done && phase === "asking" ? "done" : phase,
    picked,
    moveIdx: Math.min(askSlot, Math.max(0, total - 1)),
    total,
    options: askOptions,
    streak: session.currentStreak,
    best,
    misses,
    history,
    beat,
    move: deck.moves[deckMoveIdx],
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

    const slot = session.moveSequence.length
    if (slot >= total) return

    const deckMoveIdx = moveOrder[slot]
    setPaid(null)
    setRemaining(ANTE_CLOCK_MS)

    const openClock = () => {
      const snap = sessionRef.current
      const optsAtOpen = snap.options
      const slotAtOpen = snap.moveSequence.length
      askedAtRef.current = performance.now()
      setRemaining(ANTE_CLOCK_MS)
      setPaid(null)
      setReady(true)
      setLive(true)
      clockRef.current = window.setTimeout(() => {
        clockRef.current = 0
        setLive(false)
        setMarks(m => ({ ...m, [slotAtOpen]: "clock" }))
        setFrozen({
          slot: slotAtOpen,
          deckMoveIdx: moveOrder[slotAtOpen],
          options: optsAtOpen,
        })
        setPhase("wrong")
        setPicked(null)
        setBeat(b => b + 1)
        onTapOutRef.current?.()
      }, ANTE_CLOCK_MS)
    }

    const t = timeline.timestamps[deckMoveIdx]
    hold(isFiniteTimestamp(t) ? t : 0)
    openClock()

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
    const moveIdx = frozen?.deckMoveIdx
    if (moveIdx == null) return

    setReady(false)
    const buzzed = phase === "wrong" && picked === null

    if (phase === "correct") {
      const won = paidRef.current ?? 1
      const holdMs = typeof correctHoldMs === "function"
        ? correctHoldMs(won)
        : correctHoldMs ?? (won >= 3 ? 800 : 460)
      play(revealSegment(timeline, moveIdx), {
        rate: CORRECT_REVEAL_PLAYBACK_RATE,
        onEnd: () => after(holdMs, () => {
          setPhase("asking")
          setPicked(null)
          setFrozen(null)
          setBeat(b => b + 1)
        }),
      })
    } else {
      const settle = () => {
        setPhase("asking")
        setPicked(null)
        setFrozen(null)
        setBeat(b => b + 1)
      }
      if (!buzzed) {
        const holdMs = typeof correctHoldMs === "function"
          ? correctHoldMs(0)
          : correctHoldMs ?? 460
        play(revealSegment(timeline, moveIdx), {
          rate: CORRECT_REVEAL_PLAYBACK_RATE,
          onEnd: () => after(holdMs, settle),
        })
      } else if (buzzReplay) {
        const loop = () => play(revealSegment(timeline, moveIdx), { rate: 0.75, onEnd: loop })
        loop()
      } else {
        const t = timeline.timestamps[moveIdx]
        hold(isFiniteTimestamp(t) ? t : 0)
      }
      if (buzzed && buzzHoldMs !== null) {
        after(buzzHoldMs, settle)
      }
    }

    return () => {
      cancel()
      clearAll()
    }
  }, [timeline, phase, beat, frozen?.deckMoveIdx, picked])

  const answer = (optionIndex: number) => {
    if (phase !== "asking" || !live || session.locked) return
    if (clockRef.current) window.clearTimeout(clockRef.current)
    clockRef.current = 0
    setLive(false)
    clearAll()
    const opts = session.options
    const slot = session.moveSequence.length
    const deckMoveIdx = moveOrder[slot]
    const correct = !!opts[optionIndex]?.correct
    const won = anteStake(performance.now() - askedAtRef.current)
    setFrozen({ slot, deckMoveIdx, options: opts })
    setPhase(correct ? "correct" : "wrong")
    setPicked(optionIndex)
    setBeat(b => b + 1)
    if (correct) {
      setPaid(won)
      setScore(s => s + won)
      setMarks(m => ({ ...m, [slot]: won }))
    } else {
      setPaid(null)
      setMarks(m => ({ ...m, [slot]: "miss" }))
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
