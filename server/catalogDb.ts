import fs from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import seedSql from "./seed.sql?raw"
import { parseTimestampsJson } from "../src/components/tagger/taggerTimestamps"
import type { Partner } from "../src/types/domain"

export type CatalogMove = {
  text: string
  players: Partner[]
  note: string | null
  startSec: number | null
}

export type CatalogWarmup = {
  id: string
  sectionId: string | null
  title: string
  link: string | null
  note: string
  moves: CatalogMove[]
}

export type CatalogSection = { id: string; name: string }

export type CatalogPayload = {
  sections: CatalogSection[]
  warmups: CatalogWarmup[]
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS warmups (
  id TEXT PRIMARY KEY,
  section_id TEXT REFERENCES sections(id),
  title TEXT NOT NULL,
  link TEXT,
  position INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS moves (
  warmup_id TEXT NOT NULL REFERENCES warmups(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  players TEXT NOT NULL,
  note TEXT,
  start_sec REAL,
  PRIMARY KEY (warmup_id, position)
);
`

type SectionRow = { id: string; name: string; position: number }
const NAMED_FLOW_IDS = ["attack-series", "ramey-flow", "marvin-flow"]

type WarmupRow = {
  id: string
  section_id: string | null
  title: string
  link: string | null
  position: number
  note: string
}
type MoveRow = {
  warmup_id: string
  position: number
  text: string
  players: string
  note: string | null
  start_sec: number | null
}

function parsePlayers(raw: string): Partner[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return ["A"]
    const out: Partner[] = []
    for (const item of parsed) {
      if ((item === "A" || item === "B") && !out.includes(item)) out.push(item)
    }
    return out.length ? out : ["A"]
  } catch {
    return ["A"]
  }
}

export function openCatalog(dbPath: string): DatabaseSync {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true })
  }
  const db = new DatabaseSync(dbPath)
  db.exec("PRAGMA foreign_keys = ON")
  db.exec(SCHEMA)
  seedIfEmpty(db)
  detachNamedFlows(db)
  return db
}

function detachNamedFlows(db: DatabaseSync) {
  const cols = db.prepare("PRAGMA table_info(warmups)").all() as { name: string; notnull: number }[]
  const section = cols.find(col => col.name === "section_id")
  const named = NAMED_FLOW_IDS.map(id => `'${id}'`).join(", ")
  if (section?.notnull) {
    db.exec("PRAGMA foreign_keys = OFF")
    db.exec("BEGIN")
    try {
      db.exec(`
        CREATE TABLE warmups_next (
          id TEXT PRIMARY KEY,
          section_id TEXT REFERENCES sections(id),
          title TEXT NOT NULL,
          link TEXT,
          position INTEGER NOT NULL,
          note TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO warmups_next (id, section_id, title, link, position, note)
        SELECT id,
          CASE WHEN id IN (${named}) THEN NULL ELSE section_id END,
          title, link, position, note
        FROM warmups;
        DROP TABLE warmups;
        ALTER TABLE warmups_next RENAME TO warmups;
      `)
      db.exec("COMMIT")
    } catch (err) {
      db.exec("ROLLBACK")
      db.exec("PRAGMA foreign_keys = ON")
      throw err
    }
    db.exec("PRAGMA foreign_keys = ON")
    return
  }
  db.prepare(`UPDATE warmups SET section_id = NULL WHERE id IN (${named})`).run()
}

function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM sections").get() as { n: number }
  if (row.n > 0) return
  db.exec("BEGIN")
  try {
    db.exec(seedSql)
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
}

export function readCatalog(db: DatabaseSync): CatalogPayload {
  const sections = db.prepare("SELECT id, name, position FROM sections ORDER BY position, id").all() as SectionRow[]
  const warmups = db.prepare(
    "SELECT id, section_id, title, link, position, note FROM warmups ORDER BY position, id",
  ).all() as WarmupRow[]
  const moves = db.prepare(
    "SELECT warmup_id, position, text, players, note, start_sec FROM moves ORDER BY warmup_id, position",
  ).all() as MoveRow[]
  const movesByWarmup = new Map<string, CatalogMove[]>()
  for (const move of moves) {
    const list = movesByWarmup.get(move.warmup_id) ?? []
    list.push({
      text: move.text,
      players: parsePlayers(move.players),
      note: move.note,
      startSec: move.start_sec,
    })
    movesByWarmup.set(move.warmup_id, list)
  }
  const sectionOrder = new Map(sections.map(section => [section.id, section.position]))
  const sectionRank = (id: string | null) => (id == null ? Number.MAX_SAFE_INTEGER : (sectionOrder.get(id) ?? 0))
  const ordered = [...warmups].sort((a, b) => {
    const sectionDiff = sectionRank(a.section_id) - sectionRank(b.section_id)
    if (sectionDiff !== 0) return sectionDiff
    return a.position - b.position
  })
  return {
    sections: sections.map(section => ({ id: section.id, name: section.name })),
    warmups: ordered.map(warmup => ({
      id: warmup.id,
      sectionId: warmup.section_id,
      title: warmup.title,
      link: warmup.link,
      note: warmup.note,
      moves: movesByWarmup.get(warmup.id) ?? [],
    })),
  }
}

function requireSection(db: DatabaseSync, id: string) {
  const row = db.prepare("SELECT id FROM sections WHERE id = ?").get(id) as { id: string } | undefined
  if (!row) throw new Error(`Unknown section ${id}`)
}

export function createSection(db: DatabaseSync, id: string, name: string): void {
  const sectionId = id.trim().toUpperCase()
  const sectionName = name.trim()
  if (!sectionId || !sectionName) throw new Error("Section id and name are required")
  const existing = db.prepare("SELECT id FROM sections WHERE id = ?").get(sectionId) as { id: string } | undefined
  if (existing) throw new Error("That id is already used.")
  const row = db.prepare("SELECT COALESCE(MAX(position), -1) AS position FROM sections").get() as { position: number }
  db.prepare("INSERT INTO sections (id, name, position) VALUES (?, ?, ?)").run(sectionId, sectionName, row.position + 1)
}

export function renameSection(db: DatabaseSync, id: string, name: string): void {
  const sectionName = name.trim()
  if (!sectionName) throw new Error("Section name is required")
  requireSection(db, id)
  db.prepare("UPDATE sections SET name = ? WHERE id = ?").run(sectionName, id)
}

export function nextWarmupId(db: DatabaseSync, sectionId: string): string {
  const rows = db.prepare("SELECT id FROM warmups WHERE section_id = ?").all(sectionId) as { id: string }[]
  const nums = rows
    .filter(row => row.id.startsWith(sectionId))
    .map(row => Number(row.id.slice(sectionId.length)))
    .filter(n => Number.isFinite(n))
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1
  return `${sectionId}${next}`
}

export function createWarmup(db: DatabaseSync, title: string, sectionId: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new Error("Title is required")
  requireSection(db, sectionId)
  const id = nextWarmupId(db, sectionId)
  const row = db.prepare(
    "SELECT COALESCE(MAX(position), -1) AS position FROM warmups WHERE section_id = ?",
  ).get(sectionId) as { position: number }
  db.prepare(
    "INSERT INTO warmups (id, section_id, title, link, position, note) VALUES (?, ?, ?, NULL, ?, '')",
  ).run(id, sectionId, trimmed, row.position + 1)
  return id
}

export function updateWarmup(db: DatabaseSync, id: string, title: string, sectionId: string): void {
  const trimmed = title.trim()
  if (!trimmed) throw new Error("Title is required")
  const warmup = db.prepare("SELECT id FROM warmups WHERE id = ?").get(id) as { id: string } | undefined
  if (!warmup) throw new Error(`Unknown warmup ${id}`)
  const section = sectionId.trim()
  if (!section) {
    db.prepare("UPDATE warmups SET title = ?, section_id = NULL WHERE id = ?").run(trimmed, id)
    return
  }
  requireSection(db, section)
  db.prepare("UPDATE warmups SET title = ?, section_id = ? WHERE id = ?").run(trimmed, section, id)
}

function warmupMoves(db: DatabaseSync, warmupId: string): { text: string; note: string | null }[] {
  return db.prepare(
    "SELECT text, note FROM moves WHERE warmup_id = ? ORDER BY position",
  ).all(warmupId) as { text: string; note: string | null }[]
}

export function saveTaggerJson(db: DatabaseSync, jsonText: string): { deckId: string } {
  let deckId = ""
  let list: unknown
  try {
    const raw = JSON.parse(jsonText) as { deckId?: unknown; timestamps?: unknown }
    if (typeof raw.deckId === "string") deckId = raw.deckId
    list = raw.timestamps
  } catch {
    throw new Error("Invalid JSON")
  }
  if (!deckId) throw new Error("Missing deckId")
  const warmup = db.prepare("SELECT id FROM warmups WHERE id = ?").get(deckId) as { id: string } | undefined
  if (!warmup) throw new Error(`Unknown deck ${deckId}`)
  if (!Array.isArray(list) || list.length === 0) throw new Error("Need at least one move in timestamps")

  const current = warmupMoves(db, deckId)
  const result = parseTimestampsJson(jsonText, list.length, current.map(move => move.text))
  if (!result.ok) throw new Error(result.error)

  if (result.names || result.playerLists) {
    const names = result.names ?? current.map(move => move.text)
    const playerLists = result.playerLists ?? names.map(() => ["A"] as Partner[])
    const insert = db.prepare(
      "INSERT INTO moves (warmup_id, position, text, players, note, start_sec) VALUES (?, ?, ?, ?, ?, ?)",
    )
    db.exec("BEGIN")
    try {
      db.prepare("DELETE FROM moves WHERE warmup_id = ?").run(deckId)
      names.forEach((name, index) => {
        const start = result.timestamps[index]
        insert.run(
          deckId,
          index,
          name,
          JSON.stringify(playerLists[index] ?? ["A"]),
          current[index]?.note ?? null,
          typeof start === "number" ? start : null,
        )
      })
      db.exec("COMMIT")
    } catch (err) {
      db.exec("ROLLBACK")
      throw err
    }
  } else {
    const update = db.prepare("UPDATE moves SET start_sec = ? WHERE warmup_id = ? AND position = ?")
    current.forEach((_, index) => {
      const start = result.timestamps[index]
      update.run(typeof start === "number" ? start : null, deckId, index)
    })
  }
  return { deckId }
}

export function saveTaggerNote(db: DatabaseSync, deckId: string, noteText: string): void {
  const warmup = db.prepare("SELECT id FROM warmups WHERE id = ?").get(deckId) as { id: string } | undefined
  if (!warmup) throw new Error(`Unknown deck ${deckId}`)
  db.prepare("UPDATE warmups SET note = ? WHERE id = ?").run(noteText, deckId)
}
