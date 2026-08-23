import { assign, setup } from "xstate"

const SEEK_HOLD_EPS = 0.08
/** Past move start so video undershoot still lands in this move's segment. */
export const SELECT_NUDGE_SEC = 0.01

export interface TaggerContext {
  deckId: string
  moveCount: number
  /** Start time per move index - null = missing / not placed yet. */
  timestamps: (number | null)[]
  duration: number
  /** Playhead time - highlight/scrub derive from this vs timestamps. */
  currentTime: number
  /** User pick from click only (list or marker). Playhead never sets this. */
  selectedIndex: number | null
  /** Which marker is being dragged (move ownership by index). */
  draggingIndex: number | null
  /** Hold displayed time after scrub/select until video catches up. */
  seekHold: number | null
}

export type TaggerEvent =
  | { type: "SET_DECK"; deckId: string; moveCount: number }
  | { type: "SEED"; duration: number; timestamps: (number | null)[] }
  | { type: "TIME"; time: number }
  | { type: "SCRUB"; time: number }
  | { type: "SELECT"; index: number }
  | { type: "DRAG_START"; index: number; time: number }
  | { type: "DRAG"; time: number }
  | { type: "DRAG_END" }
  | { type: "LOAD"; timestamps: (number | null)[] }
  | { type: "RESET"; timestamps: (number | null)[] }

function clampTime(time: number, duration: number): number {
  if (duration <= 0) return 0
  return Math.min(duration, Math.max(0, time))
}

function withSeek(time: number, duration: number): Pick<TaggerContext, "currentTime" | "seekHold"> {
  const t = clampTime(time, duration)
  return { currentTime: t, seekHold: t }
}

const taggerSetup = setup({
  types: {
    context: {} as TaggerContext,
    events: {} as TaggerEvent,
  },
  actions: {
    setDeck: assign(({ event }) => {
      if (event.type !== "SET_DECK") return {}
      return {
        deckId: event.deckId,
        moveCount: event.moveCount,
        timestamps: [],
        duration: 0,
        currentTime: 0,
        selectedIndex: null,
        draggingIndex: null,
        seekHold: null,
      }
    }),
    seed: assign(({ context, event }) => {
      if (event.type !== "SEED") return {}
      // Keep in-memory edits when edit video remounts after train/review (same deck).
      if (
        context.timestamps.length === context.moveCount &&
        context.moveCount > 0
      ) {
        return { duration: event.duration }
      }
      return {
        duration: event.duration,
        timestamps: event.timestamps,
        currentTime: 0,
        selectedIndex: null,
        draggingIndex: null,
        seekHold: null,
      }
    }),
    /** Playback / native seek - never touches selectedIndex. */
    applyTime: assign(({ context, event }) => {
      if (event.type !== "TIME") return {}
      const hold = context.seekHold
      if (hold !== null) {
        if (Math.abs(event.time - hold) <= SEEK_HOLD_EPS) {
          // Prefer hold when video undershoots so active outline stays on the selected move.
          return { currentTime: Math.max(event.time, hold), seekHold: null }
        }
        // Playing forward past the seek target - release hold.
        if (event.time > hold + SEEK_HOLD_EPS) {
          return { currentTime: event.time, seekHold: null }
        }
        return {}
      }
      return { currentTime: event.time, seekHold: null }
    }),
    /** Track scrub - playhead only. */
    scrub: assign(({ context, event }) => {
      if (event.type !== "SCRUB") return {}
      return withSeek(event.time, context.duration)
    }),
    /** List/marker click - seek if placed; else assign current playhead to that move. */
    select: assign(({ context, event }) => {
      if (event.type !== "SELECT") return {}
      if (event.index < 0 || event.index >= context.moveCount) return {}
      const t = context.timestamps[event.index]
      if (typeof t === "number" && Number.isFinite(t)) {
        return {
          selectedIndex: event.index,
          ...withSeek(t + SELECT_NUDGE_SEC, context.duration),
        }
      }
      const placed = clampTime(context.currentTime, context.duration)
      const next = context.timestamps.slice()
      while (next.length < context.moveCount) next.push(null)
      next[event.index] = placed
      return { selectedIndex: event.index, timestamps: next }
    }),
    dragStart: assign(({ context, event }) => {
      if (event.type !== "DRAG_START") return {}
      const t = clampTime(event.time, context.duration)
      const next = context.timestamps.slice()
      if (event.index >= 0 && event.index < next.length) next[event.index] = t
      return {
        selectedIndex: event.index,
        draggingIndex: event.index,
        timestamps: next,
        ...withSeek(t, context.duration),
      }
    }),
    drag: assign(({ context, event }) => {
      if (event.type !== "DRAG") return {}
      const idx = context.draggingIndex
      if (idx === null) return {}
      const t = clampTime(event.time, context.duration)
      const next = context.timestamps.slice()
      next[idx] = t
      return {
        timestamps: next,
        ...withSeek(t, context.duration),
      }
    }),
    dragEnd: assign({
      draggingIndex: null,
    }),
    load: assign(({ context, event }) => {
      if (event.type !== "LOAD") return {}
      if (event.timestamps.length !== context.moveCount) return {}
      return { timestamps: event.timestamps }
    }),
    reset: assign(({ context, event }) => {
      if (event.type !== "RESET") return {}
      if (event.timestamps.length !== context.moveCount) return {}
      return { timestamps: event.timestamps, selectedIndex: null }
    }),
  },
})

export const taggerMachine = taggerSetup.createMachine({
  id: "tagger",
  initial: "ready",
  context: {
    deckId: "",
    moveCount: 0,
    timestamps: [],
    duration: 0,
    currentTime: 0,
    selectedIndex: null,
    draggingIndex: null,
    seekHold: null,
  },
  states: {
    ready: {
      on: {
        SET_DECK: { actions: "setDeck" },
        SEED: { actions: "seed" },
        TIME: { actions: "applyTime" },
        SCRUB: { actions: "scrub" },
        SELECT: { actions: "select" },
        LOAD: { actions: "load" },
        RESET: { actions: "reset" },
        DRAG_START: { target: "dragging", actions: "dragStart" },
      },
    },
    dragging: {
      on: {
        DRAG: { actions: "drag" },
        DRAG_END: { target: "ready", actions: "dragEnd" },
        // Ignore playback ticks while dragging - drag owns currentTime.
        SET_DECK: { target: "ready", actions: "setDeck" },
      },
    },
  },
})
