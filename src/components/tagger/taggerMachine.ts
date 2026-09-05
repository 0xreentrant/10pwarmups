import { assign, setup } from "xstate"
import type { Partner } from "../../types/domain"
import { normalizePlayers } from "../../utils/movePlayers"

const SEEK_HOLD_EPS = 0.08
/** Past move start so video undershoot still lands in this move's segment. */
export const SELECT_NUDGE_SEC = 0.01

export interface TaggerContext {
  deckId: string
  moveCount: number
  /** Display/export names per move index (editable in tagger). */
  moveNames: string[]
  /** Person A/B per move index (editable in tagger). */
  movePlayers: Partner[][]
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
  | { type: "SET_DECK"; deckId: string; moveCount: number; moveNames: string[]; movePlayers: Partner[][] }
  | { type: "SEED"; duration: number; timestamps: (number | null)[] }
  | { type: "TIME"; time: number }
  | { type: "SCRUB"; time: number }
  | { type: "SELECT"; index: number }
  | { type: "DRAG_START"; index: number; time: number }
  | { type: "DRAG"; time: number }
  | { type: "DRAG_END" }
  | { type: "LOAD"; timestamps: (number | null)[]; names?: string[]; playerLists?: Partner[][] }
  | { type: "RESET"; timestamps: (number | null)[]; moveNames: string[]; movePlayers: Partner[][] }
  | { type: "DELETE_SELECTED" }
  | { type: "SET_MOVE"; index: number; name: string; players: Partner[] }
  | { type: "ADD_MOVE" }
  | { type: "DELETE_MOVE"; index: number }
  | { type: "REORDER_MOVE"; from: number; to: number }

export function reorderArrayAt<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr.slice()
  }
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function remapIndexAfterReorder(
  index: number | null,
  from: number,
  to: number,
): number | null {
  if (index === null || from === to) return index
  if (index === from) return to
  if (from < to) {
    if (index > from && index <= to) return index - 1
  } else if (from > to) {
    if (index >= to && index < from) return index + 1
  }
  return index
}

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
        moveNames: event.moveNames.slice(0, event.moveCount),
        movePlayers: event.movePlayers.slice(0, event.moveCount).map(normalizePlayers),
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
      const updates: Partial<Pick<TaggerContext, "timestamps" | "moveNames" | "movePlayers">> = {
        timestamps: event.timestamps,
      }
      if (event.names?.length === context.moveCount) {
        updates.moveNames = event.names
      }
      if (event.playerLists?.length === context.moveCount) {
        updates.movePlayers = event.playerLists.map(normalizePlayers)
      }
      return updates
    }),
    reset: assign(({ context, event }) => {
      if (event.type !== "RESET") return {}
      if (event.timestamps.length !== context.moveCount) return {}
      if (event.moveNames.length !== context.moveCount) return {}
      if (event.movePlayers.length !== context.moveCount) return {}
      return {
        timestamps: event.timestamps,
        moveNames: event.moveNames,
        movePlayers: event.movePlayers.map(normalizePlayers),
        selectedIndex: null,
      }
    }),
    deleteSelected: assign(({ context }) => {
      const idx = context.selectedIndex
      if (idx === null || idx < 0 || idx >= context.timestamps.length) return {}
      const t = context.timestamps[idx]
      if (typeof t !== "number" || !Number.isFinite(t)) return {}
      const next = context.timestamps.slice()
      next[idx] = null
      return { timestamps: next }
    }),
    setMove: assign(({ context, event }) => {
      if (event.type !== "SET_MOVE") return {}
      if (event.index < 0 || event.index >= context.moveCount) return {}
      const trimmed = event.name.trim()
      if (!trimmed) return {}
      const nextNames = context.moveNames.slice()
      while (nextNames.length < context.moveCount) nextNames.push(`Move ${nextNames.length + 1}`)
      nextNames[event.index] = trimmed
      const nextPlayers = context.movePlayers.slice()
      while (nextPlayers.length < context.moveCount) nextPlayers.push(["A"])
      nextPlayers[event.index] = normalizePlayers(event.players)
      return { moveNames: nextNames, movePlayers: nextPlayers }
    }),
    addMove: assign(({ context }) => {
      const nextCount = context.moveCount + 1
      const nextNames = context.moveNames.slice()
      while (nextNames.length < context.moveCount) nextNames.push(`Move ${nextNames.length + 1}`)
      nextNames.push(`Move ${nextCount}`)
      const nextPlayers = context.movePlayers.slice()
      while (nextPlayers.length < context.moveCount) nextPlayers.push(["A"])
      nextPlayers.push(["A"])
      const nextTimestamps = context.timestamps.slice()
      while (nextTimestamps.length < context.moveCount) nextTimestamps.push(null)
      nextTimestamps.push(null)
      return {
        moveCount: nextCount,
        moveNames: nextNames,
        movePlayers: nextPlayers,
        timestamps: nextTimestamps,
        selectedIndex: nextCount - 1,
      }
    }),
    deleteMove: assign(({ context, event }) => {
      if (event.type !== "DELETE_MOVE") return {}
      if (context.moveCount <= 1) return {}
      const idx = event.index
      if (idx < 0 || idx >= context.moveCount) return {}
      const removeAt = <T,>(arr: T[]) => [...arr.slice(0, idx), ...arr.slice(idx + 1)]
      let selectedIndex = context.selectedIndex
      if (selectedIndex !== null) {
        if (selectedIndex === idx) selectedIndex = null
        else if (selectedIndex > idx) selectedIndex -= 1
      }
      return {
        moveCount: context.moveCount - 1,
        moveNames: removeAt(context.moveNames),
        movePlayers: removeAt(context.movePlayers),
        timestamps: removeAt(context.timestamps),
        selectedIndex,
      }
    }),
    reorderMove: assign(({ context, event }) => {
      if (event.type !== "REORDER_MOVE") return {}
      const { from, to } = event
      if (from === to || from < 0 || to < 0 || from >= context.moveCount || to >= context.moveCount) {
        return {}
      }
      return {
        moveNames: reorderArrayAt(context.moveNames, from, to),
        movePlayers: reorderArrayAt(context.movePlayers, from, to),
        timestamps: reorderArrayAt(context.timestamps, from, to),
        selectedIndex: remapIndexAfterReorder(context.selectedIndex, from, to),
      }
    }),
  },
})

export const taggerMachine = taggerSetup.createMachine({
  id: "tagger",
  initial: "ready",
  context: {
    deckId: "",
    moveCount: 0,
    moveNames: [],
    movePlayers: [],
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
        DELETE_SELECTED: { actions: "deleteSelected" },
        SET_MOVE: { actions: "setMove" },
        ADD_MOVE: { actions: "addMove" },
        DELETE_MOVE: { actions: "deleteMove" },
        REORDER_MOVE: { actions: "reorderMove" },
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
