import { useEffect, useState } from "react"
import { BleedDusk2Overlay, DUSK2_BLEED_VARIANT } from "../cinema/dusk2"
import ReviewConfirmPopover from "../ReviewConfirmPopover"
import type { Deck, Session } from "../../types/domain"
import { videoSrcForDeck } from "../../utils/deckVideo"
import * as analytics from "../../utils/analytics"

interface Dusk2TrainingViewProps {
  deck: Deck
  session: Session
  onOptionClick: (optionIndex: number) => void
  onTapOut?: () => void
  onBack: () => void
  onSwitchToReview: () => void
  onRestart?: () => void
}

export default function Dusk2TrainingView({
  deck,
  session,
  onOptionClick,
  onTapOut,
  onBack,
  onSwitchToReview,
  onRestart,
}: Dusk2TrainingViewProps) {
  const [reviewConfirm, setReviewConfirm] = useState(false)
  const videoSrc = videoSrcForDeck(deck.id)
  const moveIdx = session.moveSequence.length

  useEffect(() => {
    analytics.pageview(`/training/${deck.id}`)
  }, [deck.id])

  return (
    <>
      <BleedDusk2Overlay
        deck={deck}
        session={session}
        videoSrc={videoSrc}
        variant={DUSK2_BLEED_VARIANT}
        onOptionClick={onOptionClick}
        onTapOut={onTapOut}
        onClose={() => {
          analytics.event({
            action: "test_abandoned",
            category: "Training",
            label: `${deck.id} - ${deck.name}`,
            value: moveIdx,
          })
          onBack()
        }}
        onReview={() => setReviewConfirm(true)}
        onRestart={onRestart}
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
