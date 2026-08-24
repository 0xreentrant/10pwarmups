import { useEffect, useState } from "react"
import { getLongestStreak } from "../appMachine"
import DeckLink from "./DeckLink"
import MoveList from "./MoveList"
import OptionMoveText from "./OptionMoveText"
import ReviewConfirmPopover from "./ReviewConfirmPopover"
import StreakFlameBadge from "./StreakFlameBadge"
import type { Deck, Session } from "../types/domain"
import * as analytics from "../utils/analytics"

interface TrainingScreenProps {
  deck: Deck
  mode: "training" | "review"
  session: Session | null
  onOptionClick: (optionIndex: number) => void
  onBack: () => void
  onSwitchToReview: () => void
  onSwitchToTrain: () => void
}

export default function TrainingScreen({
  deck,
  mode,
  session,
  onOptionClick,
  onBack,
  onSwitchToReview,
  onSwitchToTrain,
}: TrainingScreenProps) {
  const [reviewConfirm, setReviewConfirm] = useState(false)
  const isReview = mode === "review"
  const moveIdx = session?.moveSequence.length ?? 0
  const total = deck.moves.length
  const sessionBestStreak = session
    ? Math.max(getLongestStreak(session.moveSequence), session.currentStreak)
    : 0

  useEffect(() => {
    analytics.pageview(isReview ? `/review/${deck.id}` : `/training/${deck.id}`)
  }, [deck.id, isReview])

  return (
    <div className="pt-5 pb-12">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {deck.series && <span className="font-disp font-extrabold text-base tracking-wide text-muted min-w-8">{deck.id}</span>}
          <h2>{deck.name}</h2>
          <DeckLink link={deck.link} variant="full" />
        </div>
        {!isReview && <StreakFlameBadge value={sessionBestStreak} max={total} />}
      </div>

      <div className="mb-5">
        {isReview ? (
          <button type="button" className="btn btn-primary" onClick={onSwitchToTrain}>Train</button>
        ) : (
          <button type="button" className="btn" onClick={() => setReviewConfirm(true)}>Review</button>
        )}
      </div>

      <fieldset className="mb-3.5">
        <legend>Sequence ({isReview ? total : moveIdx}/{total})</legend>
        <div className="mb-2.5 text-[11px] flex gap-4">
          <span className="text-partner-a">■ Person A</span>
          <span className="text-partner-b">■ Person B</span>
        </div>
        <MoveList
          deck={deck}
          moveSequence={session?.moveSequence ?? []}
          visibleThroughIndex={isReview ? total - 1 : moveIdx - 1}
        />
      </fieldset>

      {!isReview && session && (
        <fieldset className="mb-4">
          <legend>What&apos;s next?</legend>
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
      )}

      <button className="btn btn-ghost" onClick={() => {
        if (!isReview) {
          analytics.event({
            action: 'test_abandoned',
            category: 'Training',
            label: `${deck.id} - ${deck.name}`,
            value: moveIdx
          })
        }
        onBack()
      }}>← Back</button>

      <ReviewConfirmPopover
        open={reviewConfirm}
        onConfirm={() => {
          setReviewConfirm(false)
          onSwitchToReview()
        }}
        onCancel={() => setReviewConfirm(false)}
      />
    </div>
  )
}
