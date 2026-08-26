import { screen, fireEvent, waitFor } from "@testing-library/react"

export function getCinematicOptionButtons() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".bl-deck .ao-option"))
  if (buttons.length === 0) throw new Error("No dusk2 option buttons found")
  return buttons
}

/** Dismiss the beta landing progress intro if present. */
export async function dismissBetaProgressIntro() {
  if (!document.querySelector(".bt-progress-intro")) return
  fireEvent.click(await screen.findByRole("button", { name: "OK" }))
}

/** Dismiss the beta train intro (OK) if present; zone beats then auto-advance. */
export async function dismissTrainingDemoIntro() {
  const ok = await screen.findByRole("button", { name: "OK" }, { timeout: 5000 }).catch(() => null)
  if (ok && document.querySelector(".bl-train-demo-intro")) fireEvent.click(ok)
}

export async function waitForCinematicOptions() {
  await dismissTrainingDemoIntro()
  await waitFor(() => {
    expect(document.querySelector(".bl-ghost")).toBeTruthy()
    const buttons = getCinematicOptionButtons()
    expect(buttons.some(b => !b.disabled)).toBe(true)
  }, { timeout: 15000 })
  return getCinematicOptionButtons()
}

export async function clickCinematicOptionWithText(text: string) {
  let btn: HTMLButtonElement | undefined
  await waitFor(() => {
    expect(document.querySelector(".bl-ghost")).toBeTruthy()
    btn = getCinematicOptionButtons().find(b => !b.disabled && b.textContent?.includes(text))
    expect(btn).toBeTruthy()
  }, { timeout: 12000 })
  fireEvent.click(btn!)
}

export async function answerCinematicDeckMoves(moves: string[]) {
  for (let i = 0; i < moves.length; i++) {
    await clickCinematicOptionWithText(moves[i])
    const isLast = i === moves.length - 1
    if (isLast) {
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/Perfect|Complete/)
      }, { timeout: 15000 })
    } else {
      await waitForCinematicOptions()
    }
  }
}

export async function startBetaFirstDeck() {
  await dismissBetaProgressIntro()
  const trainButtons = await screen.findAllByText("Train")
  fireEvent.click(trainButtons[0])
  await waitForCinematicOptions()
}
