import { useEffect } from "react"
import DeckRow from "./DeckRow"
import type { Deck, ProgressMap } from "../types/domain"
import * as analytics from "../utils/analytics"

interface BetaTestScreenProps {
  deck: Deck
  progress: ProgressMap
  onDeckClick: (deckId: string) => void
  onReviewClick: (deckId: string) => void
  onHome: () => void
}

export default function BetaTestScreen({
  deck,
  progress,
  onDeckClick,
  onReviewClick,
  onHome,
}: BetaTestScreenProps) {
  useEffect(() => {
    analytics.pageview(`/beta-test/${deck.id}`)
  }, [deck.id])

  return (
    <div className="pt-7 pb-12">
      <p className="inline-block font-disp font-bold text-[0.65rem] tracking-[0.22em] uppercase text-accent border border-accent/60 px-2 py-0.5 mb-4">
        Beta
      </p>

      <h1 className="text-[clamp(2rem,9vw,2.75rem)] leading-[0.92] tracking-[0.02em] text-wrap-balance">
        V2 Warmups
      </h1>
      <h1 className="text-[clamp(2rem,9vw,2.75rem)] leading-[0.92] tracking-[0.02em] text-accent text-wrap-balance mb-4">
        Trainer
      </h1>

      <p className="font-disp font-semibold text-[1.05rem] leading-snug tracking-tight text-text mb-1 text-wrap-balance">
        You&apos;re testing the new <b>SECRET</b> {" "}
        <span className="inline-block font-bold italic text-accent -skew-x-6 tracking-wide">
          BETA
        </span>{" "}
        flow for today's warmup.
      </p>
      <p className="text-[12px] text-muted leading-relaxed mb-8 max-w-[36ch] text-wrap-pretty">
        The new V2 "Cinematic" training and review.  One warmup below - train it, break it, tell me what sticks in the Signal chat.
      </p>

      <div className="border-t border-border pt-4">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <DeckRow
              deck={deck}
              progress={progress}
              onDeckClick={onDeckClick}
              onReviewClick={onReviewClick}
            />
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
      </div>
    </div>
  )
}
