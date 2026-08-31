import { screen, fireEvent, waitFor } from "@testing-library/react"
import {
  SCHEDULE_ONBOARDING_STORAGE_KEY,
  SCHEDULE_ONBOARDING_VERSION,
} from "../data/scheduleOnboarding"
import {
  answerCinematicDeckMoves,
  clickCinematicOptionWithText,
  getCinematicOptionButtons,
  waitForCinematicOptions,
} from "./cinematicTrainingHelpers"

export const HOME_SERIES_A = "/series/A"
export const HOME_ALL = "/all"

export function markScheduleOnboardingSeenInTests() {
  localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION)
}

export async function dismissScheduleOnboarding() {
  if (!document.querySelector(".bt-progress-intro")) return
  fireEvent.click(await screen.findByRole("button", { name: "OK" }))
}

export function getOptionButtons() {
  return getCinematicOptionButtons()
}

export async function clickOptionWithText(text: string) {
  await clickCinematicOptionWithText(text)
}

export async function answerDeckMoves(moves: string[]) {
  await answerCinematicDeckMoves(moves)
}

export async function startFirstDeck() {
  await dismissScheduleOnboarding()
  const trainButtons = await screen.findAllByText("Train")
  fireEvent.click(trainButtons[0])
  await waitForCinematicOptions()
}

export async function clickWrongOption(excludeText: string) {
  let btn: HTMLButtonElement | undefined
  await waitFor(() => {
    btn = getOptionButtons().find(b => !b.disabled && !b.textContent!.includes(excludeText))
    expect(btn).toBeTruthy()
  }, { timeout: 12000 })
  fireEvent.click(btn!)
}
