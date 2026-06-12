import { useEffect } from "react"
import MoveLabel from "./MoveLabel"
import { DECKS } from "../data/decks"
import { deckLabel, formatDuration, nextDeckId } from "../utils/deckUtils"
import type { Deck, ProgressMap, Session } from "../types/domain"
import * as analytics from "../utils/analytics"

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

  useEffect(() => {
    analytics.pageview(`/completion/${deck.id}`)
    analytics.event({
      action: 'test_completed',
      category: 'Training',
      label: `${deck.id} - ${deck.name}`,
      value: finalStreak
    })
  }, [deck.id, deck.name, finalStreak])

  return (
    <div style={{ paddingTop: 20, paddingBottom: 48 }}>
      {deck.series && <span className="deck-id" style={{ display: "block", marginBottom: 4 }}>{deck.id}</span>}
      <h2 style={{ marginBottom: 2, color: perfect ? "var(--green)" : "var(--text)" }}>
        {perfect ? "Perfect" : "Complete"}
      </h2>
      <p className="meta" style={{ marginBottom: 20 }}>{deck.name}</p>

      <fieldset style={{ marginBottom: 14 }}>
        <legend>Sequence</legend>
        {deck.moves.map((move, i) => {
          const s = session.moveSequence[i]
          const symCls = "move-symbol" + (s?.correct ? " correct" : s ? " wrong" : "")
          return (
            <div key={i} className="move-row">
              <span className={symCls}>{s?.correct ? "✓" : s ? "✗" : "○"}</span>
              <MoveLabel move={move} />
            </div>
          )
        })}
      </fieldset>

      <fieldset style={{ marginBottom: 20 }}>
        <legend>Results</legend>
        <div className="streak-badge" style={{ marginBottom: 12 }}>🔥 {bestStreak}</div>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr className="stat-row"><td>Correct</td><td>{correct}/{total}</td></tr>
            <tr className="stat-row"><td>Final streak</td><td>{finalStreak}</td></tr>
            <tr className="stat-row"><td>Best streak</td><td>{progress[deck.id]?.bestStreak ?? 0}/{total}</td></tr>
            <tr className="stat-row"><td>Time</td><td>{formatDuration(duration)}</td></tr>
          </tbody>
        </table>
      </fieldset>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {nextDeck && <button className="btn-primary" onClick={onNext}>Next: {deckLabel(nextDeck)} — {nextDeck.name}</button>}
        <button onClick={onTryAgain}>Try again</button>
        <button onClick={onStats}>Progress history</button>
        <button className="btn-ghost" onClick={onHome}>← Home</button>
      </div>
    </div>
  )
}
