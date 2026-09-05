import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AnteOptions } from "./AnteBits"
import type { AnteDrillView, AnteRound } from "./useAnteRound"

function makeRound(drillOverrides: Partial<AnteDrillView> = {}): AnteRound {
  const drill: AnteDrillView = {
    phase: "asking",
    picked: null,
    moveIdx: 0,
    total: 3,
    options: [
      { text: "Kneeling Granby", correct: true, players: ["A"] },
      { text: "Wrong One", correct: false },
      { text: "Wrong Two", correct: false },
      { text: "Wrong Three", correct: false },
    ],
    streak: 0,
    best: 0,
    misses: 0,
    history: [],
    beat: 0,
    move: { text: "Kneeling Granby", players: ["A"] },
    ...drillOverrides,
  }
  return { drill, live: true, answer: vi.fn() } as unknown as AnteRound
}

describe("AnteOptions", () => {
  it("colors the correct option with partner styling only after reveal", () => {
    const { rerender } = render(<AnteOptions round={makeRound()} />)
    expect(screen.getByRole("button", { name: "Kneeling Granby" }).querySelector(".text-partner-a")).toBeNull()

    rerender(<AnteOptions round={makeRound({ phase: "correct", picked: 0 })} />)
    expect(screen.getByRole("button", { name: "Kneeling Granby" }).querySelector(".text-partner-a")).toBeTruthy()
  })

  it("calls answer when a live option is clicked", () => {
    const round = makeRound()
    render(<AnteOptions round={round} />)
    fireEvent.click(screen.getByRole("button", { name: "Kneeling Granby" }))
    expect(round.answer).toHaveBeenCalledWith(0)
  })
})
