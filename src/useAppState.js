import { useEffect } from "react"
import { useMachine } from "@xstate/react"
import { appMachine, saveProgress } from "./appMachine"
import { inspect } from "./xstateInspector"

export { getDefaultProgress } from "./appMachine"

export function useAppState(decks, precomputeDeckOptions) {
  const [snapshot, send] = useMachine(appMachine, {
    input: { decks, precomputeDeckOptions },
    inspect,
  })

  useEffect(() => {
    saveProgress(snapshot.context.progress)
  }, [snapshot.context.progress])

  const deck = snapshot.context.currentDeckId
    ? decks.find(d => d.id === snapshot.context.currentDeckId)
    : null

  return {
    view: snapshot.value,
    progress: snapshot.context.progress,
    session: snapshot.context.session,
    statsForDeck: snapshot.context.statsForDeck,
    resetConfirm: snapshot.context.resetConfirm,
    deck,
    startDeck: deckId => send({ type: "START_DECK", deckId }),
    goHome: () => send({ type: "GO_HOME" }),
    goBack: () => send({ type: "GO_BACK" }),
    openStats: deckId => send({ type: "OPEN_STATS", deckId }),
    handleReset: () => send({ type: "RESET" }),
    handleOptionClick: optionIndex => send({ type: "OPTION_CLICK", optionIndex }),
    handleBackHome: () => send({ type: "BACK_HOME" }),
    cancelReset: () => send({ type: "CANCEL_RESET" }),
    setStatsForDeck: deckId => send({ type: "SET_STATS_DECK", deckId }),
  }
}
