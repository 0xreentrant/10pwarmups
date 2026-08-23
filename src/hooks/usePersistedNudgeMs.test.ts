import { describe, expect, it, beforeEach } from "vitest"
import {
  DEFAULT_NUDGE_MS,
  MAX_NUDGE_MS,
  MIN_NUDGE_MS,
  NUDGE_MS_STORAGE_KEY,
  clampNudgeMs,
  loadNudgeMs,
  saveNudgeMs,
} from "./usePersistedNudgeMs"

describe("usePersistedNudgeMs storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("defaults when empty or invalid", () => {
    expect(loadNudgeMs()).toBe(DEFAULT_NUDGE_MS)
    localStorage.setItem(NUDGE_MS_STORAGE_KEY, "nope")
    expect(loadNudgeMs()).toBe(DEFAULT_NUDGE_MS)
  })

  it("clamps and round-trips", () => {
    expect(clampNudgeMs(50)).toBe(MIN_NUDGE_MS)
    expect(clampNudgeMs(999_999)).toBe(MAX_NUDGE_MS)
    saveNudgeMs(500)
    expect(loadNudgeMs()).toBe(500)
    expect(localStorage.getItem(NUDGE_MS_STORAGE_KEY)).toBe("500")
  })
})
