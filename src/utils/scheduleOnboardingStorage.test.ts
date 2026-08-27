import { describe, it, expect, beforeEach } from "vitest"
import {
  SCHEDULE_ONBOARDING_STORAGE_KEY,
  SCHEDULE_ONBOARDING_VERSION,
} from "../data/scheduleOnboarding"
import {
  getSeenScheduleOnboardingVersion,
  markScheduleOnboardingSeen,
  shouldShowScheduleOnboarding,
} from "./scheduleOnboardingStorage"

describe("scheduleOnboardingStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("shows onboarding when version has not been seen", () => {
    expect(shouldShowScheduleOnboarding()).toBe(true)
    expect(getSeenScheduleOnboardingVersion()).toBeNull()
  })

  it("hides onboarding after marking seen for current version", () => {
    markScheduleOnboardingSeen()
    expect(getSeenScheduleOnboardingVersion()).toBe(SCHEDULE_ONBOARDING_VERSION)
    expect(shouldShowScheduleOnboarding()).toBe(false)
  })

  it("shows onboarding again when stored version is stale", () => {
    localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, "2026-01-01T00:00:00.000Z")
    expect(shouldShowScheduleOnboarding()).toBe(true)
  })
})
