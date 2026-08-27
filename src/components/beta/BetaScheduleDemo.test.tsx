import { describe, it, expect, vi, afterEach } from "vitest"
import { act, render } from "@testing-library/react"
import BetaScheduleDemo from "./BetaScheduleDemo"

describe("BetaScheduleDemo", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("walks series zones then completes", async () => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div data-beta-demo="tracker"></div>
      <button data-beta-demo="review">Review</button>
      <button data-beta-demo="train">Train</button>
    `
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 10, left: 10, width: 100, height: 40 }),
    })

    const onComplete = vi.fn()
    render(<BetaScheduleDemo mode="series" onComplete={onComplete} />)

    expect(document.querySelector(".bt-sched-demo-label")?.textContent).toBe("schedule")
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(document.querySelector(".bt-sched-demo-label")?.textContent).toBe("review")
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(document.querySelector(".bt-sched-demo-label")?.textContent).toBe("train")
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
