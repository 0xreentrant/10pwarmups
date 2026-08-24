import { describe, expect, it, beforeEach } from "vitest"
import {
  DEFAULT_PLAYBACK_SPEED,
  MAX_PLAYBACK_SPEED,
  MIN_PLAYBACK_SPEED,
  PLAYBACK_SPEED_STORAGE_KEY,
  clampPlaybackSpeed,
  loadPlaybackSpeed,
  savePlaybackSpeed,
} from "./usePersistedPlaybackSpeed"

describe("usePersistedPlaybackSpeed storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("defaults when empty or invalid", () => {
    expect(loadPlaybackSpeed()).toBe(DEFAULT_PLAYBACK_SPEED)
    localStorage.setItem(PLAYBACK_SPEED_STORAGE_KEY, "nope")
    expect(loadPlaybackSpeed()).toBe(DEFAULT_PLAYBACK_SPEED)
  })

  it("clamps and round-trips", () => {
    expect(clampPlaybackSpeed(0)).toBe(MIN_PLAYBACK_SPEED)
    expect(clampPlaybackSpeed(1)).toBe(1)
    expect(clampPlaybackSpeed(1.23)).toBe(1.25)
    expect(clampPlaybackSpeed(99)).toBe(MAX_PLAYBACK_SPEED)
    savePlaybackSpeed(1.5)
    expect(loadPlaybackSpeed()).toBe(1.5)
    expect(localStorage.getItem(PLAYBACK_SPEED_STORAGE_KEY)).toBe("1.5")
  })
})
