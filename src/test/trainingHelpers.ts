import { screen, fireEvent, waitFor } from "@testing-library/react"

export function getOptionButtons() {
  const legend = screen.getByText(/What's next/)
  const fieldset = legend.closest("fieldset")
  if (!fieldset) throw new Error("Options fieldset not found")
  return Array.from(fieldset.querySelectorAll("button"))
}

export function clickOptionWithText(text: string) {
  const buttons = getOptionButtons()
  const btn = buttons.find(b => b.textContent?.includes(text))
  if (!btn) throw new Error(`No option button found for "${text}". Have: ${buttons.map(b => b.textContent).join(" | ")}`)
  fireEvent.click(btn)
}

export async function answerDeckMoves(moves: string[], delay = 100) {
  for (let i = 0; i < moves.length; i++) {
    clickOptionWithText(moves[i])
    if (i === moves.length - 1) {
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/Perfect|Complete/)
      }, { timeout: 5000 })
    } else if (delay > 0) {
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

export async function startFirstDeck() {
  const trainButtons = await screen.findAllByText("Train")
  fireEvent.click(trainButtons[0])
  await screen.findByText(/What's next/)
}

export function clickWrongOption(excludeText: string) {
  const btn = getOptionButtons().find(b => !b.textContent!.includes(excludeText))
  if (!btn) throw new Error(`No wrong option found excluding "${excludeText}"`)
  fireEvent.click(btn)
}
