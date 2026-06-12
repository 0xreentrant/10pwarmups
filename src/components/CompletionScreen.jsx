import { useEffect } from "react"
import MoveList from "./MoveList"
import { DECKS } from "../data/decks"
import { deckLabel, formatDuration, nextDeckId } from "../utils/deckUtils"
import * as analytics from "../utils/analytics"

const STAT_LABEL = "py-1 text-xs text-muted"
const STAT_VALUE = "py-1 pl-5 text-xs text-text font-semibold"

export default function CompletionScreen({ deck, session, progress, onNext, onHome, onTryAgain, onStats }) {
  const total = deck.moves.length
  const correct = session.moveSequence.filter(x => x.correct).length
  const duration = session.finalAttempt ? session.finalAttempt.duration : 0
  const finalStreak = session.finalAttempt?.finalStreak ?? session.currentStreak
  const bestStreak = progress[deck.id]?.bestStreak ?? finalStreak
  const nid = nextDeckId(deck.id)
  const nextDeck = nid ? DECKS.find(d => d.id === nid) : null
  const perfect = correct === total

  useEffect(() => {
    analytics.pageview(`/completion/${deck.id}`)
    analytics.event({
      action: 'test_completed',
      category: 'Training',
      label: `${deck.id} - ${deck.name}`,
      value: finalStreak
    })
  }, [])

  return (
    <div className="pt-5 pb-12">
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
        <div className="font-disp font-bold text-lg tracking-wide text-accent mb-3">🔥 {bestStreak}</div>
        <table className="w-full">
          <tbody>
            <tr><td className={STAT_LABEL}>Correct</td><td className={STAT_VALUE}>{correct}/{total}</td></tr>
            <tr><td className={STAT_LABEL}>Final streak</td><td className={STAT_VALUE}>{finalStreak}</td></tr>
            <tr><td className={STAT_LABEL}>Best streak</td><td className={STAT_VALUE}>{progress[deck.id]?.bestStreak ?? 0}/{total}</td></tr>
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
