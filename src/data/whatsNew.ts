export const APP_RELEASE_VERSION = "2026-06-12T10:21:20.653Z"

export const WHATS_NEW_STORAGE_KEY = "tp_whats_new_seen"

export function formatReleaseDate(version: string = APP_RELEASE_VERSION): string {
  return new Date(version).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}
