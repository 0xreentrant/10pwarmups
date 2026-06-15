import { setup, assign } from "xstate"
import type { Deck, MoveAnswer, ProgressMap, QuestionOption, Session } from "./types/domain"

const STORAGE_KEY = "tp_progress"

const DECK_ID_MIGRATIONS: Record<string, string> = {
  I1: "attack-series",
  J1: "ramey-flow",
}

export function getDefaultProgress(decks: Deck[]): ProgressMap {
  const p: ProgressMap = {}
  decks.forEach(d => {
    p[d.id] = { currentStreak: 0, bestStreak: 0, lastAttemptDate: null, attempts: [] }
  })
  return p
}

export function loadProgress(decks: Deck[]): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultProgress(decks)
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (typeof parsed !== "object" || parsed === null) return getDefaultProgress(decks)
    const base = getDefaultProgress(decks)
    Object.entries(DECK_ID_MIGRATIONS).forEach(([oldId, newId]) => {
      if (parsed[oldId] && !parsed[newId]) parsed[newId] = parsed[oldId]
      delete parsed[oldId]
    })
    Object.keys(base).forEach(id => { if (!parsed[id]) parsed[id] = base[id] })
    return parsed as ProgressMap
  } catch { return getDefaultProgress(decks) }
}

export function saveProgress(progress: ProgressMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) } catch {}
}

function resetProgress() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function getLongestStreak(moveSequence: MoveAnswer[]): number {
  let longest = 0
  let current = 0
  moveSequence.forEach(answer => {
    if (answer.correct) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  })
  return longest
}

export function getActiveSessionElapsedMs(session: Session): number {
  const now = Date.now()
  const accumulatedPauseMs = session.accumulatedPauseMs ?? 0
  const currentPauseMs = session.pausedAt ? now - session.pausedAt : 0
  return now - session.startTime - accumulatedPauseMs - currentPauseMs
}

type PrecomputeDeckOptions = (deck: Deck, decks: Deck[]) => QuestionOption[][]

interface AppContext {
  decks: Deck[]
  precomputeDeckOptions: PrecomputeDeckOptions
  progress: ProgressMap
  currentDeckId: string | null
  session: Session | null
  resetConfirm: boolean
  exitConfirm: boolean
}

interface AppInput {
  decks: Deck[]
  precomputeDeckOptions: PrecomputeDeckOptions
}

export type AppEvent =
  | { type: "START_DECK"; deckId: string }
  | { type: "OPTION_CLICK"; optionIndex: number }
  | { type: "RESET" }
  | { type: "CANCEL_RESET" }
  | { type: "GO_HOME" }
  | { type: "RESTORE_COMPLETED" }
  | { type: "REQUEST_EXIT" }
  | { type: "CANCEL_EXIT" }
  | { type: "CONFIRM_EXIT" }

export function hasRestorableCompletion(
  snap: { value: unknown; context: AppContext },
  deckId: string,
): boolean {
  return (
    snap.context.currentDeckId === deckId &&
    !!snap.context.session?.locked &&
    !!snap.context.session.finalAttempt
  )
}

function getDeck(context: AppContext): Deck | null {
  return context.currentDeckId
    ? context.decks.find(d => d.id === context.currentDeckId) ?? null
    : null
}

