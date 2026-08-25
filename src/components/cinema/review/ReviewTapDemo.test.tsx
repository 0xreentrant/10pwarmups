import { render, act, fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import ReviewTapDemo from "./ReviewTapDemo"

describe("ReviewTapDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("waits for OK on intro then walks left, center, right", () => {
    const onComplete = vi.fn()
    render(<ReviewTapDemo onComplete={onComplete} />)

    expect(document.querySelector(".ct-tap-demo-intro")).toBeTruthy()
    expect(document.querySelector(".ct-tap-demo-stamp")?.textContent).toBe("New review")
    expect(document.querySelector(".ct-tap-demo-zone")).toBeNull()

    act(() => { vi.advanceTimersByTime(5000) })
    expect(document.querySelector(".ct-tap-demo-intro")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "OK" }))
    expect(document.querySelector(".ct-tap-demo-intro")).toBeNull()
    expect(document.querySelector(".ct-tap-demo-zone--left")).toBeTruthy()
    expect(document.querySelector(".ct-tap-demo-label")?.textContent).toBe("prev move")

    act(() => { vi.advanceTimersByTime(1200) })
    expect(document.querySelector(".ct-tap-demo-zone--center")).toBeTruthy()
    expect(document.querySelector(".ct-tap-demo-label")?.textContent).toBe("pause vid")

    act(() => { vi.advanceTimersByTime(1200) })
    expect(document.querySelector(".ct-tap-demo-zone--right")).toBeTruthy()
    expect(document.querySelector(".ct-tap-demo-label")?.textContent).toBe("next move")

    act(() => { vi.advanceTimersByTime(1200) })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(document.querySelector(".ct-tap-demo")).toBeNull()
  })
})
