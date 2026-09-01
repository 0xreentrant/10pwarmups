import { describe, it, expect, beforeEach } from "vitest"
import { screen, fireEvent, within } from "@testing-library/react"
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "../data/whatsNew"
import { SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION } from "../data/scheduleOnboarding"
import { restartAppActor } from "../appActor"
import { renderWithRouter } from "../test/renderWithRouter"

describe("What's New popover", () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION)
    restartAppActor()
  })

  it("shows on first load when release has not been seen", async () => {
    await renderWithRouter("/")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("What's New")).toBeInTheDocument()
    expect(screen.getByText(/week schedule for today/)).toBeInTheDocument()
    expect(screen.getByText(/full-bleed video on every deck/)).toBeInTheDocument()
    expect(screen.getByText(/Preview other rotation weeks/)).toBeInTheDocument()
    expect(screen.getByText(/Videos play on iPhone Safari/)).toBeInTheDocument()
    expect(screen.getByText(/Video volume remembered across sessions/)).toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    const homeLink = within(dialog).getByRole("link", { name: "Home" })
    expect(homeLink).toHaveAttribute("href", "/")
    const link = within(dialog).getByRole("link", { name: /latest updates/i })
    expect(link).toHaveAttribute("href", "updates.html")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("does not show after the release has been seen", async () => {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_RELEASE_VERSION)
    await renderWithRouter("/")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("marks release seen and closes when Got it is clicked", async () => {
    await renderWithRouter("/")
    fireEvent.click(screen.getByRole("button", { name: "Got it" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe(APP_RELEASE_VERSION)
  })

  it("marks release seen and closes on Escape", async () => {
    await renderWithRouter("/")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe(APP_RELEASE_VERSION)
  })

  it("does not show on beta-test pages and leaves release unseen", async () => {
    await renderWithRouter("/beta-test/B3")
    expect(screen.queryByText("What's New")).not.toBeInTheDocument()
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBeNull()
  })
})
