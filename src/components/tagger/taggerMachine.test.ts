import { createActor } from "xstate"
import { describe, expect, it } from "vitest"
import { moveIndexAtTime } from "./taggerTimestamps"
import { taggerMachine } from "./taggerMachine"

function start() {
  const actor = createActor(taggerMachine)
  actor.start()
  return actor
}

describe("taggerMachine", () => {
  it("SELECT sets selection and seeks; TIME does not clear selection", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 1 })
    expect(actor.getSnapshot().context.selectedIndex).toBe(1)
    expect(actor.getSnapshot().context.currentTime).toBe(10.01)
    expect(moveIndexAtTime([0, 10, 20], actor.getSnapshot().context.currentTime)).toBe(1)

    actor.send({ type: "TIME", time: 15 })
    expect(actor.getSnapshot().context.selectedIndex).toBe(1)
    expect(actor.getSnapshot().context.currentTime).toBe(15)
    expect(moveIndexAtTime([0, 10, 20], 15)).toBe(1)
  })

  it("SELECT seek survives video undershoot without highlighting the previous move", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 1 })
    actor.send({ type: "TIME", time: 9.995 })
    const ctx = actor.getSnapshot().context
    expect(ctx.currentTime).toBeGreaterThanOrEqual(10)
    expect(moveIndexAtTime(ctx.timestamps, ctx.currentTime)).toBe(1)
  })

  it("SCRUB moves playhead without changing selection", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "SELECT", index: 2 })
    actor.send({ type: "SCRUB", time: 5 })
    const ctx = actor.getSnapshot().context
    expect(ctx.selectedIndex).toBe(2)
    expect(ctx.currentTime).toBe(5)
    expect(moveIndexAtTime(ctx.timestamps, ctx.currentTime)).toBe(0)
  })

  it("DRAG rewrites owned marker timestamp and seeks", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3 })
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
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, null, 20] })
    actor.send({ type: "SCRUB", time: 7 })
    actor.send({ type: "SELECT", index: 1 })
    const afterSelect = actor.getSnapshot().context
    expect(afterSelect.selectedIndex).toBe(1)
    expect(afterSelect.currentTime).toBe(7)
    expect(afterSelect.timestamps[1]).toBe(7)
    expect(moveIndexAtTime(afterSelect.timestamps, afterSelect.currentTime)).toBe(1)
  })

  it("holds seek until TIME is within epsilon or advances past", () => {
    const actor = start()
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 2 })
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
    actor.send({ type: "SET_DECK", deckId: "A1", moveCount: 3 })
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    actor.send({ type: "DRAG_START", index: 1, time: 12 })
    actor.send({ type: "DRAG_END" })
    expect(actor.getSnapshot().context.timestamps[1]).toBe(12)
    actor.send({ type: "SEED", duration: 30, timestamps: [0, 10, 20] })
    expect(actor.getSnapshot().context.timestamps[1]).toBe(12)
    expect(actor.getSnapshot().context.duration).toBe(30)
  })
})
