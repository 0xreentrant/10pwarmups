import { describe, it, expect, beforeEach } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
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
    expect(screen.getByText(/Trainer works offline/)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /install it to your phone like an app/i })
    expect(link).toHaveAttribute("href", "https://support.google.com/chrome/answer/9658361")
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
})
