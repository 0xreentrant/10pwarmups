import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "./data/whatsNew"
import { restartAppActor } from "./appActor"
import { renderWithRouter } from "./test/renderWithRouter"

const A1_MOVES = ["Kneeling Granby", "Seated Granby", "Bridging Granby", "Belly to Belly Granby", "Granby Flow"]

function getOptionButtons() {
  const legend = screen.getByText(/What's next/)
  const fieldset = legend.closest("fieldset")
  if (!fieldset) throw new Error("Options fieldset not found")
  return Array.from(fieldset.querySelectorAll("button"))
}

function clickOptionWithText(text: string) {
  const buttons = getOptionButtons()
  const btn = buttons.find(b => b.textContent?.includes(text))
  if (!btn) throw new Error(`No option button found for "${text}". Have: ${buttons.map(b => b.textContent).join(" | ")}`)
  fireEvent.click(btn)
}

async function answerDeckMoves(moves: string[], delay = 100) {
  for (let i = 0; i < moves.length; i++) {
    clickOptionWithText(moves[i])
    if (delay > 0) await new Promise(r => setTimeout(r, delay))
  }
}

async function startFirstDeck() {
  const trainButtons = await screen.findAllByText("Train")
  fireEvent.click(trainButtons[0])
  await screen.findByText(/What's next/)
}

async function confirmLeaveTest() {
  await screen.findByText(/Leave this test/i)
  fireEvent.click(screen.getByText("Leave test"))
  await screen.findByText("10th Planet")
}

describe("routing", () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_RELEASE_VERSION)
    restartAppActor()
  })

  afterEach(() => {
    restartAppActor()
  })

  it("renders emoji bar showcase at /emoji-bar", async () => {
    const { router } = await renderWithRouter("/emoji-bar")
    expect(router.state.location.pathname).toBe("/emoji-bar")
    expect(screen.getByRole("heading", { level: 2, name: "Fire emoji bar" })).toBeInTheDocument()
    expect(screen.getByRole("slider")).toBeInTheDocument()
    expect(screen.getByText("Test results reveal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument()
  })

  it("renders all-deck progress at /progress", async () => {
    await renderWithRouter("/progress")
    expect(screen.getByText("Progress")).toBeInTheDocument()
    expect(screen.getByText("Overall")).toBeInTheDocument()
    expect(screen.getByText("All Decks")).toBeInTheDocument()
  })

  it("renders single-deck progress at /A1/", async () => {
    await renderWithRouter("/A1/")
    expect(screen.getByText("Progress")).toBeInTheDocument()
    expect(screen.getByText("Kneeling")).toBeInTheDocument()
    expect(screen.getByText("Summary")).toBeInTheDocument()
  })

  it("navigates to training URL when Train is clicked", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    expect(router.state.location.pathname).toBe("/A1/training")
    expect(screen.getByText("Kneeling")).toBeInTheDocument()
    expect(screen.getByText(/What's next/i)).toBeInTheDocument()
  })

  it("navigates to /progress when Stats is clicked", async () => {
    const { router } = await renderWithRouter("/")
    fireEvent.click(screen.getByText("Stats"))
    await screen.findByText("All Decks")
    expect(router.state.location.pathname).toBe("/progress")
  })

  it("navigates to completed URL after finishing a deck", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
      expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/Perfect/)
    }, { timeout: 5000 })
  })

  it("browser back from training after one answer shows exit warning then returns home on confirm", async () => {
    const { router, history } = await renderWithRouter("/")
    await startFirstDeck()
    clickOptionWithText(A1_MOVES[0])
    await new Promise(r => setTimeout(r, 100))

    history.back()
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/training")
      expect(screen.getByText(/Leave this test/i)).toBeInTheDocument()
    })

    await confirmLeaveTest()
    expect(router.state.location.pathname).toBe("/")

    const saved = JSON.parse(localStorage.getItem("tp_progress")!)
    expect(saved.A1.attempts).toHaveLength(1)
    expect(saved.A1.attempts[0].abandoned).toBe(true)
  })

  it("blocks router navigation away from active training before the route changes", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    clickOptionWithText(A1_MOVES[0])
    await new Promise(r => setTimeout(r, 100))

    void router.navigate({ to: "/" })

    await screen.findByText(/Leave this test/i)
    expect(router.state.location.pathname).toBe("/A1/training")
    expect(screen.queryByText("10th Planet")).not.toBeInTheDocument()
  })

  it("cancelling exit warning keeps training active", async () => {
    await renderWithRouter("/")
    await startFirstDeck()

    fireEvent.click(screen.getByText(/← Back/))
    await screen.findByText(/Leave this test/i)
    fireEvent.click(screen.getByText("Keep training"))

    expect(screen.getByText(/What's next/i)).toBeInTheDocument()
    expect(screen.queryByText(/Leave this test/i)).not.toBeInTheDocument()
  })

  it("browser back from completed returns home, not training", async () => {
    const { router, history } = await renderWithRouter("/")
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
    }, { timeout: 5000 })

    history.back()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByText(/What's next/i)).not.toBeInTheDocument()
    })
  })

  it("browser back from deck progress entered via completion returns to completed results", async () => {
    const { router, history } = await renderWithRouter("/")
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(screen.getByText("Progress history")).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText("Progress history"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1")
      expect(screen.getByText("Summary")).toBeInTheDocument()
    })

    history.back()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
      expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/Perfect/)
    }, { timeout: 5000 })
  })

  it("browser forward from home returns to completed results after backing out of completion", async () => {
    const { router, history } = await renderWithRouter("/")
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
    }, { timeout: 5000 })

    history.back()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
    })

    history.forward()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
      expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/Perfect/)
    }, { timeout: 5000 })
  })

  it("redirects direct completed URL visits to home without an active completed session", async () => {
    const { router } = await renderWithRouter("/A1/completed")

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByRole("heading", { level: 2, name: /Perfect|Complete/ })).not.toBeInTheDocument()
    })
  })

  it("navigates home to the completed deck series section", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(screen.getByText(/← Home/)).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText(/← Home/))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(router.state.location.hash).toBe("series-A")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
    })
  })

  it("navigates to deck progress when Progress history is clicked from completion", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(screen.getByText("Progress history")).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText("Progress history"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1")
      expect(screen.getByText("Summary")).toBeInTheDocument()
    })
  })
})