const appMachineSetup = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as AppInput,
  },
  actions: {
    clearStorage: () => { resetProgress() },
    confirmReset: assign({ resetConfirm: true }),
    cancelReset: assign({ resetConfirm: false }),
    confirmExit: assign({ exitConfirm: true }),
    cancelExit: assign({ exitConfirm: false }),
    resetAll: assign(({ context }) => ({
      resetConfirm: false,
      progress: getDefaultProgress(context.decks),
    })),
    startDeck: assign(({ context, event }) => {
      if (event.type !== "START_DECK") return {}
      const d = context.decks.find(x => x.id === event.deckId)
      if (!d) return {}
      const allOptions = context.precomputeDeckOptions(d, context.decks)
      return {
        currentDeckId: event.deckId,
        session: {
          moveSequence: [],
          currentStreak: 0,
          startTime: Date.now(),
          pausedAt: null,
          accumulatedPauseMs: 0,
          allOptions,
          options: allOptions[0],
          locked: false,
        },
      }
    }),
    pauseSession: assign(({ context }) => {
      if (!context.session || context.session.pausedAt) return {}
      return {
        session: {
          ...context.session,
          pausedAt: Date.now(),
        },
      }
    }),
    resumeSession: assign(({ context }) => {
      if (!context.session || !context.session.pausedAt) return {}
      return {
        session: {
          ...context.session,
          accumulatedPauseMs: context.session.accumulatedPauseMs + (Date.now() - context.session.pausedAt),
          pausedAt: null,
        },
      }
    }),
    clearSession: assign({
      currentDeckId: null,
      session: null,
    }),
    advanceSession: assign(({ context, event }) => {
      if (event.type !== "OPTION_CLICK") return {}
      const d = getDeck(context)
      if (!d || !context.session || context.session.locked) return {}
      const moveIdx = context.session.moveSequence.length
      const opt = context.session.options[event.optionIndex]
      const correct = opt.correct
      const newStreak = correct ? context.session.currentStreak + 1 : 0
      const newSeq = [...context.session.moveSequence, { moveIndex: moveIdx, correct }]
      const nextMoveIdx = moveIdx + 1
      return {
        session: {
          ...context.session,
          moveSequence: newSeq,
          currentStreak: newStreak,
          options: context.session.allOptions[nextMoveIdx],
          locked: false,
        },
      }
    }),
    completeSession: assign(({ context, event }) => {
      if (event.type !== "OPTION_CLICK") return {}
      const d = getDeck(context)
      if (!d || !context.session || context.session.locked) return {}
      const moveIdx = context.session.moveSequence.length
      const opt = context.session.options[event.optionIndex]
      const correct = opt.correct
      const newStreak = correct ? context.session.currentStreak + 1 : 0
      const newSeq = [...context.session.moveSequence, { moveIndex: moveIdx, correct }]
      const duration = Math.floor(getActiveSessionElapsedMs(context.session) / 1000)
      const wrongMoves = newSeq.filter(x => !x.correct).map(x => x.moveIndex)
      const longestStreak = getLongestStreak(newSeq)
      const attempt = {
        date: new Date().toISOString().split("T")[0],
        finalStreak: longestStreak,
        wrongMoves,
        duration,
      }
      const prev = context.progress[d.id]
      return {
        progress: {
          ...context.progress,
          [d.id]: {
            currentStreak: newStreak,
            bestStreak: Math.max(prev.bestStreak, longestStreak),
            lastAttemptDate: attempt.date,
            attempts: [...prev.attempts, attempt],
          },
        },
        session: {
          ...context.session,
          moveSequence: newSeq,
          currentStreak: newStreak,
          finalAttempt: attempt,
          locked: true,
        },
      }
    }),
    recordAbandonedAttempt: assign(({ context }) => {
      const d = getDeck(context)
      if (!d || !context.session || context.session.moveSequence.length === 0) return {}
      const duration = Math.floor(getActiveSessionElapsedMs(context.session) / 1000)
      const wrongMoves = context.session.moveSequence.filter(x => !x.correct).map(x => x.moveIndex)
      const longestStreak = getLongestStreak(context.session.moveSequence)
      const attempt = {
        date: new Date().toISOString().split("T")[0],
        finalStreak: longestStreak,
        wrongMoves,
        duration,
        abandoned: true,
      }
      const prev = context.progress[d.id]
      return {
        progress: {
          ...context.progress,
          [d.id]: {
            currentStreak: context.session.currentStreak,
            bestStreak: Math.max(prev.bestStreak, longestStreak),
            lastAttemptDate: attempt.date,
            attempts: [...prev.attempts, attempt],
          },
        },
      }
    }),
  },
  guards: {
    deckExists: ({ context, event }) =>
      event.type === "START_DECK" && context.decks.some(x => x.id === event.deckId),
    resetConfirmed: ({ context }) => context.resetConfirm,
    sessionNotLocked: ({ context }) =>
      !!context.session && !context.session.locked,
    hasMovesToAbandon: ({ context }) =>
      !!context.session && context.session.moveSequence.length > 0,
    isLastMove: ({ context }) => {
      const d = getDeck(context)
      if (!d || !context.session) return false
      return context.session.moveSequence.length === d.moves.length - 1
    },
    canRestoreCompleted: ({ context }) =>
      !!context.session?.locked && !!context.session.finalAttempt && !!context.currentDeckId,
  },
})

export const appMachine = appMachineSetup.createMachine({
  id: "app",
  context: ({ input }) => ({
    decks: input.decks,
    precomputeDeckOptions: input.precomputeDeckOptions,
    progress: loadProgress(input.decks),
    currentDeckId: null,
    session: null,
    resetConfirm: false,
    exitConfirm: false,
  }),
  initial: "home",
  states: {
    home: {
      on: {
        RESTORE_COMPLETED: {
          guard: "canRestoreCompleted",
          target: "completed",
        },
        START_DECK: {
          guard: "deckExists",
          target: "training",
          actions: "startDeck",
        },
        RESET: [
          {
            guard: "resetConfirmed",
            actions: ["clearStorage", "resetAll"],
          },
          {
            actions: "confirmReset",
          },
        ],
        CANCEL_RESET: {
          actions: "cancelReset",
        },
      },
    },
    training: {
      on: {
        OPTION_CLICK: [
          {
            guard: "isLastMove",
            target: "completed",
            actions: "completeSession",
          },
          {
            guard: "sessionNotLocked",
            actions: "advanceSession",
          },
        ],
        REQUEST_EXIT: {
          actions: ["pauseSession", "confirmExit"],
        },
        CANCEL_EXIT: {
          actions: ["resumeSession", "cancelExit"],
        },
        CONFIRM_EXIT: [
          {
            guard: "hasMovesToAbandon",
            target: "home",
            actions: ["recordAbandonedAttempt", "clearSession", "cancelExit"],
          },
          {
            target: "home",
            actions: ["clearSession", "cancelExit"],
          },
        ],
      },
    },
    completed: {
      on: {
        START_DECK: {
          guard: "deckExists",
          target: "training",
          actions: "startDeck",
        },
        GO_HOME: {
          target: "home",
        },
      },
    },
  },
})
