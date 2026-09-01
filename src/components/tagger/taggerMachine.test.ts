import { createActor } from "xstate"
import { describe, expect, it } from "vitest"
import { moveIndexAtTime } from "./taggerTimestamps"
import { reorderArrayAt, remapIndexAfterReorder, taggerMachine } from "./taggerMachine"

function start() {
  const actor = createActor(taggerMachine)
  actor.start()
  return actor
}

const NAMES3 = ["Move 1", "Move 2", "Move 3"]
const NAMES2 = ["Move 1", "Move 2"]
const PARTNERS3: ("A" | "B")[] = ["A", "A", "A"]
const PARTNERS2: ("A" | "B")[] = ["A", "A"]

describe("taggerMachine", () => {
  it("SELECT sets selection and seeks; TIME does not clear selection", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 1 })
    expect(actor.getSnapshot().context.selectedIndex).toBe(1)
    expect(actor.getSnapshot().context.currentTime).toBe(10.01)

    actor.send({ type: "TIME", time: 15 })
    expect(actor.getSnapshot().context.selectedIndex).toBe(1)
    expect(actor.getSnapshot().context.currentTime).toBe(15)
  })

  it("SELECT seek survives video undershoot without highlighting the previous move", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 1 })
    actor.send({ type: "TIME", time: 9.995 })
    const ctx = actor.getSnapshot().context
    expect(ctx.currentTime).toBeGreaterThanOrEqual(10)
    expect(moveIndexAtTime(ctx.timestamps, ctx.currentTime)).toBe(1)
  })

  it("SCRUB moves playhead without changing selection", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 2 })
    actor.send({ type: "SCRUB", time: 5 })
    const ctx = actor.getSnapshot().context
    expect(ctx.selectedIndex).toBe(2)
    expect(ctx.currentTime).toBe(5)
  })

  it("DRAG rewrites owned marker timestamp and seeks", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "DRAG_START", index: 1, time: 12 })
    expect(actor.getSnapshot().value).toBe("dragging")
    actor.send({ type: "DRAG", time: 14 })
    expect(actor.getSnapshot().context.timestamps[1]).toBe(14)
    expect(actor.getSnapshot().context.currentTime).toBe(14)
    expect(actor.getSnapshot().context.selectedIndex).toBe(1)
    actor.send({ type: "DRAG_END" })
    expect(actor.getSnapshot().value).toBe("ready")
    expect(actor.getSnapshot().context.draggingIndex).toBe(null)
  })

  it("SELECT on missing timestamp places marker at playhead", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, null, 20] })
    actor.send({ type: "SCRUB", time: 7 })
    actor.send({ type: "SELECT", index: 1 })
    const afterSelect = actor.getSnapshot().context
    expect(afterSelect.selectedIndex).toBe(1)
    expect(afterSelect.currentTime).toBe(7)
    expect(afterSelect.timestamps[1]).toBe(7)
  })

  it("holds seek until TIME is within epsilon or advances past", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 2, moveNames: NAMES2, movePartners: PARTNERS2 })
    actor.send({ type: "SEED", duration: 20, timestamps: [0, 10] })
    actor.send({ type: "SCRUB", time: 10 })
    actor.send({ type: "TIME", time: 9.5 })
    expect(actor.getSnapshot().context.currentTime).toBe(10)
    expect(actor.getSnapshot().context.seekHold).toBe(10)
    actor.send({ type: "TIME", time: 9.95 })
    // Undershoot release keeps hold time so active move does not snap backward.
    expect(actor.getSnapshot().context.currentTime).toBe(10)
    expect(actor.getSnapshot().context.seekHold).toBe(null)

    actor.send({ type: "SCRUB", time: 5 })
    actor.send({ type: "TIME", time: 4.5 })
    expect(actor.getSnapshot().context.currentTime).toBe(5)
    actor.send({ type: "TIME", time: 6 })
    expect(actor.getSnapshot().context.currentTime).toBe(6)
    expect(actor.getSnapshot().context.seekHold).toBe(null)
  })

  it("SEED keeps in-memory timestamps when already seeded for the deck", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "DRAG_START", index: 1, time: 12 })
    actor.send({ type: "DRAG_END" })
    expect(actor.getSnapshot().context.timestamps[1]).toBe(12)
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    expect(actor.getSnapshot().context.timestamps[1]).toBe(12)
    expect(actor.getSnapshot().context.duration).toBe(30)
  })

  it("DELETE_SELECTED clears timestamp for selected move", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 1 })
    actor.send({ type: "DELETE_SELECTED" })
    const ctx = actor.getSnapshot().context
    expect(ctx.selectedIndex).toBe(1)
    expect(ctx.timestamps[1]).toBe(null)
    expect(ctx.timestamps[0]).toBe(0)
    expect(ctx.timestamps[2]).toBe(20)
  })

  it("RESET restores timestamps and moveNames from decks.ts defaults", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 2, moveNames: NAMES2, movePartners: PARTNERS2 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10] })
    actor.send({ type: "SET_MOVE", index: 0, name: "Renamed", partner: "A" })
    actor.send({
      type: "RESET",
      timestamps: [null, null],
      moveNames: ["Deck Alpha", "Deck Beta"],
      movePartners: ["A", "B"],
    })
    const ctx = actor.getSnapshot().context
    expect(ctx.timestamps).toEqual([null, null])
    expect(ctx.moveNames).toEqual(["Deck Alpha", "Deck Beta"])
    expect(ctx.movePartners).toEqual(["A", "B"])
    expect(ctx.selectedIndex).toBe(null)
  })

  it("ADD_MOVE appends a move and selects it", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 2, moveNames: NAMES2, movePartners: PARTNERS2 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10] })
    actor.send({ type: "ADD_MOVE" })
    const ctx = actor.getSnapshot().context
    expect(ctx.moveCount).toBe(3)
    expect(ctx.moveNames).toEqual(["Move 1", "Move 2", "Move 3"])
    expect(ctx.movePartners).toEqual(["A", "A", "A"])
    expect(ctx.timestamps).toEqual([0, 10, null])
    expect(ctx.selectedIndex).toBe(2)
  })

  it("DELETE_MOVE removes a move and shifts later indices", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 2 })
    actor.send({ type: "DELETE_MOVE", index: 1 })
    const ctx = actor.getSnapshot().context
    expect(ctx.moveCount).toBe(2)
    expect(ctx.moveNames).toEqual(["Move 1", "Move 3"])
    expect(ctx.timestamps).toEqual([0, 20])
    expect(ctx.selectedIndex).toBe(1)
  })

  it("DELETE_MOVE is a no-op when only one move remains", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 1, moveNames: ["Only"], movePartners: ["A"] })
    actor.send({ type: "SEED", duration: 30, timestamps: [0] })
    actor.send({ type: "DELETE_MOVE", index: 0 })
    const ctx = actor.getSnapshot().context
    expect(ctx.moveCount).toBe(1)
    expect(ctx.timestamps).toEqual([0])
  })

  it("REORDER_MOVE reorders names, partners, timestamps, and selection", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3, moveNames: NAMES3, movePartners: PARTNERS3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 1 })
    actor.send({ type: "REORDER_MOVE", from: 1, to: 0 })
    const ctx = actor.getSnapshot().context
    expect(ctx.moveNames).toEqual(["Move 2", "Move 1", "Move 3"])
    expect(ctx.movePartners).toEqual(["A", "A", "A"])
    expect(ctx.timestamps).toEqual([10, 0, 20])
    expect(ctx.selectedIndex).toBe(0)
  })
})

describe("reorder helpers", () => {
  it("reorderArrayAt moves an item between indices", () => {
    expect(reorderArrayAt(["a", "b", "c"], 1, 2)).toEqual(["a", "c", "b"])
  })

  it("remapIndexAfterReorder tracks selected index through a move", () => {
    expect(remapIndexAfterReorder(1, 1, 3)).toBe(3)
    expect(remapIndexAfterReorder(3, 1, 3)).toBe(2)
    expect(remapIndexAfterReorder(0, 1, 3)).toBe(0)
  })
})
