import { isFiniteTimestamp, resolveMoveTimestamps } from "../../data/moveTimestamps"
import type { Partner } from "../../types/domain"
import { normalizePlayers } from "../../utils/movePlayers"

/** Stored tags aligned to deck move count; null per move when untagged. */
export function taggerSeedTimestamps(
  deckId: string,
  moveCount: number,
  duration: number,
): (number | null)[] {
  return resolveMoveTimestamps(deckId, moveCount, duration)
}

/** M:SS.mmm for video scrub readouts (native controls only show whole seconds). */
export function formatVideoTimeMs(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00.000"
  const totalMs = Math.round(sec * 1000)
  const ms = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const s = totalSec % 60
  const m = Math.floor(totalSec / 60)
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`
}

/** Map a pointer X on the track rect to a clamped time in [0, duration]. */
export function timeFromClientX(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  duration: number,
): number {
  if (duration <= 0 || trackWidth <= 0) return 0
  const ratio = (clientX - trackLeft) / trackWidth
  return Math.min(duration, Math.max(0, ratio * duration))
}

export { isFiniteTimestamp, moveIndexAtTime } from "../../data/moveTimestamps"

export type ParseTimestampsResult =
  | { ok: true; timestamps: (number | null)[]; names?: string[]; playerLists?: Partner[][] }
  | { ok: false; error: string }

export function partnerToPlayer(partner: Partner): "a" | "b" {
  return partner === "B" ? "b" : "a"
}

export function playerToPartner(player: unknown): Partner | undefined {
  if (player === "a" || player === "A") return "A"
  if (player === "b" || player === "B") return "B"
  return undefined
}

export function playersToJson(players: readonly Partner[]): ("a" | "b")[] {
  return normalizePlayers(players).map(partnerToPlayer)
}

function parsePlayersFromRow(row: { player?: unknown; players?: unknown }): Partner[] | undefined {
  if (Array.isArray(row.players)) {
    const out: Partner[] = []
    for (const p of row.players) {
      const partner = playerToPartner(p)
      if (partner && !out.includes(partner)) out.push(partner)
    }
    if (out.length) return normalizePlayers(out)
  }
  const single = playerToPartner(row.player)
  if (single) return [single]
  return undefined
}

export function buildJsonText(
  deckId: string,
  timestamps: (number | null)[],
  moveNames: string[],
  movePlayers: Partner[][],
): string {
  return JSON.stringify(
    {
      deckId,
      timestamps: timestamps.map((t, i) => ({
        name: moveNames[i] ?? `Move ${i + 1}`,
        players: playersToJson(movePlayers[i] ?? ["A"]),
        t: isFiniteTimestamp(t) ? t : null,
      })),
    },
    null,
    2,
  )
}

type ParsedTimestampEntry = { name?: string; t: number | null; players?: Partner[] }

function nameOccurrenceIndex(names: readonly string[], index: number): number {
  const name = names[index]?.trim()
  if (!name) return 0
  let rank = 0
  for (let i = 0; i < index; i++) {
    if (names[i]?.trim() === name) rank++
  }
  return rank
}

function findEntryByName(
  entries: readonly ParsedTimestampEntry[],
  name: string,
  rank: number,
): ParsedTimestampEntry | undefined {
  let seen = 0
  for (const entry of entries) {
    if (entry.name?.trim() === name) {
      if (seen === rank) return entry
      seen++
    }
  }
  return undefined
}

function mergeSparseNamedTimestamps(
  entries: ParsedTimestampEntry[],
  moveCount: number,
  referenceNames: readonly string[],
): { timestamps: (number | null)[]; names: string[]; playerLists: Partner[][] } {
  const timestamps = Array.from({ length: moveCount }, () => null as number | null)
  const names = referenceNames.slice(0, moveCount)
  while (names.length < moveCount) names.push("")
  const playerLists = Array.from({ length: moveCount }, () => ["A"] as Partner[])

  for (let moveIdx = 0; moveIdx < moveCount; moveIdx++) {
    const refName = referenceNames[moveIdx]?.trim()
    if (!refName) continue
    const entry = findEntryByName(entries, refName, nameOccurrenceIndex(referenceNames, moveIdx))
    if (!entry) continue
    timestamps[moveIdx] = entry.t
    const loadedName = entry.name?.trim()
    if (loadedName) names[moveIdx] = loadedName
    if (entry.players) playerLists[moveIdx] = entry.players
  }

  return { timestamps, names, playerLists }
}

/** Parse tagger JSON: `{ deckId?, timestamps: (number|null)[] | { name?, t }[] }`. deckId ignored. */
export function parseTimestampsJson(
  text: string,
  moveCount: number,
  referenceNames: readonly string[] = [],
): ParseTimestampsResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: "Invalid JSON" }
  }
  if (!raw || typeof raw !== "object" || !("timestamps" in raw)) {
    return { ok: false, error: "Missing timestamps" }
  }
  const list = (raw as { timestamps: unknown }).timestamps
  if (!Array.isArray(list)) {
    return { ok: false, error: "timestamps must be an array" }
  }
  if (list.length > moveCount) {
    return { ok: false, error: `Need at most ${moveCount} timestamps, got ${list.length}` }
  }

  const entries: ParsedTimestampEntry[] = []
  let sawName = false
  let sawPlayer = false
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (item === null) {
      entries.push({ t: null })
      continue
    }
    if (typeof item === "number" && Number.isFinite(item)) {
      entries.push({ t: item })
      continue
    }
    if (item && typeof item === "object" && "t" in item) {
      const row = item as { t: unknown; name?: unknown; player?: unknown; players?: unknown }
      const name = typeof row.name === "string" ? row.name : undefined
      if (name) sawName = true
      const players = parsePlayersFromRow(row)
      if (players) sawPlayer = true
      const t = row.t
      if (t === null) {
        entries.push({ name, players, t: null })
        continue
      }
      if (typeof t === "number" && Number.isFinite(t)) {
        entries.push({ name, players, t })
        continue
      }
    }
    return { ok: false, error: `Bad timestamp at index ${i}` }
  }

  if (!sawName && !sawPlayer) {
    const timestamps = entries.map(entry => entry.t)
    while (timestamps.length < moveCount) timestamps.push(null)
    return { ok: true, timestamps }
  }

  const refNames =
    referenceNames.length === moveCount
      ? referenceNames
      : Array.from({ length: moveCount }, (_, i) => referenceNames[i] ?? "")

  if (entries.length < moveCount) {
    const merged = mergeSparseNamedTimestamps(entries, moveCount, refNames)
    return {
      ok: true,
      timestamps: merged.timestamps,
      names: merged.names,
      playerLists: sawPlayer ? merged.playerLists : undefined,
    }
  }

  const timestamps = entries.map(entry => entry.t)
  const names = entries.map(entry => entry.name?.trim() ?? "")
  while (names.length < moveCount) names.push("")
  const playerLists = entries.map(entry => entry.players ?? ["A"])
  return {
    ok: true,
    timestamps,
    names: names.slice(0, moveCount),
    playerLists: sawPlayer ? playerLists.slice(0, moveCount) : undefined,
  }
}
