import { describe, it, expect, beforeEach } from "vitest"
import {
  DEFAULT_VOLUME,
  VOLUME_STORAGE_KEY,
  applyVolumeSettings,
  loadVolumeSettings,
  saveVolumeSettings,
} from "./volumeStorage"

describe("volumeStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns defaults when missing or invalid", () => {
    expect(loadVolumeSettings()).toEqual(DEFAULT_VOLUME)
    localStorage.setItem(VOLUME_STORAGE_KEY, "not-json")
    expect(loadVolumeSettings()).toEqual(DEFAULT_VOLUME)
    localStorage.setItem(VOLUME_STORAGE_KEY, JSON.stringify({ volume: 9, muted: "yes" }))
    expect(loadVolumeSettings()).toEqual({ volume: 1, muted: false })
  })

  it("round-trips volume and mute", () => {
    saveVolumeSettings({ volume: 0.35, muted: true })
    expect(loadVolumeSettings()).toEqual({ volume: 0.35, muted: true })
    expect(JSON.parse(localStorage.getItem(VOLUME_STORAGE_KEY)!)).toEqual({
      volume: 0.35,
      muted: true,
    })
  })

  it("applies settings and respects forceMuted", () => {
    const media = document.createElement("video")
    applyVolumeSettings(media, { volume: 0.2, muted: false })
    expect(media.volume).toBeCloseTo(0.2)
    expect(media.muted).toBe(false)
    applyVolumeSettings(media, { volume: 0.5, muted: false }, { forceMuted: true })
    expect(media.volume).toBeCloseTo(0.5)
    expect(media.muted).toBe(true)
  })
})
