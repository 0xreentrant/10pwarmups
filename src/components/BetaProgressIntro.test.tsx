import { render, fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import BetaProgressIntro from "./BetaProgressIntro"

describe("BetaProgressIntro", () => {
  it("shows learn the warmups copy and calls onComplete on OK", () => {
    const onComplete = vi.fn()
    render(<BetaProgressIntro onComplete={onComplete} />)

    expect(document.querySelector(".bt-progress-intro-stamp")?.textContent).toBe("Learn the warmups")
    expect(screen.getByText(/Review first, then use training mode/i)).toBeInTheDocument()
    expect(document.querySelector(".bt-progress-intro-flow")?.textContent).toBe("Review → Train")

    fireEvent.click(screen.getByRole("button", { name: "OK" }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
