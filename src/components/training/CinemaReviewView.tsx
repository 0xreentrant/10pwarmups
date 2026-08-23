import { useEffect } from "react"
import { CinemaOverlay } from "../cinema/review"
import type { Deck } from "../../types/domain"
import { videoSrcForDeck } from "../../utils/deckVideo"
import * as analytics from "../../utils/analytics"

interface CinemaReviewViewProps {
  deck: Deck
  onBack: () => void
  onSwitchToTrain: () => void
}

export default function CinemaReviewView({
  deck,
  onBack,
  onSwitchToTrain,
}: CinemaReviewViewProps) {
  const videoSrc = videoSrcForDeck(deck.id)

  useEffect(() => {
    analytics.pageview(`/review/${deck.id}`)
  }, [deck.id])

  return (
    <CinemaOverlay
      deck={deck}
      videoSrc={videoSrc}
      review
      onClose={onBack}
      onTrain={onSwitchToTrain}
    />
  )
}
