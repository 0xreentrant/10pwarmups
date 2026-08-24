import type { ReactNode } from "react"
import type { SnapshotFrom } from "xstate"
import { appMachine, type AppEvent } from "../../appMachine"
import type { Deck } from "../../types/domain"
import Dusk2TrainingView from "./Dusk2TrainingView"

type AppSnap = SnapshotFrom<typeof appMachine>

export interface TrainingSessionViewProps {
  snap: AppSnap
  send: (event: AppEvent) => void
  deck: Deck
  /** In-memory timestamps (tagger preview); omitted for production decks. */
  timestamps?: (number | null)[] | null
  /** Wrap the live drill in a phone frame (tagger). */
  frameTraining?: (node: ReactNode) => ReactNode
  onExit: () => void
  onSwitchToReview: () => void
  onRestart: () => void
  onNext: () => void
  onHome: () => void
  onTryAgain: () => void
  onStats: () => void
}

/** Shared dusk2 training + full-bleed completion driven by an appMachine snapshot. */
export default function TrainingSessionView({
  snap,
  send,
  deck,
  timestamps = null,
  frameTraining,
  onExit,
  onSwitchToReview,
  onRestart,
  onNext,
  onHome,
  onTryAgain,
  onStats,
}: TrainingSessionViewProps) {
  const session = snap.context.session
  const progress = snap.context.progress
  const active =
    (snap.value === "training" || snap.value === "completed") && !!session

  if (!active || !session) return null

  const training = (
    <Dusk2TrainingView
      deck={deck}
      session={session}
      progress={progress}
      timestamps={timestamps}
      onOptionClick={optionIndex => send({ type: "OPTION_CLICK", optionIndex })}
      onTapOut={() => send({ type: "TAP_OUT" })}
      onBack={onExit}
      onSwitchToReview={onSwitchToReview}
      onRestart={onRestart}
      onNext={onNext}
      onHome={onHome}
      onTryAgain={onTryAgain}
      onStats={onStats}
    />
  )
  return frameTraining ? <>{frameTraining(training)}</> : training
}
