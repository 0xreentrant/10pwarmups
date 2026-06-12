import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "../data/whatsNew"

export function getSeenReleaseVersion(): string | null {
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY)
  } catch {
    return null
  }
}

export function markReleaseSeen(version: string = APP_RELEASE_VERSION): void {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, version)
  } catch {}
}

export function shouldShowWhatsNew(): boolean {
  return getSeenReleaseVersion() !== APP_RELEASE_VERSION
}
