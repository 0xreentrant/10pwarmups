import { DECKS } from "../../../data/decks"
import type { Deck, ProgressMap, Session } from "../../../types/domain"
import { deckLabel, formatDuration, nextDeckId } from "../../../utils/deckUtils"
import { TappedStyles } from "../ante/SlapOverlay"

export interface Dusk2CompleteOverlayProps {
  deck: Deck
  session: Session
  progress: ProgressMap
  onNext: () => void
  onHome: () => void
  onTryAgain: () => void
  onStats: () => void
}

/** Full-bleed dusk2 end card — same veil language as tap-out, completion copy. */
export default function Dusk2CompleteOverlay({
  deck,
  session,
  progress,
  onNext,
  onHome,
  onTryAgain,
  onStats,
}: Dusk2CompleteOverlayProps) {
  const total = session.moveOrder.length
  const correct = session.moveSequence.filter(x => x.correct).length
  const duration = session.finalAttempt?.duration ?? 0
  const finalStreak = session.finalAttempt?.finalStreak ?? session.currentStreak
  const bestStreak = Math.max(progress[deck.id]?.bestStreak ?? 0, finalStreak)
  const perfect = correct === total && total > 0
  const nid = nextDeckId(deck.id)
  const nextDeck = nid ? DECKS.find(d => d.id === nid) : null

  return (
    <div className="tp-veil tp-veil--slap tp-veil--complete">
      <TappedStyles />
      <Dusk2CompleteStyles />
      <h2 className={`tp-head tp-head--stamp ${perfect ? "tp-head--perfect" : "tp-head--complete"}`}>
        {perfect ? "Perfect" : "Complete"}
      </h2>
      <p className="tp-cost">
        {correct}/{total} correct · {formatDuration(duration)}
      </p>
      <p className="tp-note">
        streak {finalStreak} · best {bestStreak}/{total}
      </p>
      <div className="tp-actions">
        {nextDeck && (
          <button type="button" className="tp-action" onClick={onNext}>
            Next: {deckLabel(nextDeck)}
          </button>
        )}
        <button type="button" className="tp-action tp-action--ghost" onClick={onTryAgain}>
          Try again
        </button>
        <button type="button" className="tp-action tp-action--ghost" onClick={onStats}>
          Progress history
        </button>
        <button type="button" className="tp-action tp-action--ghost" onClick={onHome}>
          ← Home
        </button>
      </div>
    </div>
  )
}

function Dusk2CompleteStyles() {
  return (
    <style>{`
      .tp-veil--complete {
        gap: 14px;
        padding: 24px 18px;
        background:
          linear-gradient(180deg, rgba(4, 4, 6, 0.4) 0%, rgba(4, 4, 6, 0.22) 42%, rgba(4, 4, 6, 0.82) 100%);
      }

      .tp-head--perfect {
        color: #f2fff7;
        text-shadow:
          0 0 18px rgba(39, 174, 96, 1),
          0 0 48px rgba(39, 174, 96, 0.7),
          0 2px 0 rgba(0, 0, 0, 0.55);
      }

      .tp-head--complete {
        color: #fff8ee;
        text-shadow:
          0 0 18px rgba(255, 170, 60, 0.95),
          0 0 48px rgba(255, 170, 60, 0.55),
          0 2px 0 rgba(0, 0, 0, 0.55);
      }

      .tp-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        width: min(100%, 280px);
      }

      .tp-actions .tp-action {
        width: 100%;
        margin-top: 0;
      }

      .tp-action--ghost {
        color: #fff;
        background: rgba(10, 10, 12, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.28);
        box-shadow: none;
      }

      .tp-action--ghost:hover {
        background: rgba(10, 10, 12, 0.72);
        box-shadow: 0 0 18px rgba(255, 255, 255, 0.12);
      }
    `}</style>
  )
}
