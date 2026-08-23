import CinemaTakeover from "./CinemaTakeover"
import type { Deck } from "../../types/domain"

interface CinemaReviewDemoProps {
  deck: Deck
  videoSrc: string
}

/** Showcase: review page as full-bleed cinema instead of the move list. */
export default function CinemaReviewDemo({ deck, videoSrc }: CinemaReviewDemoProps) {
  return <CinemaTakeover deck={deck} videoSrc={videoSrc} review />
}
