import { useEffect } from "react"
import { getLongestStreak } from "../appMachine"
import DeckLink from "./DeckLink"
import MoveList from "./MoveList"
import OptionMoveText from "./OptionMoveText"
import StreakFlameBadge from "./StreakFlameBadge"
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
    <div className="pt-5 pb-12">
      <div className="flex justify-between items-start mb-5">
        <div>
          {deck.series && <span className="block mb-0.5 font-disp font-extrabold text-base tracking-wide text-muted min-w-8">{deck.id}</span>}
          <h2>{deck.name}</h2>
          <DeckLink link={deck.link} />
        </div>
        <StreakFlameBadge value={sessionBestStreak} max={total} />
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
              <OptionMoveText move={opt} />
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
