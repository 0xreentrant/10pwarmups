import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { DECKS } from "./data/decks"
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "./data/whatsNew"
import { SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION } from "./data/scheduleOnboarding"
import { restartAppActor } from "./appActor"
import { renderWithRouter } from "./test/renderWithRouter"
import {
  answerDeckMoves,
  clickOptionWithText,
  startFirstDeck,
  HOME_SERIES_A,
} from "./test/trainingHelpers"
import { defaultWeekSeriesLetter } from "./utils/seriesRoute"
import { startBetaFirstDeck, dismissBetaProgressIntro } from "./test/cinematicTrainingHelpers"

const A1_MOVES = DECKS.find(d => d.id === "A1")!.moves.map(m => m.text)

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
    localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION)
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
    const { router } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    expect(router.state.location.pathname).toBe("/A1/training")
    expect(screen.getByText("Kneeling")).toBeInTheDocument()
    expect(screen.getByText(/What's next/i)).toBeInTheDocument()
  })

  it("navigates to /progress when Stats is clicked", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    fireEvent.click(screen.getByText("Stats"))
    await screen.findByText("All Decks")
    expect(router.state.location.pathname).toBe("/progress")
  })

  it("navigates to completed URL after finishing a deck", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
      expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/Perfect/)
    }, { timeout: 5000 })
  })

  it("browser back from training after one answer returns home immediately", async () => {
    const { router, history } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    clickOptionWithText(A1_MOVES[0])
    await new Promise(r => setTimeout(r, 100))
    const homeScreen = watchForText("10th Planet")

    try {
      history.back()
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/series/A")
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
    const { router } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    clickOptionWithText(A1_MOVES[0])
    await new Promise(r => setTimeout(r, 100))

    void router.navigate({ to: "/series/$letter", params: { letter: "A" } })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/series/A")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByText(/Leave this test/i)).not.toBeInTheDocument()
    })
  })

  it("in-screen back leaves training immediately", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()

    fireEvent.click(screen.getByText(/← Back/))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/series/A")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByText(/Leave this test/i)).not.toBeInTheDocument()
    })
  })

  it("navigates to review URL when Review is clicked", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    const reviewButtons = await screen.findAllByText("Review")
    fireEvent.click(reviewButtons[0])

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })
    expect(screen.getByText("Kneeling")).toBeInTheDocument()
    expect(screen.queryByText(/What's next/i)).not.toBeInTheDocument()
    expect(screen.getByText(A1_MOVES[0])).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Train" })).toBeInTheDocument()
  })

  it("confirms before switching from training to review and resets quiz progress", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    clickOptionWithText(A1_MOVES[0])
    await new Promise(r => setTimeout(r, 100))

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    expect(screen.getByText(/Switch to review/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText("Keep training"))
    expect(screen.queryByText(/Switch to review/i)).not.toBeInTheDocument()
    expect(screen.getByText(/What's next/i)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/A1/training")

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    fireEvent.click(screen.getByText("Go to review"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })
    expect(screen.queryByText(/What's next/i)).not.toBeInTheDocument()
    expect(screen.getByText(A1_MOVES[0])).toBeInTheDocument()
  })

  it("switches from review to train without a confirm dialog", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    const reviewButtons = await screen.findAllByText("Review")
    fireEvent.click(reviewButtons[0])
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })

    fireEvent.click(screen.getByRole("button", { name: "Train" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/training")
    })
    expect(screen.getByText(/What's next/i)).toBeInTheDocument()
    expect(screen.queryByText(/Switch to review/i)).not.toBeInTheDocument()
  })

  it("returns home from review via Back", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    const reviewButtons = await screen.findAllByText("Review")
    fireEvent.click(reviewButtons[0])
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/review")
    })

    fireEvent.click(screen.getByText(/← Back/))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/series/A")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
    })
  })

  it("browser back from completed returns home, not training", async () => {
    const { router, history } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
    }, { timeout: 5000 })

    history.back()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/series/A")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByText(/What's next/i)).not.toBeInTheDocument()
    })
  })

  it("browser back from deck progress entered via completion returns to completed results", async () => {
    const { router, history } = await renderWithRouter(HOME_SERIES_A)
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
    const { router, history } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/A1/completed")
    }, { timeout: 5000 })

    history.back()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/series/A")
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
      const letter = defaultWeekSeriesLetter()
      expect(router.state.location.pathname).toBe(letter ? `/series/${letter}` : "/")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
      expect(screen.queryByRole("heading", { level: 2, name: /Perfect|Complete/ })).not.toBeInTheDocument()
    })
  })

  it("navigates home to the completed deck series section", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(screen.getByText(/← Home/)).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText(/← Home/))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/series/A")
      expect(screen.getByText("10th Planet")).toBeInTheDocument()
    })
  })

  it("navigates to deck progress when Progress history is clicked from completion", async () => {
    const { router } = await renderWithRouter(HOME_SERIES_A)
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

  it("redirects /tagger to the first video warmup in edit mode", async () => {
    const { router } = await renderWithRouter("/tagger")

    await screen.findByRole("heading", { name: "Video Tagger" })
    expect(router.state.location.pathname).toBe("/tagger/A1/edit")
  })

  it("navigates tagger tabs and warmup via URL", async () => {
    const { router } = await renderWithRouter("/tagger/A1/edit")

    await screen.findByRole("heading", { name: "Video Tagger" })

    fireEvent.click(screen.getByRole("button", { name: "Train" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/tagger/A1/train")
    })

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/tagger/A1/edit")
    })

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/tagger/A1/review")
    })

    fireEvent.change(screen.getByLabelText("Video"), { target: { value: "A2" } })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/tagger/A2/review")
    })
  })

  it("redirects invalid tagger warmup to /tagger", async () => {
    const { router } = await renderWithRouter("/tagger/ZZZ/edit")

    await screen.findByRole("heading", { name: "Video Tagger" })
    expect(router.state.location.pathname).toBe("/tagger/A1/edit")
  })

  it("redirects invalid tagger mode to edit", async () => {
    const { router } = await renderWithRouter("/tagger/A1/bogus")

    await screen.findByRole("heading", { name: "Video Tagger" })
    expect(router.state.location.pathname).toBe("/tagger/A1/edit")
  })

  it("renders beta test landing for a valid warmup", async () => {
    await renderWithRouter("/beta-test/B3")

    expect(screen.getByText("Beta")).toBeInTheDocument()
    expect(document.querySelector(".bt-progress-intro")).toBeTruthy()
    expect(screen.getByText("V2 Warmups")).toBeInTheDocument()
    expect(screen.getByText("Trainer")).toBeInTheDocument()
    expect(screen.getByText("Stalk")).toBeInTheDocument()
    expect(screen.getAllByText("Train")).toHaveLength(1)
  })

  it("redirects invalid beta warmup to home", async () => {
    const { router } = await renderWithRouter("/beta-test/ZZZ")

    await screen.findByText("10th Planet")
    const letter = defaultWeekSeriesLetter()
    expect(router.state.location.pathname).toBe(letter ? `/series/${letter}` : "/")
  })

  it("navigates to cinematic training from beta test landing", async () => {
    const { router } = await renderWithRouter("/beta-test/B3")

    await dismissBetaProgressIntro()
    fireEvent.click(screen.getByText("Train"))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/beta-test/B3/train")
    })
    expect(document.querySelector(".bl-overlay")).toBeTruthy()
    expect(document.querySelector(".bl-train-demo")).toBeTruthy()
  })

  it("navigates to cinematic review from beta test landing", async () => {
    const { router } = await renderWithRouter("/beta-test/B3")

    await dismissBetaProgressIntro()
    fireEvent.click(screen.getByText("Review"))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/beta-test/B3/review")
    })
    expect(document.querySelector(".ct-overlay")).toBeTruthy()
    expect(document.querySelector(".ct-tap-demo")).toBeTruthy()
    expect(document.querySelector(".ct-tap-demo-intro")).toBeTruthy()
  })

  it("confirms before switching from cinematic training to review", async () => {
    const { router } = await renderWithRouter("/beta-test/B3")
    await startBetaFirstDeck()

    fireEvent.click(screen.getByRole("button", { name: "Review" }))
    expect(screen.getByText(/Switch to review/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText("Go to review"))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/beta-test/B3/review")
    })
    expect(document.querySelector(".ct-overlay")).toBeTruthy()
  })
})
