import { describe, expect, it } from "vitest"
import { ANTE_STALL_STEPS, ANTE_TOP_STAKE, anteStake } from "./useAnteRound"

describe("anteStake", () => {
  it("opens at the top stake then drops one point per stall step down to x1", () => {
    expect(anteStake(0)).toBe(ANTE_TOP_STAKE)
    expect(anteStake(ANTE_STALL_STEPS[0] - 1)).toBe(ANTE_TOP_STAKE)
    expect(anteStake(ANTE_STALL_STEPS[0])).toBe(3)
    expect(anteStake(ANTE_STALL_STEPS[1])).toBe(2)
    expect(anteStake(ANTE_STALL_STEPS[2])).toBe(1)
    expect(anteStake(99999)).toBe(1)
  })
})
