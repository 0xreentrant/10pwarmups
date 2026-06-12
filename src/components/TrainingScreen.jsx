import { useEffect } from "react"
import { getLongestStreak } from "../appMachine"
import DeckLink from "./DeckLink"
import MoveLabel from "./MoveLabel"
import MoveList from "./MoveList"
import * as analytics from "../utils/analytics"

export default function TrainingScreen({ deck, session, onOptionClick, onBack }) {
  const moveIdx = session.moveSequence.length
  const total = deck.moves.length
  const sessionBestStreak = Math.max(getLongestStreak(session.moveSequence), session.currentStreak)

  useEffect(() => {
    analytics.pageview(`/training/${deck.id}`)
  }, [])

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
        <MoveList
          deck={deck}
          moveSequence={session.moveSequence}
          visibleThroughIndex={moveIdx - 1}
        />
      </fieldset>

      <fieldset style={{ marginBottom: 16 }}>
        <legend>What's next?</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {session.options.map((opt, i) => (
            <button
              key={i}
              className="btn option-btn"
              onClick={() => onOptionClick(i)}
            >
              <MoveLabel move={opt} />
            </button>
          ))}
        </div>
      </fieldset>

      <button className="btn btn-ghost" onClick={() => {
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
