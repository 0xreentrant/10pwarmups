import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from "../data/whatsNew"

export function getSeenReleaseVersion() {
  try {
    return localStorage.getItem(WHATS_NEW_STORAGE_KEY)
  } catch {
    return null
  }
}

export function markReleaseSeen(version = APP_RELEASE_VERSION) {
  try {
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, version)
  } catch {}
}

export function shouldShowWhatsNew() {
  return getSeenReleaseVersion() !== APP_RELEASE_VERSION
}
