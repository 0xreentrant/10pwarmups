import { createActor, type ActorRefFrom } from "xstate"
import { describe, expect, it } from "vitest"
import type { Partner } from "../../types/domain"
import {
  commitJsonHistory,
  redoJsonHistory,
  undoJsonHistory,
} from "./jsonHistory"
import { taggerMachine } from "./taggerMachine"
import { buildJsonText, parseTimestampsJson } from "./taggerTimestamps"

const NAMES3 = ["Move 1", "Move 2", "Move 3"]
const PLAYERS3: Partner[][] = [["A"], ["A"], ["A"]]

type TaggerActor = ActorRefFrom<typeof taggerMachine>

/** Mirrors TaggerView committed-json history (ref-backed stacks + LOAD on undo/redo). */
function createDocumentHistory() {
  let applied = ""
  let past: string[] = []
  let future: string[] = []

  return {
    applied: () => applied,
    past: () => [...past],
    future: () => [...future],
    seedApplied: (json: string) => {
      applied = json
    },
    clearOnDeckChange: () => {
      past = []
      future = []
    },
    commitFromMachine: (nextJson: string) => {
      const committed = commitJsonHistory(past, applied, nextJson)
      if (committed) {
        past = committed.past
        future = committed.future
      }
      applied = nextJson
    },
    undo: () => {
      const result = undoJsonHistory(past, future, applied)
      if (!result) return null
      past = result.past
      future = result.future
      applied = result.current
      return result.current
    },
    redo: () => {
      const result = redoJsonHistory(past, future, applied)
      if (!result) return null
      past = result.past
      future = result.future
      applied = result.current
      return result.current
    },
  }
}

function startTagger(): TaggerActor {
  const actor = createActor(taggerMachine)
  actor.start()
  actor.send({
    type: "SET_DECK",
    deckId: "A1",
    moveCount: 3,
    moveNames: NAMES3,
    movePlayers: PLAYERS3,
  })
  actor.send({ type: "SEED", duration: 30, timestamps: [0, null, 20] })
  return actor
}

function loadJson(actor: TaggerActor, jsonText: string) {
  const { moveCount, moveNames } = actor.getSnapshot().context
  const result = parseTimestampsJson(jsonText, moveCount, moveNames)
  if (!result.ok) throw new Error(result.error)
  actor.send({
    type: "LOAD",
    timestamps: result.timestamps,
    names: result.names,
    playerLists: result.playerLists,
  })
}

function machineJson(actor: TaggerActor): string {
  const ctx = actor.getSnapshot().context
  return buildJsonText(ctx.deckId, ctx.timestamps, ctx.moveNames, ctx.movePlayers)
}

describe("tagger JSON document undo", () => {
  it("undo restores timestamps after placing a marker", () => {
    const actor = startTagger()
    const history = createDocumentHistory()
    const before = machineJson(actor)

    history.seedApplied(before)
    actor.send({ type: "SCRUB", time: 7 })
    actor.send({ type: "SELECT", index: 1 })
    const after = machineJson(actor)
    history.commitFromMachine(after)

    expect(JSON.parse(after).timestamps[1].t).toBe(7)
    expect(history.past()).toEqual([before])

    const restoredJson = history.undo()
    expect(restoredJson).toBe(before)
    loadJson(actor, restoredJson!)
    expect(actor.getSnapshot().context.timestamps[1]).toBeNull()
    expect(machineJson(actor)).toBe(before)
  })

  it("redo re-applies undone marker placement", () => {
    const actor = startTagger()
    const history = createDocumentHistory()
    history.seedApplied(machineJson(actor))

    actor.send({ type: "SCRUB", time: 7 })
    actor.send({ type: "SELECT", index: 1 })
    const placed = machineJson(actor)
    history.commitFromMachine(placed)

    history.undo()
    loadJson(actor, history.applied())

    const redone = history.redo()
    expect(redone).toBe(placed)
    loadJson(actor, redone!)
    expect(actor.getSnapshot().context.timestamps[1]).toBe(7)
  })

  it("new commit after undo clears redo stack and branches history", () => {
    const history = createDocumentHistory()
    history.seedApplied('{"deckId":"A1","timestamps":[]}')
    history.commitFromMachine('{"deckId":"A1","timestamps":[1]}')
    history.undo()
    expect(history.future()).toHaveLength(1)
    expect(history.applied()).toBe('{"deckId":"A1","timestamps":[]}')

    history.commitFromMachine('{"deckId":"A1","timestamps":[2]}')
    expect(history.future()).toEqual([])
    expect(history.past()).toEqual(['{"deckId":"A1","timestamps":[]}'])
    expect(history.applied()).toBe('{"deckId":"A1","timestamps":[2]}')
  })

  it("seek-only select does not create a history entry", () => {
    const actor = startTagger()
    const history = createDocumentHistory()
    const json = machineJson(actor)
    history.seedApplied(json)

    actor.send({ type: "SELECT", index: 2 })
    const afterSeek = machineJson(actor)
    history.commitFromMachine(afterSeek)

    expect(afterSeek).toBe(json)
    expect(history.past()).toEqual([])
  })

  it("does not push empty applied json on first commit", () => {
    const history = createDocumentHistory()
    history.seedApplied("")
    history.commitFromMachine('{"deckId":"A1","timestamps":[0]}')

    expect(history.past()).toEqual([])
    expect(history.applied()).toBe('{"deckId":"A1","timestamps":[0]}')
  })

  it("clears stacks on deck change", () => {
    const history = createDocumentHistory()
    history.seedApplied('{"deckId":"A1","timestamps":[]}')
    history.commitFromMachine('{"deckId":"A1","timestamps":[1]}')
    history.clearOnDeckChange()
    history.seedApplied('{"deckId":"G3","timestamps":[]}')

    expect(history.past()).toEqual([])
    expect(history.future()).toEqual([])
    expect(history.applied()).toBe('{"deckId":"G3","timestamps":[]}')
  })
})
