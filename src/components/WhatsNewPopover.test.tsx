import { describe, it, expect, beforeEach } from "vitest"
import { screen, fireEvent, within } from "@testing-library/react"
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "../data/whatsNew"
import { restartAppActor } from "../appActor"
import { renderWithRouter } from "../test/renderWithRouter"

describe("What's New popover", () => {
  beforeEach(() => {
    localStorage.clear()
    restartAppActor()
  })

  it("shows on first load when release has not been seen", async () => {
    await renderWithRouter("/")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("What's New")).toBeInTheDocument()
    expect(screen.getByText(/is in the trainer/)).toBeInTheDocument()
    expect(screen.getByText(/Review mode shows the full move list/)).toBeInTheDocument()
    expect(screen.getByText(/bigger and easier to tap/)).toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    const marvinLink = within(dialog).getByRole("link", { name: "Marvin Flow" })
    expect(marvinLink).toHaveAttribute("href", "/marvin-flow/training")
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
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBeNull()
  })
})
