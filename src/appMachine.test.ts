import { describe, it, expect, beforeEach } from "vitest"
import { createActor } from "xstate"
import { appMachine, loadProgress } from "./appMachine"
import { DECKS } from "./data/decks"
import { playableMoveIndices } from "./data/moveTimestamps"
import { precomputeDeckOptions } from "./utils/deckUtils"
import type { Deck } from "./types/domain"

const mockDecks: Deck[] = [
  {
    id: "A1",
    name: "Kneeling",
    series: "A",
    moves: [
      { text: "Kneeling Granby", players: ["A"] },
      { text: "Seated Granby", players: ["A"] },
      { text: "Bridging Granby", players: ["A"] },
    ],
  },
  {
    id: "A2",
    name: "Seated",
    series: "A",
    moves: [
      { text: "Belly to Belly Granby", players: ["A"] },
      { text: "Granby Flow", players: ["A"] },
    ],
  },
  {
    id: "A3",
    name: "Pool",
    series: "A",
    moves: [
      { text: "Half Granby", players: ["A"] },
      { text: "Rolling Granby", players: ["B"] },
      { text: "Inverted Granby", players: ["B"] },
    ],
  },
]

function makeActor() {
  const actor = createActor(appMachine, {
    input: { decks: mockDecks, precomputeDeckOptions },
  })
  actor.start()
  return actor
}

function correctIndex(actor: ReturnType<typeof makeActor>) {
  const session = actor.getSnapshot().context.session!
  return session.options.findIndex(o => o.correct)
}

function startDeck(actor: ReturnType<typeof makeActor>, deckId = "A1") {
  actor.send({ type: "START_DECK", deckId })
}

function answerCurrent(actor: ReturnType<typeof makeActor>) {
  actor.send({ type: "OPTION_CLICK", optionIndex: correctIndex(actor) })
}

function completeDeck(actor: ReturnType<typeof makeActor>, deckId = "A1") {
  startDeck(actor, deckId)
  const deck = mockDecks.find(d => d.id === deckId)!
  for (let i = 0; i < deck.moves.length; i++) {
    answerCurrent(actor)
  }
}

