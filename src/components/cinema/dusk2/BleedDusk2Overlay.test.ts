import { describe, expect, it } from "vitest"
import { fadeLook } from "../ante/fadeLooks"
import { bleedVideoFilter } from "./BleedDusk2Overlay"

describe("bleedVideoFilter", () => {
  const asking = fadeLook("dissolve", 0.5)
  const dissolveFull = fadeLook("dissolve", 1)

  it("clears the dark filter during wrong-answer reveal playback", () => {
    expect(bleedVideoFilter("wrong", 0, true, asking, dissolveFull)).toBe("none")
  })

  it("keeps the dissolve filter on a tapped-out buzzer hold", () => {
    expect(bleedVideoFilter("wrong", null, false, asking, dissolveFull)).toBe(dissolveFull.filter)
  })

  it("clears the filter on a correct reveal", () => {
    expect(bleedVideoFilter("correct", 1, false, asking, dissolveFull)).toBe("none")
  })
})
