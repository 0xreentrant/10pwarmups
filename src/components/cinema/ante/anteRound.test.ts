import { describe, expect, it } from "vitest"
import { ANTE_STALL_STEPS, ANTE_TOP_STAKE, anteStake, strobeLit } from "./useAnteRound"

describe("anteStake", () => {
  it("opens at the top stake", () => {
    expect(anteStake(0)).toBe(ANTE_TOP_STAKE)
    expect(anteStake(ANTE_STALL_STEPS[0] - 1)).toBe(ANTE_TOP_STAKE)
  })

  it("drops one point per stall step down to x1", () => {
    expect(anteStake(ANTE_STALL_STEPS[0])).toBe(3)
    expect(anteStake(ANTE_STALL_STEPS[1])).toBe(2)
    expect(anteStake(ANTE_STALL_STEPS[2])).toBe(1)
    expect(anteStake(99999)).toBe(1)
  })
})

describe("strobeLit", () => {
  it("fires an opening flash and one per stall step", () => {
    expect(strobeLit(0)).toBe(false)
    expect(strobeLit(200)).toBe(true)
    for (const step of ANTE_STALL_STEPS) {
      expect(strobeLit(step - 50)).toBe(false)
      expect(strobeLit(step + 50)).toBe(true)
    }
  })

  it("is dark between flashes", () => {
    expect(strobeLit(1000)).toBe(false)
    expect(strobeLit(2500)).toBe(false)
  })
})
