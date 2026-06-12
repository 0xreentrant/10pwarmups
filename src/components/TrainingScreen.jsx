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
    <div className="pt-5 pb-12">
      <div className="flex justify-between items-start mb-5">
        <div>
          {deck.series && <span className="block mb-0.5 font-disp font-extrabold text-base tracking-wide text-muted min-w-8">{deck.id}</span>}
          <h2>{deck.name}</h2>
          <DeckLink link={deck.link} />
        </div>
        <div className="font-disp font-bold text-lg tracking-wide text-accent">🔥 {sessionBestStreak}</div>
      </div>

      <fieldset className="mb-3.5">
        <legend>Sequence ({moveIdx}/{total})</legend>
        <div className="mb-2.5 text-[11px] flex gap-4">
          <span className="text-partner-a">■ Person A</span>
          <span className="text-partner-b">■ Person B</span>
        </div>
        <MoveList
          deck={deck}
          moveSequence={session.moveSequence}
          visibleThroughIndex={moveIdx - 1}
        />
      </fieldset>

      <fieldset className="mb-4">
        <legend>What's next?</legend>
        <div className="flex flex-col gap-1.5">
          {session.options.map((opt, i) => (
            <button
              key={i}
              className="btn option-btn"
              onClick={() => onOptionClick(i)}
            >
              <MoveLabel move={opt} monochrome />
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
