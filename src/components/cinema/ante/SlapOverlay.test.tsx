import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SlapOverlay, type TappedCtx } from "./SlapOverlay"
import type { AnteDrillView, AnteRound } from "./useAnteRound"
import type { Deck } from "../../../types/domain"

function makeCtx(drillOverrides: Partial<AnteDrillView> = {}): TappedCtx {
  const drill: AnteDrillView = {
    phase: "wrong",
    picked: null,
    moveIdx: 11,
    total: 20,
    options: [],
    streak: 0,
    best: 0,
    misses: 0,
    history: [],
    beat: 1,
    move: { text: "Banana Split", players: ["A"] },
    ...drillOverrides,
  }
  const round = { drill, next: () => {} } as AnteRound
  const deck = {
    id: "A2",
    series: "A",
    name: "Test",
    moves: Array.from({ length: 30 }, (_, i) => ({
      text: i === 11 ? "Defend" : i === 10 ? "Banana Split" : `Move ${i}`,
      players: ["A"] as const,
    })),
  } as Deck
  return { round, deck, prevStreak: 0, onHome: () => {} }
}

describe("SlapOverlay", () => {
  it("shows the tapped move from drill.move, not deck index by sequence slot", () => {
    render(<SlapOverlay {...makeCtx()} />)
    expect(screen.getByText(/Banana Split/)).toBeInTheDocument()
    expect(screen.queryByText(/Defend/)).not.toBeInTheDocument()
  })

  it("shows a home escape hatch", () => {
    let home = false
    render(<SlapOverlay {...makeCtx()} onHome={() => { home = true }} />)
    screen.getByRole("button", { name: /home/i }).click()
    expect(home).toBe(true)
  })
})
