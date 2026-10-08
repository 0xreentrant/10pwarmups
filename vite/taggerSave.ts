import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseTimestampsJson } from "../src/components/tagger/taggerTimestamps"
import { DECKS } from "../src/data/decks"
import type { Partner } from "../src/types/domain"
import { normalizePlayers } from "../src/utils/movePlayers"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export function formatTimestampLine(t: number | null): string {
  if (t === null) return "    null,"
  return `    ${t},`
}

export function formatTimestampsBlock(timestamps: (number | null)[]): string {
  return timestamps.map(formatTimestampLine).join("\n")
}

export function formatMoveLine(text: string, players: Partner | Partner[]): string {
  const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
  const list = normalizePlayers(players)
  if (list.length === 1) {
    return `      m("${escaped}", "${list[0]}"),`
  }
  return `      m("${escaped}", [${list.map(p => `"${p}"`).join(", ")}]),`
}

export function findMatchingBracketEnd(
  text: string,
  openIdx: number,
  openCh = "[",
  closeCh = "]",
): number {
  let depth = 0
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]
    if (ch === openCh) depth++
    else if (ch === closeCh) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

export function replaceDeckTimestamps(
  fileText: string,
  deckId: string,
  timestampsBlock: string,
): string {
  const marker = `  ${deckId}: [`
  const start = fileText.indexOf(marker)
  if (start === -1) throw new Error(`Deck ${deckId} not found in moveTimestamps.ts`)
  const openBracket = start + marker.length - 1
  const closeBracket = findMatchingBracketEnd(fileText, openBracket)
  if (closeBracket === -1) throw new Error(`Unclosed timestamp array for ${deckId}`)
  return `${fileText.slice(0, openBracket + 1)}\n${timestampsBlock}\n  ${fileText.slice(closeBracket)}`
}

export function upsertDeckTimestamps(
  fileText: string,
  deckId: string,
  timestampsBlock: string,
): string {
  const marker = `  ${deckId}: [`
  if (fileText.includes(marker)) {
    return replaceDeckTimestamps(fileText, deckId, timestampsBlock)
  }

  const exportIdx = fileText.indexOf("export const MOVE_TIMESTAMPS")
  if (exportIdx === -1) throw new Error("MOVE_TIMESTAMPS export not found in moveTimestamps.ts")
  const openBrace = fileText.indexOf("{", exportIdx)
  if (openBrace === -1) throw new Error("MOVE_TIMESTAMPS object not found in moveTimestamps.ts")
  const closeBrace = findMatchingBracketEnd(fileText, openBrace, "{", "}")
  if (closeBrace === -1) throw new Error("Unclosed MOVE_TIMESTAMPS object in moveTimestamps.ts")

  const newBlock = `  ${deckId}: [\n${timestampsBlock}\n  ]`
  const inner = fileText.slice(openBrace + 1, closeBrace).trim()
  const separator = inner.length > 0 ? ",\n" : "\n"
  return `${fileText.slice(0, closeBrace)}${separator}${newBlock}\n${fileText.slice(closeBrace)}`
}

export function replaceDeckMoves(fileText: string, deckId: string, movesBlock: string): string {
  const idMarker = `id: "${deckId}"`
  const idIdx = fileText.indexOf(idMarker)
  if (idIdx === -1) throw new Error(`Deck ${deckId} not found in decks.ts`)
  const movesIdx = fileText.indexOf("moves: [", idIdx)
  if (movesIdx === -1) throw new Error(`Moves not found for deck ${deckId}`)
  const openBracket = fileText.indexOf("[", movesIdx)
  const closeBracket = findMatchingBracketEnd(fileText, openBracket)
  if (closeBracket === -1) throw new Error(`Unclosed moves array for ${deckId}`)
  return `${fileText.slice(0, openBracket + 1)}\n${movesBlock}\n    ${fileText.slice(closeBracket)}`
}

export function applyTaggerJson(
  jsonText: string,
  files: { timestampsText: string; decksText: string },
): { deckId: string; timestampsText: string; decksText: string | null } {
  let deckId: string | undefined
  try {
    const raw = JSON.parse(jsonText) as { deckId?: unknown }
    if (typeof raw.deckId === "string") deckId = raw.deckId
  } catch {
    throw new Error("Invalid JSON")
  }
  if (!deckId) throw new Error("Missing deckId")

  const deck = DECKS.find(d => d.id === deckId)
  if (!deck) throw new Error(`Unknown deck ${deckId}`)

  const list = (JSON.parse(jsonText) as { timestamps?: unknown }).timestamps
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Need at least one move in timestamps")
  }

  const result = parseTimestampsJson(
    jsonText,
    list.length,
    deck.moves.map(m => m.text),
  )
  if (!result.ok) throw new Error(result.error)

  const timestampsText = upsertDeckTimestamps(
    files.timestampsText,
    deckId,
    formatTimestampsBlock(result.timestamps),
  )

  if (!result.names && !result.playerLists) {
    return { deckId, timestampsText, decksText: null }
  }

  const names = result.names ?? deck.moves.map(m => m.text)
  const playerLists = result.playerLists ?? deck.moves.map(m => m.players)
  const movesBlock = names
    .map((name, i) => formatMoveLine(name, playerLists[i] ?? ["A"]))
    .join("\n")
  return {
    deckId,
    timestampsText,
    decksText: replaceDeckMoves(files.decksText, deckId, movesBlock),
  }
}

export function saveTaggerJson(jsonText: string): { deckId: string } {
  const tsPath = path.join(root, "src/data/moveTimestamps.ts")
  const decksPath = path.join(root, "src/data/decks.ts")
  const applied = applyTaggerJson(jsonText, {
    timestampsText: fs.readFileSync(tsPath, "utf8"),
    decksText: fs.readFileSync(decksPath, "utf8"),
  })
  fs.writeFileSync(tsPath, applied.timestampsText, "utf8")
  if (applied.decksText) fs.writeFileSync(decksPath, applied.decksText, "utf8")
  return { deckId: applied.deckId }
}

export function assertKnownDeck(deckId: string) {
  if (!DECKS.some(d => d.id === deckId)) throw new Error(`Unknown deck ${deckId}`)
}

export function saveTaggerNote(
  deckId: string,
  noteText: string,
  options?: { root?: string },
): void {
  assertKnownDeck(deckId)
  const base = options?.root ?? root
  const notesDir = path.join(base, "src/data/warmup-notes")
  fs.mkdirSync(notesDir, { recursive: true })
  const notePath = path.join(notesDir, `${deckId}.txt`)
  fs.writeFileSync(notePath, noteText, "utf8")
}
