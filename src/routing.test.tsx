import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "./data/whatsNew"
import { restartAppActor } from "./appActor"
import { renderWithRouter } from "./test/renderWithRouter"
import {
  answerDeckMoves,
  clickOptionWithText,
  startFirstDeck,
  waitForLiveOptions,
} from "./test/trainingHelpers"

const A1_MOVES = ["Kneeling Granby", "Seated Granby", "Bridging Granby", "Belly to Belly Granby", "Granby Flow"]

function watchForText(text: string) {
  let seen = document.body.textContent?.includes(text) ?? false
  const observer = new MutationObserver(() => {
    if (document.body.textContent?.includes(text)) {
      seen = true
    }
  })
  observer.observe(document.body, { childList: true, characterData: true, subtree: true })

  return {
    disconnect: () => observer.disconnect(),
    wasSeen: () => seen,
  }
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
    expect(document.querySelector(".bl-overlay")).toBeTruthy()
    expect(screen.getByLabelText(/Streak:/)).toBeInTheDocument()
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

  it("browser back from training after one answer returns home immediately", async () => {
    const { router, history } = await renderWithRouter("/")
    await startFirstDeck()
    await clickOptionWithText(A1_MOVES[0])
    await waitForLiveOptions()
    const homeScreen = watchForText("10th Planet")

    try {
      history.back()
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/")
        expect(screen.getByText("10th Planet")).toBeInTheDocument()
        expect(screen.queryByText(/Leave this test/i)).not.toBeInTheDocument()
      })
      expect(homeScreen.wasSeen()).toBe(true)
    } finally {
      homeScreen.disconnect()
    }

    const saved = JSON.parse(localStorage.getItem("tp_progress")!)
    expect(saved.A1.attempts).toHaveLength(0)
  })

  it("allows router navigation away from active training without a prompt", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    await clickOptionWithText(A1_MOVES[0])
    await waitForLiveOptions()

    void router.navigate({ to: "/" })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByText(/Leave this test/i)).not.toBeInTheDocument()
    })
  })

  it("in-screen back leaves training immediately", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()

    fireEvent.click(screen.getByLabelText("Exit training"))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByText(/Leave this test/i)).not.toBeInTheDocument()
    })
  })

  it("navigates to review URL when Review is clicked", async () => {
    const { router } = await renderWithRouter("/")
    const reviewButtons = await screen.findAllByText("Review")
    fireEvent.click(reviewButtons[0])

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })
    expect(document.querySelector(".ct-overlay")).toBeTruthy()
    expect(screen.getByText("Kneeling")).toBeInTheDocument()
    expect(screen.getByText("Kneeling Granby")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Train" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show moves" })).toBeInTheDocument()
  })

  it("confirms before switching from training to review and resets quiz progress", async () => {
    const { router } = await renderWithRouter("/")
    await startFirstDeck()
    await clickOptionWithText(A1_MOVES[0])
    await waitForLiveOptions()

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    expect(screen.getByText(/Switch to review/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText("Keep training"))
    expect(screen.queryByText(/Switch to review/i)).not.toBeInTheDocument()
    expect(document.querySelector(".bl-overlay")).toBeTruthy()
    expect(router.state.location.pathname).toBe("/A1/training")

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    fireEvent.click(screen.getByText("Go to review"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })
    expect(document.querySelector(".bl-overlay")).toBeFalsy()
    expect(document.querySelector(".ct-overlay")).toBeTruthy()
    expect(screen.getByText("Kneeling Granby")).toBeInTheDocument()
  })

  it("switches from review to train without a confirm dialog", async () => {
    const { router } = await renderWithRouter("/")
    const reviewButtons = await screen.findAllByText("Review")
    fireEvent.click(reviewButtons[0])
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })

    fireEvent.click(screen.getByRole("button", { name: "Train" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/training")
    })
    await waitForLiveOptions()
    expect(document.querySelector(".bl-overlay")).toBeTruthy()
    expect(screen.queryByText(/Switch to review/i)).not.toBeInTheDocument()
  })

  it("returns home from review via Back", async () => {
    const { router } = await renderWithRouter("/")
    const reviewButtons = await screen.findAllByText("Review")
    fireEvent.click(reviewButtons[0])
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })

    fireEvent.click(screen.getByLabelText("Exit review"))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
    })
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
