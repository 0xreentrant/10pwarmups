import { useCallback, useMemo, useReducer } from "react"
import { DECKS } from "../../../data/decks"
import { precomputeDeckOptions } from "../../../utils/deckUtils"
import type { Deck, QuestionOption } from "../../../types/domain"

export type DrillPhase = "asking" | "correct" | "wrong" | "done"

export type DrillResult = "hit" | "miss"

export interface DrillState {
  runId: number
  moveIdx: number
  phase: DrillPhase
  picked: number | null
  streak: number
  best: number
  misses: number
  history: DrillResult[]
  beat: number
}

type DrillAction =
  | { type: "ANSWER"; picked: number | null; correct: boolean }
  | { type: "NEXT"; total: number; advanceOnWrong: boolean }
  | { type: "RESTART" }

function initialState(runId: number): DrillState {
  return {
    runId,
    moveIdx: 0,
    phase: "asking",
    picked: null,
    streak: 0,
    best: 0,
    misses: 0,
    history: [],
    beat: 0,
  }
}

export function drillReducer(state: DrillState, action: DrillAction): DrillState {
  switch (action.type) {
    case "ANSWER": {
      if (state.phase !== "asking") return state
      const streak = action.correct ? state.streak + 1 : 0
      return {
        ...state,
        phase: action.correct ? "correct" : "wrong",
        picked: action.picked,
        streak,
        best: Math.max(state.best, streak),
        misses: state.misses + (action.correct ? 0 : 1),
        history: [...state.history, action.correct ? "hit" : "miss"],
        beat: state.beat + 1,
      }
    }
    case "NEXT": {
      if (state.phase !== "correct" && state.phase !== "wrong") return state
      const advance = state.phase === "correct" || action.advanceOnWrong
      const base = { ...state, picked: null, beat: state.beat + 1 }
      if (!advance) return { ...base, phase: "asking" }
      if (state.moveIdx + 1 >= action.total) return { ...base, phase: "done" }
      return { ...base, phase: "asking", moveIdx: state.moveIdx + 1 }
    }
    case "RESTART":
      return initialState(state.runId + 1)
  }
}

export interface DrillConfig {
  /** false keeps re-posing the same move until it is called correctly. */
  advanceOnWrong?: boolean
}

export function useQuizDrill(deck: Deck, { advanceOnWrong = true }: DrillConfig = {}) {
  const [state, dispatch] = useReducer(drillReducer, 0, initialState)
  const total = deck.moves.length
  const allOptions = useMemo(
    () => precomputeDeckOptions(deck, DECKS),
    [deck, state.runId],
  )
  const options: QuestionOption[] = allOptions[state.moveIdx] ?? allOptions[allOptions.length - 1]

  const answer = useCallback((optionIndex: number) => {
    const correct = !!options[optionIndex]?.correct
    dispatch({ type: "ANSWER", picked: optionIndex, correct })
    return correct
  }, [options])

  const forfeit = useCallback(() => {
    dispatch({ type: "ANSWER", picked: null, correct: false })
  }, [])

  const next = useCallback(() => {
    dispatch({ type: "NEXT", total, advanceOnWrong })
  }, [total, advanceOnWrong])

  const restart = useCallback(() => dispatch({ type: "RESTART" }), [])

  return {
    ...state,
    total,
    options,
    move: deck.moves[state.moveIdx],
    correctIndex: options.findIndex(o => o.correct),
    answer,
    forfeit,
    next,
    restart,
  }
}
