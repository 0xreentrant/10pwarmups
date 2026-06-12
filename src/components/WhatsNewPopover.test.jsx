import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import App from "../App"
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "../data/whatsNew"

describe("What's New popover", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("shows on first load when release has not been seen", () => {
    render(<App />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("What's New")).toBeInTheDocument()
    expect(screen.getByText(/Trainer works offline/)).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /install it to your phone like an app/i })
    expect(link).toHaveAttribute("href", "https://support.google.com/chrome/answer/9658361")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("does not show after the release has been seen", () => {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_RELEASE_VERSION)
    render(<App />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("marks release seen and closes when Got it is clicked", () => {
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Got it" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe(APP_RELEASE_VERSION)
  })

  it("marks release seen and closes on Escape", () => {
    render(<App />)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(localStorage.getItem(WHATS_NEW_STORAGE_KEY)).toBe(APP_RELEASE_VERSION)
  })
})
