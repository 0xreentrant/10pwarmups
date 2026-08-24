import { screen, fireEvent, waitFor } from "@testing-library/react"

export function getCinematicOptionButtons() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".bl-deck .ao-option"))
  if (buttons.length === 0) throw new Error("No dusk2 option buttons found")
  return buttons
}

export async function waitForCinematicOptions() {
  await waitFor(() => {
    expect(document.querySelector(".bl-ghost")).toBeTruthy()
    const buttons = getCinematicOptionButtons()
    expect(buttons.some(b => !b.disabled)).toBe(true)
  }, { timeout: 5000 })
  return getCinematicOptionButtons()
}

export async function clickCinematicOptionWithText(text: string) {
  let btn: HTMLButtonElement | undefined
  await waitFor(() => {
    expect(document.querySelector(".bl-ghost")).toBeTruthy()
    btn = getCinematicOptionButtons().find(b => !b.disabled && b.textContent?.includes(text))
    expect(btn).toBeTruthy()
  }, { timeout: 5000 })
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
  const trainButtons = await screen.findAllByText("Train")
  fireEvent.click(trainButtons[0])
  await waitForCinematicOptions()
}
