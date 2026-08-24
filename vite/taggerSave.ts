import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseTimestampsJson } from "../src/components/tagger/taggerTimestamps"
import { DECKS } from "../src/data/decks"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export function formatTimestampLine(t: number | null): string {
  if (t === null) return "    null,"
  return `    ${t},`
}

export function formatTimestampsBlock(timestamps: (number | null)[]): string {
  return timestamps.map(formatTimestampLine).join("\n")
}

export function formatMoveLine(text: string, partner: string): string {
  const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
  return `      m("${escaped}", "${partner}"),`
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

export function saveTaggerJson(jsonText: string): { deckId: string } {
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

  const result = parseTimestampsJson(
    jsonText,
    deck.moves.length,
    deck.moves.map(m => m.text),
  )
  if (!result.ok) throw new Error(result.error)

  const tsPath = path.join(root, "src/data/moveTimestamps.ts")
  const tsContent = upsertDeckTimestamps(
    fs.readFileSync(tsPath, "utf8"),
    deckId,
    formatTimestampsBlock(result.timestamps),
  )
  fs.writeFileSync(tsPath, tsContent, "utf8")

  if (result.names || result.partners) {
    const decksPath = path.join(root, "src/data/decks.ts")
    const names = result.names ?? deck.moves.map(m => m.text)
    const partners = result.partners ?? deck.moves.map(m => m.partner)
    const movesBlock = names
      .map((name, i) => formatMoveLine(name, partners[i] ?? "A"))
      .join("\n")
    const decksContent = replaceDeckMoves(fs.readFileSync(decksPath, "utf8"), deckId, movesBlock)
    fs.writeFileSync(decksPath, decksContent, "utf8")
  }

  return { deckId }
}

export function saveTaggerNote(
  deckId: string,
  noteText: string,
  options?: { root?: string },
): void {
  if (!DECKS.some(d => d.id === deckId)) throw new Error(`Unknown deck ${deckId}`)
  const base = options?.root ?? root
  const notesDir = path.join(base, "src/data/warmup-notes")
  fs.mkdirSync(notesDir, { recursive: true })
  const notePath = path.join(notesDir, `${deckId}.txt`)
  fs.writeFileSync(notePath, noteText, "utf8")
}
