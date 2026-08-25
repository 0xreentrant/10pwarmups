import { render, act, fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import TrainingZonesDemo from "./TrainingZonesDemo"

describe("TrainingZonesDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("waits for OK on intro then walks buttons, timer, tapout", () => {
    const onComplete = vi.fn()
    render(<TrainingZonesDemo onComplete={onComplete} />)

    expect(document.querySelector(".bl-train-demo-intro")).toBeTruthy()
    expect(document.querySelector(".bl-train-demo-stamp--intro")?.textContent).toBe("New train")
    expect(document.querySelector(".bl-train-demo-zone")).toBeNull()

    act(() => { vi.advanceTimersByTime(5000) })
    expect(document.querySelector(".bl-train-demo-intro")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "OK" }))
    expect(document.querySelector(".bl-train-demo-intro")).toBeNull()
    expect(document.querySelector(".bl-train-demo-zone--buttons")).toBeTruthy()
    expect(document.querySelector(".bl-train-demo-label")?.textContent).toBe("buttons")

    act(() => { vi.advanceTimersByTime(2000) })
    expect(document.querySelector(".bl-train-demo-zone--timer")).toBeTruthy()
    expect(document.querySelector(".bl-train-demo-label")?.textContent).toBe("timer")

    act(() => { vi.advanceTimersByTime(2000) })
    expect(document.querySelector(".bl-train-demo-zone--tapout")).toBeTruthy()
    expect(document.querySelector(".bl-train-demo-stamp")?.textContent).toBe("Tapped out")
    expect(document.querySelector(".bl-train-demo-label")?.textContent).toBe("tapped out")

    act(() => { vi.advanceTimersByTime(2000) })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(document.querySelector(".bl-train-demo")).toBeNull()
  })
})
