import { setup, assign } from "xstate"

const STORAGE_KEY = "tp_progress"

const DECK_ID_MIGRATIONS = {
  I1: "attack-series",
  J1: "ramey-flow",
}

export function getDefaultProgress(decks) {
  const p = {}
  decks.forEach(d => {
    p[d.id] = { currentStreak: 0, bestStreak: 0, lastAttemptDate: null, attempts: [] }
  })
  return p
}

export function loadProgress(decks) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultProgress(decks)
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object") return getDefaultProgress(decks)
    const base = getDefaultProgress(decks)
    Object.entries(DECK_ID_MIGRATIONS).forEach(([oldId, newId]) => {
      if (parsed[oldId] && !parsed[newId]) parsed[newId] = parsed[oldId]
      delete parsed[oldId]
    })
    Object.keys(base).forEach(id => { if (!parsed[id]) parsed[id] = base[id] })
    return parsed
  } catch { return getDefaultProgress(decks) }
}

export function saveProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)) } catch {}
}

function resetProgress() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function getLongestStreak(moveSequence) {
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

function getDeck(context) {
  return context.currentDeckId
    ? context.decks.find(d => d.id === context.currentDeckId)
    : null
}

const appMachineSetup = setup({
  actions: {
    clearStorage: () => { resetProgress() },
    confirmReset: assign({ resetConfirm: true }),
    cancelReset: assign({ resetConfirm: false }),
    resetAll: assign(({ context }) => ({
      resetConfirm: false,
      progress: getDefaultProgress(context.decks),
    })),
    setStatsDeck: assign({
      statsForDeck: ({ event }) => event.deckId,
    }),
    setStatsReturnHome: assign({ statsReturnTo: "home" }),
    setStatsReturnCompletion: assign({ statsReturnTo: "completion" }),
    startDeck: assign(({ context, event }) => {
      const d = context.decks.find(x => x.id === event.deckId)
      if (!d) return {}
      const allOptions = context.precomputeDeckOptions(d, context.decks)
      return {
        currentDeckId: event.deckId,
        session: {
          moveSequence: [],
          currentStreak: 0,
          startTime: Date.now(),
          allOptions,
          options: allOptions[0],
          locked: false,
        },
      }
    }),
    clearSession: assign({
      currentDeckId: null,
      session: null,
    }),
    advanceSession: assign(({ context, event }) => {
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
      const d = getDeck(context)
      if (!d || !context.session || context.session.locked) return {}
      const moveIdx = context.session.moveSequence.length
      const opt = context.session.options[event.optionIndex]
      const correct = opt.correct
      const newStreak = correct ? context.session.currentStreak + 1 : 0
      const newSeq = [...context.session.moveSequence, { moveIndex: moveIdx, correct }]
      const duration = Math.floor((Date.now() - context.session.startTime) / 1000)
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
      const duration = Math.floor((Date.now() - context.session.startTime) / 1000)
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
      context.decks.some(x => x.id === event.deckId),
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
    returnToCompletion: ({ context }) => context.statsReturnTo === "completion",
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
    statsForDeck: null,
    statsReturnTo: "home",
    resetConfirm: false,
  }),
  initial: "home",
  states: {
    home: {
      on: {
        START_DECK: {
          guard: "deckExists",
          target: "training",
          actions: "startDeck",
        },
        OPEN_STATS: {
          target: "progress",
          actions: ["setStatsReturnHome", "setStatsDeck"],
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
            target: "completion",
            actions: "completeSession",
          },
          {
            guard: "sessionNotLocked",
            actions: "advanceSession",
          },
        ],
        BACK_HOME: [
          {
            guard: "hasMovesToAbandon",
            target: "home",
            actions: ["recordAbandonedAttempt", "clearSession"],
          },
          {
            target: "home",
            actions: "clearSession",
          },
        ],
      },
    },
    completion: {
      on: {
        START_DECK: {
          guard: "deckExists",
          target: "training",
          actions: "startDeck",
        },
        GO_HOME: {
          target: "home",
          actions: "clearSession",
        },
        OPEN_STATS: {
          target: "progress",
          actions: ["setStatsReturnCompletion", "setStatsDeck"],
        },
      },
    },
    progress: {
      on: {
        GO_BACK: [
          {
            guard: "returnToCompletion",
            target: "completion",
          },
          {
            target: "home",
          },
        ],
        GO_HOME: {
          target: "home",
        },
        SET_STATS_DECK: {
          actions: "setStatsDeck",
        },
        START_DECK: {
          guard: "deckExists",
          target: "training",
          actions: "startDeck",
        },
      },
    },
  },
})
