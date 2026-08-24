import { useEffect, useState } from "react"
import { BleedDusk2Overlay, DUSK2_BLEED_VARIANT } from "../cinema/dusk2"
import ReviewConfirmPopover from "../ReviewConfirmPopover"
import type { Deck, ProgressMap, Session } from "../../types/domain"
import { videoSrcForDeck } from "../../utils/deckVideo"
import * as analytics from "../../utils/analytics"

interface Dusk2TrainingViewProps {
  deck: Deck
  session: Session
  progress: ProgressMap
  onOptionClick: (optionIndex: number) => void
  onTapOut?: () => void
  onBack: () => void
  onSwitchToReview: () => void
  onRestart?: () => void
  onNext: () => void
  onHome: () => void
  onTryAgain: () => void
  onStats: () => void
  /** Optional in-memory timestamps (e.g. tagger preview). */
  timestamps?: (number | null)[] | null
}

export default function Dusk2TrainingView({
  deck,
  session,
  progress,
  onOptionClick,
  onTapOut,
  onBack,
  onSwitchToReview,
  onRestart,
  onNext,
  onHome,
  onTryAgain,
  onStats,
  timestamps = null,
}: Dusk2TrainingViewProps) {
  const [reviewConfirm, setReviewConfirm] = useState(false)
  const videoSrc = videoSrcForDeck(deck.id)
  const moveIdx = session.moveSequence.length

  useEffect(() => {
    analytics.pageview(`/training/${deck.id}`)
  }, [deck.id])

  useEffect(() => {
    if (!session.locked || !session.finalAttempt) return
    analytics.pageview(`/completion/${deck.id}`)
    analytics.event({
      action: "test_completed",
      category: "Training",
      label: `${deck.id} - ${deck.name}`,
      value: session.finalAttempt.finalStreak,
    })
  }, [deck.id, deck.name, session.locked, session.finalAttempt])

  return (
    <>
      <BleedDusk2Overlay
        deck={deck}
        session={session}
        progress={progress}
        videoSrc={videoSrc}
        variant={DUSK2_BLEED_VARIANT}
        timestamps={timestamps}
        onOptionClick={onOptionClick}
        onTapOut={onTapOut}
        onClose={() => {
          if (!session.locked) {
            analytics.event({
              action: "test_abandoned",
              category: "Training",
              label: `${deck.id} - ${deck.name}`,
              value: moveIdx,
            })
          }
          onBack()
        }}
        onReview={() => setReviewConfirm(true)}
        onRestart={onRestart}
        onNext={onNext}
        onHome={onHome}
        onTryAgain={onTryAgain}
        onStats={onStats}
      />
      <ReviewConfirmPopover
        open={reviewConfirm}
        onConfirm={() => {
          setReviewConfirm(false)
          onSwitchToReview()
        }}
        onCancel={() => setReviewConfirm(false)}
      />
    </>
  )
}
