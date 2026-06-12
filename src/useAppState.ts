import { useEffect } from "react"
import { useMachine } from "@xstate/react"
import { appMachine, saveProgress } from "./appMachine"
import { inspect } from "./xstateInspector"
import type { Deck, ProgressMap, QuestionOption, Session } from "./types/domain"

export { getDefaultProgress } from "./appMachine"

type PrecomputeDeckOptions = (deck: Deck, decks: Deck[]) => QuestionOption[][]

type AppView = "home" | "training" | "completion" | "progress"

export function useAppState(decks: Deck[], precomputeDeckOptions: PrecomputeDeckOptions) {
  const [snapshot, send] = useMachine(appMachine, {
    input: { decks, precomputeDeckOptions },
    inspect,
  })

  useEffect(() => {
    saveProgress(snapshot.context.progress)
  }, [snapshot.context.progress])

  const deck = snapshot.context.currentDeckId
    ? decks.find(d => d.id === snapshot.context.currentDeckId) ?? null
    : null

  return {
    view: snapshot.value as AppView,
    progress: snapshot.context.progress as ProgressMap,
    session: snapshot.context.session as Session | null,
    statsForDeck: snapshot.context.statsForDeck,
    resetConfirm: snapshot.context.resetConfirm,
    deck,
    startDeck: (deckId: string) => send({ type: "START_DECK", deckId }),
    goHome: () => send({ type: "GO_HOME" }),
    goBack: () => send({ type: "GO_BACK" }),
    openStats: (deckId?: string) => send({ type: "OPEN_STATS", deckId }),
    handleReset: () => send({ type: "RESET" }),
    handleOptionClick: (optionIndex: number) => send({ type: "OPTION_CLICK", optionIndex }),
    handleBackHome: () => send({ type: "BACK_HOME" }),
    cancelReset: () => send({ type: "CANCEL_RESET" }),
    setStatsForDeck: (deckId: string | null) => send({ type: "SET_STATS_DECK", deckId }),
  }
}
