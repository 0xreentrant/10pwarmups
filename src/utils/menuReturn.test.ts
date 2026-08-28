import { describe, it, expect, beforeEach } from "vitest"
import {
  clearMenuReturn,
  consumeAllScrollY,
  consumeReturnToAll,
  rememberAllMenuReturn,
  sessionHomePathForDeckId,
} from "./menuReturn"

describe("menuReturn", () => {
  beforeEach(() => {
    clearMenuReturn()
  })

  it("routes series decks back to /all when remembered", () => {
    rememberAllMenuReturn(420)
    expect(sessionHomePathForDeckId("B2")).toEqual({ to: "/all" })
    expect(consumeAllScrollY()).toBe(420)
  })

  it("falls back to series home without a remembered /all", () => {
    expect(sessionHomePathForDeckId("B2")).toEqual({
      to: "/series/$letter",
      params: { letter: "B" },
    })
    expect(consumeReturnToAll()).toBe(false)
    expect(consumeAllScrollY()).toBe(null)
  })
})
