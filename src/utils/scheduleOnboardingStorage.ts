import {
  SCHEDULE_ONBOARDING_STORAGE_KEY,
  SCHEDULE_ONBOARDING_VERSION,
} from "../data/scheduleOnboarding"

export function getSeenScheduleOnboardingVersion(): string | null {
  try {
    return localStorage.getItem(SCHEDULE_ONBOARDING_STORAGE_KEY)
  } catch {
    return null
  }
}

export function markScheduleOnboardingSeen(
  version: string = SCHEDULE_ONBOARDING_VERSION,
): void {
  try {
    localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, version)
  } catch {}
}

export function shouldShowScheduleOnboarding(): boolean {
  return getSeenScheduleOnboardingVersion() !== SCHEDULE_ONBOARDING_VERSION
}