describe("appMachine", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("locks session and records attempt when the last answer is submitted", () => {
    const actor = makeActor()
    completeDeck(actor)

    const snap = actor.getSnapshot()
    expect(snap.context.session?.locked).toBe(true)
    expect(snap.context.session?.finalAttempt).toMatchObject({
      finalStreak: 3,
      wrongMoves: [],
    })
    expect(snap.context.progress.A1.attempts).toHaveLength(1)
    expect(snap.context.progress.A1.attempts[0].duration).toBeGreaterThanOrEqual(0)
  })

  it("discards session without recording an attempt after exit request", () => {
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    actor.send({ type: "REQUEST_EXIT" })

    const snap = actor.getSnapshot()
    expect(snap.context.session).toBeNull()
    expect(snap.context.progress.A1.attempts).toHaveLength(0)
  })

  it("records no attempt when exiting before answering", () => {
    const actor = makeActor()
    startDeck(actor)
    actor.send({ type: "REQUEST_EXIT" })

    const snap = actor.getSnapshot()
    expect(snap.context.session).toBeNull()
    expect(snap.context.progress.A1.attempts).toHaveLength(0)
  })

  it("replaces the previous session when starting a new deck from completed", () => {
    const actor = makeActor()
    completeDeck(actor, "A1")
    actor.send({ type: "START_DECK", deckId: "A2" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("training")
    expect(snap.context.currentDeckId).toBe("A2")
    expect(snap.context.session?.locked).toBe(false)
    expect(snap.context.session?.moveSequence).toHaveLength(0)
  })

  it("increments streak on correct answers and resets on wrong answers", () => {
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    expect(actor.getSnapshot().context.session?.currentStreak).toBe(1)

    const wrongIndex = actor.getSnapshot().context.session!.options.findIndex(o => !o.correct)
    actor.send({ type: "OPTION_CLICK", optionIndex: wrongIndex })
    expect(actor.getSnapshot().context.session?.currentStreak).toBe(0)
  })

  it("tap out resets streak without advancing the move", () => {
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    const before = actor.getSnapshot().context.session!
    actor.send({ type: "TAP_OUT" })
    const after = actor.getSnapshot().context.session!
    expect(after.currentStreak).toBe(0)
    expect(after.moveSequence).toEqual(before.moveSequence)
    expect(after.options).toEqual(before.options)
  })

  it("raises bestStreak on completion but does not lower it on a worse run", () => {
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    const wrongIndex = actor.getSnapshot().context.session!.options.findIndex(o => !o.correct)
    actor.send({ type: "OPTION_CLICK", optionIndex: wrongIndex })
    answerCurrent(actor)
    answerCurrent(actor)

    expect(actor.getSnapshot().context.progress.A1.bestStreak).toBe(1)

    actor.send({ type: "GO_HOME" })
    completeDeck(actor, "A1")
    expect(actor.getSnapshot().context.progress.A1.bestStreak).toBe(3)
  })

  it("preserves completed session when returning home", () => {
    const actor = makeActor()
    completeDeck(actor)
    actor.send({ type: "GO_HOME" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("home")
    expect(snap.context.currentDeckId).toBe("A1")
    expect(snap.context.session?.locked).toBe(true)
    expect(snap.context.session?.finalAttempt).toBeDefined()
  })

  it("restores completed state from a preserved session", () => {
    const actor = makeActor()
    completeDeck(actor)
    actor.send({ type: "GO_HOME" })
    actor.send({ type: "RESTORE_COMPLETED" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("completed")
    expect(snap.context.session?.finalAttempt).toBeDefined()
  })

  it("requires confirmation before clearing all progress", () => {
    const actor = makeActor()
    completeDeck(actor)
    actor.send({ type: "GO_HOME" })

    actor.send({ type: "RESET" })
    expect(actor.getSnapshot().context.resetConfirm).toBe(true)
    expect(actor.getSnapshot().context.progress.A1.attempts).toHaveLength(1)

    actor.send({ type: "RESET" })
    expect(actor.getSnapshot().context.resetConfirm).toBe(false)
    expect(actor.getSnapshot().context.progress.A1.attempts).toHaveLength(0)
    expect(actor.getSnapshot().context.progress.A1.bestStreak).toBe(0)
  })

  it("cancels reset confirmation without clearing progress", () => {
    const actor = makeActor()
    completeDeck(actor)
    actor.send({ type: "GO_HOME" })

    actor.send({ type: "RESET" })
    actor.send({ type: "CANCEL_RESET" })

    expect(actor.getSnapshot().context.resetConfirm).toBe(false)
    expect(actor.getSnapshot().context.progress.A1.attempts).toHaveLength(1)
  })

  it("clears session immediately on exit request", () => {
    const actor = makeActor()
    startDeck(actor)

    actor.send({ type: "REQUEST_EXIT" })
    expect(actor.getSnapshot().value).toBe("home")
    expect(actor.getSnapshot().context.session).toBeNull()
  })

  it("enters review from home without a quiz session", () => {
    const actor = makeActor()
    actor.send({ type: "START_REVIEW", deckId: "A1" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("review")
    expect(snap.context.currentDeckId).toBe("A1")
    expect(snap.context.session).toBeNull()
  })

  it("discards in-progress training when switching to review", () => {
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    actor.send({ type: "START_REVIEW", deckId: "A1" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("review")
    expect(snap.context.session).toBeNull()
    expect(snap.context.progress.A1.attempts).toHaveLength(0)
  })

  it("starts a fresh training session from review", () => {
    const actor = makeActor()
    actor.send({ type: "START_REVIEW", deckId: "A1" })
    actor.send({ type: "START_DECK", deckId: "A1" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("training")
    expect(snap.context.session?.moveSequence).toHaveLength(0)
    expect(snap.context.session?.locked).toBe(false)
  })

  it("returns home from review on exit request", () => {
    const actor = makeActor()
    actor.send({ type: "START_REVIEW", deckId: "A1" })
    actor.send({ type: "REQUEST_EXIT" })

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("home")
    expect(snap.context.currentDeckId).toBeNull()
  })

  it("does not persist currentStreak on deck progress after completion", () => {
    const actor = makeActor()
    completeDeck(actor)

    expect(actor.getSnapshot().context.progress.A1).not.toHaveProperty("currentStreak")
  })

  it("START_PREVIEW completes without writing progress", () => {
    const actor = makeActor()
    actor.send({ type: "START_PREVIEW", deckId: "A1" })
    expect(actor.getSnapshot().context.preview).toBe(true)
    expect(actor.getSnapshot().value).toBe("training")
    const deck = mockDecks.find(d => d.id === "A1")!
    for (let i = 0; i < deck.moves.length; i++) {
      answerCurrent(actor)
    }
    expect(actor.getSnapshot().value).toBe("completed")
    expect(actor.getSnapshot().context.session?.locked).toBe(true)
    expect(actor.getSnapshot().context.progress.A1.attempts).toHaveLength(0)
    expect(actor.getSnapshot().context.preview).toBe(true)
  })

  it("skips untagged moves when training a partially tagged deck", () => {
    const a2 = DECKS.find(d => d.id === "A2")!
    const order = playableMoveIndices("A2", a2.moves.length)
    const actor = createActor(appMachine, {
      input: { decks: [a2], precomputeDeckOptions },
    })
    actor.start()
    actor.send({ type: "START_DECK", deckId: "A2" })

    expect(actor.getSnapshot().context.session?.moveOrder).toEqual(order)
    expect(order.length).toBeLessThan(a2.moves.length)

    for (let i = 0; i < order.length; i++) {
      answerCurrent(actor)
    }

    const snap = actor.getSnapshot()
    expect(snap.value).toBe("completed")
    expect(snap.context.session?.moveSequence).toHaveLength(order.length)
    expect(snap.context.session?.moveSequence.every(a => order.includes(a.moveIndex))).toBe(true)
  })
})

describe("loadProgress", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("strips legacy currentStreak from stored progress", () => {
    localStorage.setItem("tp_progress", JSON.stringify({
      A1: { currentStreak: 5, bestStreak: 3, lastAttemptDate: "2026-06-05", attempts: [] },
    }))

    const progress = loadProgress(mockDecks)
    expect(progress.A1.bestStreak).toBe(3)
    expect(progress.A1).not.toHaveProperty("currentStreak")
  })
})
