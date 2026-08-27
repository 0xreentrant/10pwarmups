import HeatGradientCrownBar from "./HeatGradientCrownBar"
import type { Deck, ProgressMap } from "../types/domain"
import * as analytics from "../utils/analytics"
import { homeDeckRowLabel } from "../utils/deckUtils"

interface DeckRowProps {
  deck: Deck
  progress: ProgressMap
  onDeckClick: (deckId: string) => void
  onReviewClick: (deckId: string) => void
  demoReview?: boolean
  demoTrain?: boolean
}

export default function DeckRow({
  deck,
  progress,
  onDeckClick,
  onReviewClick,
  demoReview = false,
  demoTrain = false,
}: DeckRowProps) {
  const prog = progress[deck.id] || { bestStreak: 0, attempts: [] }
  const total = deck.moves.length
  const label = prog.attempts.length === 0
    ? "untrained"
    : prog.bestStreak === total
    ? "complete"
    : "incomplete"
  const animation =
    label === "complete" ? "lava"
    : label === "incomplete" ? "pulse-edge"
    : "none"
  const rowLabel = homeDeckRowLabel(deck)

  const goReview = () => {
    analytics.event({
      action: "deck_review",
      category: "Review",
      label: `${deck.id} - ${deck.name}`,
    })
    onReviewClick(deck.id)
  }

  return (
    <tr>
      <td className="py-2 align-middle w-[4.75rem] overflow-hidden">
        <div className="flex items-center justify-center w-full min-h-[3.25rem] text-muted">
          <span className="font-disp font-extrabold tracking-wide leading-none text-3xl">
            {rowLabel}
          </span>
        </div>
      </td>
      <td className="py-2 pr-1.5 align-top">
        <div className="font-disp font-semibold text-base tracking-tight">{deck.name}</div>
        <div className="text-[11px] text-muted mt-0.5">{prog.bestStreak}/{total} moves · {label}</div>
        <HeatGradientCrownBar value={prog.bestStreak} max={total} animation={animation} />
      </td>
      <td className="py-2 pl-2 align-middle w-[13rem]">
        <div className="flex gap-1 items-center justify-end">
          <button className="btn" onClick={goReview} data-beta-demo={demoReview ? "review" : undefined}>Review</button>
          <button className="btn btn-primary" onClick={() => {
            analytics.event({
              action: 'deck_selected',
              category: 'Training',
              label: `${deck.id} - ${deck.name}`
            })
            onDeckClick(deck.id)
          }} data-beta-demo={demoTrain ? "train" : undefined}>Train</button>
        </div>
      </td>
    </tr>
  )
}
