import { useEffect } from "react"
import { DECKS } from "../data/decks"
import {
  CELEBRATION_DURATION_SEC,
  CELEBRATION_MULTIPLICATION,
  CELEBRATION_REACH,
  useAnimatedStreak,
  usePerfectCelebration,
} from "../hooks/useAnimatedStreak"
import type { Deck, ProgressMap, Session } from "../types/domain"
import FlameCelebrationEffect from "./FlameCelebrationEffect"
import HeatGradientCrownBar from "./HeatGradientCrownBar"
import MoveList from "./MoveList"
import * as analytics from "../utils/analytics"
import { deckLabel, formatDuration, nextDeckId } from "../utils/deckUtils"

const STAT_LABEL = "py-1 text-xs text-muted"
const STAT_VALUE = "py-1 pl-5 text-xs text-text font-semibold"

interface CompletionScreenProps {
  deck: Deck
  session: Session
  progress: ProgressMap
  onNext: () => void
  onHome: () => void
  onTryAgain: () => void
  onStats: () => void
}

export default function CompletionScreen({ deck, session, progress, onNext, onHome, onTryAgain, onStats }: CompletionScreenProps) {
  const total = deck.moves.length
  const correct = session.moveSequence.filter(x => x.correct).length
  const duration = session.finalAttempt ? session.finalAttempt.duration : 0
  const finalStreak = session.finalAttempt?.finalStreak ?? session.currentStreak
  const bestStreak = progress[deck.id]?.bestStreak ?? finalStreak
  const nid = nextDeckId(deck.id)
  const nextDeck = nid ? DECKS.find(d => d.id === nid) : null
  const perfect = correct === total
  const playId = progress[deck.id]?.attempts.length ?? 0
  const animatedStreak = useAnimatedStreak(finalStreak, playId)
  const celebrationPlayId = usePerfectCelebration(perfect, playId)

  useEffect(() => {
    analytics.pageview(`/completion/${deck.id}`)
    analytics.event({
      action: "test_completed",
      category: "Training",
      label: `${deck.id} - ${deck.name}`,
      value: finalStreak,
    })
  }, [deck.id, deck.name, finalStreak])

  return (
    <div className="pt-5 pb-12">
      {perfect && celebrationPlayId > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
          <FlameCelebrationEffect
            playId={celebrationPlayId}
            durationSec={CELEBRATION_DURATION_SEC}
            multiplicationFactor={CELEBRATION_MULTIPLICATION}
            reach={CELEBRATION_REACH}
          />
        </div>
      )}

      {deck.series && <span className="block mb-1 font-disp font-extrabold text-base tracking-wide text-muted min-w-8">{deck.id}</span>}
      <h2 className={`mb-0.5 ${perfect ? "text-green" : "text-text"}`}>
        {perfect ? "Perfect" : "Complete"}
      </h2>
      <p className="text-[11px] text-muted mt-0.5 mb-5">{deck.name}</p>

      <fieldset className="mb-3.5">
        <legend>Sequence</legend>
        <MoveList
          deck={deck}
          moveSequence={session.moveSequence}
          visibleThroughIndex={total - 1}
        />
      </fieldset>

      <fieldset className="mb-5">
        <legend>Results</legend>

        <div className="text-[11px] text-muted mb-0.5">
          {Math.round(animatedStreak)}/{total} · final streak
        </div>
        <HeatGradientCrownBar
          value={animatedStreak}
          max={total}
          animation={perfect ? "lava" : animatedStreak > 0 ? "pulse-edge" : "none"}
        />

        <table className="w-full mt-4">
          <tbody>
            <tr>
              <td className={STAT_LABEL}>Correct</td>
              <td className={perfect ? "py-1 pl-5 text-base text-accent font-bold" : STAT_VALUE}>{correct}/{total}</td>
            </tr>
            <tr><td className={STAT_LABEL}>Final streak</td><td className={STAT_VALUE}>{Math.round(animatedStreak)}</td></tr>
            <tr><td className={STAT_LABEL}>Best streak</td><td className={STAT_VALUE}>{bestStreak}/{total}</td></tr>
            <tr><td className={STAT_LABEL}>Time</td><td className={STAT_VALUE}>{formatDuration(duration)}</td></tr>
          </tbody>
        </table>
      </fieldset>

      <div className="flex flex-col gap-2">
        {nextDeck && <button className="btn btn-primary" onClick={onNext}>Next: {deckLabel(nextDeck)} — {nextDeck.name}</button>}
        <button className="btn" onClick={onTryAgain}>Try again</button>
        <button className="btn" onClick={onStats}>Progress history</button>
        <button className="btn btn-ghost" onClick={onHome}>← Home</button>
      </div>
    </div>
  )
}
