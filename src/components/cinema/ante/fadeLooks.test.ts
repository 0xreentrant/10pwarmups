import { describe, expect, it } from "vitest"
import { fadeLook, type FadeVariantId } from "./fadeLooks"

const IDS: FadeVariantId[] = ["dusk", "dissolve"]

describe("fadeLook", () => {
  it("starts neutral at p=0", () => {
    for (const id of IDS) {
      const look = fadeLook(id, 0)
      expect(look.videoOpacity).toBe(1)
      expect(look.veil).toBe(0)
    }
  })

  it("is heavily faded at p=1", () => {
    expect(fadeLook("dusk", 1).filter).toContain("brightness(0.050")
    expect(fadeLook("dissolve", 1).videoOpacity).toBeLessThan(0.05)
  })

  it("clamps out-of-range progress", () => {
    expect(fadeLook("dissolve", 2).videoOpacity).toBe(fadeLook("dissolve", 1).videoOpacity)
    expect(fadeLook("dusk", -1)).toEqual(fadeLook("dusk", 0))
  })
})
