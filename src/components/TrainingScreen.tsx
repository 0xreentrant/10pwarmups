import { useEffect } from "react"
import { getLongestStreak } from "../appMachine"
import DeckLink from "./DeckLink"
import MoveLabel from "./MoveLabel"
import type { Deck, Session } from "../types/domain"
import * as analytics from "../utils/analytics"

interface TrainingScreenProps {
  deck: Deck
  session: Session
  onOptionClick: (optionIndex: number) => void
  onBack: () => void
}

export default function TrainingScreen({ deck, session, onOptionClick, onBack }: TrainingScreenProps) {
  const moveIdx = session.moveSequence.length
  const total = deck.moves.length
  const sessionBestStreak = Math.max(getLongestStreak(session.moveSequence), session.currentStreak)

  useEffect(() => {
    analytics.pageview(`/training/${deck.id}`)
  }, [deck.id])

  return (
    <div style={{ paddingTop: 20, paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          {deck.series && <span className="deck-id" style={{ display: "block", marginBottom: 2 }}>{deck.id}</span>}
          <h2>{deck.name}</h2>
          <DeckLink link={deck.link} />
        </div>
        <div className="streak-badge">🔥 {sessionBestStreak}</div>
      </div>

      <fieldset style={{ marginBottom: 14 }}>
        <legend>Sequence ({moveIdx}/{total})</legend>
        <div style={{ marginBottom: 10, fontSize: 11, display: "flex", gap: 16 }}>
          <span className="partner-a">■ Person A</span>
          <span className="partner-b">■ Person B</span>
        </div>
        <div>
          {deck.moves.map((move, i) => {
            const answered = session.moveSequence[i]
            if (i >= moveIdx) return null
            const symCls = "move-symbol" + (answered?.correct ? " correct" : answered ? " wrong" : "")
            return (
              <div key={i} className="move-row">
                <span className={symCls}>{answered?.correct ? "✓" : answered ? "✗" : "○"}</span>
                <MoveLabel move={move} />
              </div>
            )
          })}
        </div>
      </fieldset>

      <fieldset style={{ marginBottom: 16 }}>
        <legend>What's next?</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {session.options.map((opt, i) => (
            <button
              key={i}
              className="option-btn"
              onClick={() => onOptionClick(i)}
            >
              <MoveLabel move={opt} />
            </button>
          ))}
        </div>
      </fieldset>

      <button className="btn-ghost" onClick={() => {
        analytics.event({
          action: 'test_abandoned',
          category: 'Training',
          label: `${deck.id} - ${deck.name}`,
          value: moveIdx
        })
        onBack()
      }}>← Back</button>
    </div>
  )
}
