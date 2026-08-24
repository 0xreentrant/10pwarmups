import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import BleedDusk2Overlay from "./BleedDusk2Overlay"
import { DUSK2_BLEED_VARIANT } from "./bleedVariant"
import { DECKS } from "../../../data/decks"
import type { ProgressMap, Session } from "../../../types/domain"

vi.mock("../ante/useAnteRound", () => ({
  ANTE_CLOCK_MS: 5000,
  useAnteRound: () => ({
    drill: {
      phase: "asking",
      picked: null,
      moveIdx: 0,
      total: 20,
      options: [
        { text: "Move A", correct: true, partner: "A" },
        { text: "Move B", correct: false },
        { text: "Move C", correct: false },
        { text: "Move D", correct: false },
      ],
      streak: 0,
      best: 0,
      misses: 0,
      history: [],
      beat: 0,
      move: { text: "Move A", partner: "A" },
    },
    live: false,
    ready: false,
    stake: 1,
    remaining: 5000,
    answer: vi.fn(),
    next: vi.fn(),
    card: [],
    score: 0,
    paid: null,
    settled: null,
    elapsed: 0,
    restart: vi.fn(),
  }),
}))

describe("BleedDusk2Overlay progress", () => {
  it("shows current move index only, not deck total", () => {
    const session: Session = {
      moveSequence: [],
      moveOrder: Array.from({ length: 20 }, (_, i) => i),
      currentStreak: 0,
      startTime: Date.now(),
      pausedAt: null,
      accumulatedPauseMs: 0,
      allOptions: [],
      options: [
        { text: "Move A", correct: true, partner: "A" },
        { text: "Move B", correct: false },
        { text: "Move C", correct: false },
        { text: "Move D", correct: false },
      ],
      locked: false,
    }
    const progress: ProgressMap = {}

    const { container } = render(
      <BleedDusk2Overlay
        deck={DECKS.find(d => d.id === "A2") ?? DECKS[0]}
        session={session}
        progress={progress}
        videoSrc={null}
        variant={DUSK2_BLEED_VARIANT}
        onOptionClick={vi.fn()}
        onClose={vi.fn()}
        onNext={vi.fn()}
        onHome={vi.fn()}
        onTryAgain={vi.fn()}
        onStats={vi.fn()}
      />,
    )

    expect(container.querySelector(".ao-hud")).toBeNull()
    expect(container.querySelector(".bl-progress")?.textContent).toBe("1")
    expect(container.textContent).not.toMatch(/\/20/)
  })
})
