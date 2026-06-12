export const APP_RELEASE_VERSION = "2026-06-11"

export const WHATS_NEW_STORAGE_KEY = "tp_whats_new_seen"

export function formatReleaseDate(version = APP_RELEASE_VERSION) {
  const [year, month, day] = version.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}
