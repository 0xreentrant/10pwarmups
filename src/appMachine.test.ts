import { describe, it, expect, beforeEach, vi } from "vitest"
import { createActor } from "xstate"
import { appMachine, getActiveSessionElapsedMs } from "./appMachine"
import { precomputeDeckOptions } from "./utils/deckUtils"
import type { Deck } from "./types/domain"

const mockDecks: Deck[] = [
  {
    id: "A1",
    name: "Kneeling",
    series: "A",
    moves: [
      { text: "Kneeling Granby", partner: "A" },
      { text: "Seated Granby", partner: "A" },
      { text: "Bridging Granby", partner: "A" },
    ],
  },
  {
    id: "A2",
    name: "Seated",
    series: "A",
    moves: [
      { text: "Belly to Belly Granby", partner: "A" },
      { text: "Granby Flow", partner: "A" },
    ],
  },
  {
    id: "A3",
    name: "Pool",
    series: "A",
    moves: [
      { text: "Half Granby", partner: "A" },
      { text: "Rolling Granby", partner: "B" },
      { text: "Inverted Granby", partner: "B" },
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

  it("records an abandoned attempt after at least one answered move", () => {
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    actor.send({ type: "CONFIRM_EXIT" })

    const snap = actor.getSnapshot()
    expect(snap.context.session).toBeNull()
    expect(snap.context.progress.A1.attempts).toHaveLength(1)
    expect(snap.context.progress.A1.attempts[0].abandoned).toBe(true)
  })

  it("records no attempt when abandoning before answering", () => {
    const actor = makeActor()
    startDeck(actor)
    actor.send({ type: "CONFIRM_EXIT" })

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

  it("pauses the timer on exit request and resumes on cancel", () => {
    vi.useFakeTimers()
    const actor = makeActor()
    startDeck(actor)
    vi.advanceTimersByTime(2000)

    actor.send({ type: "REQUEST_EXIT" })
    expect(actor.getSnapshot().context.session?.pausedAt).not.toBeNull()
    expect(actor.getSnapshot().context.exitConfirm).toBe(true)

    vi.advanceTimersByTime(5000)
    actor.send({ type: "CANCEL_EXIT" })
    expect(actor.getSnapshot().context.session?.pausedAt).toBeNull()
    expect(actor.getSnapshot().context.exitConfirm).toBe(false)

    vi.advanceTimersByTime(1000)
    const elapsed = getActiveSessionElapsedMs(actor.getSnapshot().context.session!)
    expect(elapsed).toBeGreaterThanOrEqual(2900)
    expect(elapsed).toBeLessThan(4000)
    vi.useRealTimers()
  })

  it("excludes paused time from abandoned attempt duration", () => {
    vi.useFakeTimers()
    const actor = makeActor()
    startDeck(actor)
    answerCurrent(actor)
    vi.advanceTimersByTime(1000)

    actor.send({ type: "REQUEST_EXIT" })
    vi.advanceTimersByTime(10000)
    actor.send({ type: "CONFIRM_EXIT" })

    const duration = actor.getSnapshot().context.progress.A1.attempts[0].duration
    expect(duration).toBe(1)
    vi.useRealTimers()
  })
})
