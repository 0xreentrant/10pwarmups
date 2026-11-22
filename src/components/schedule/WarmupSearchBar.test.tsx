import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { applyDeckCatalog } from "../../data/decks"
import WarmupSearchBar from "./WarmupSearchBar"

beforeEach(() => {
  vi.useFakeTimers()
  applyDeckCatalog(
    [{ id: "A", name: "Granbys" }],
    [
      {
        id: "A1",
        series: "A",
        name: "Kneeling",
        moves: [
          { text: "Seated Granby", players: ["A"] },
          { text: "Banana Split", players: ["A"] },
        ],
      },
    ],
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe("WarmupSearchBar", () => {
  it("lists fuzzy matches and calls onSelect with the deck id", () => {
    const onSelect = vi.fn()
    render(<WarmupSearchBar onSelect={onSelect} />)

    const input = screen.getByRole("combobox", { name: /search by move/i })
    fireEvent.change(input, { target: { value: "granby" } })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    const option = screen.getByRole("option", { name: /seated granby/i })
    fireEvent.click(option)
    expect(onSelect).toHaveBeenCalledWith("A1")
  })
})
