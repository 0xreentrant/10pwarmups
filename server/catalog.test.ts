import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, describe, expect, it } from "vitest"
import seedSql from "./seed.sql?raw"
import {
  createSection,
  createWarmup,
  openCatalog,
  readCatalog,
  renameSection,
  saveTaggerJson,
  saveTaggerNote,
  updateWarmup,
} from "./catalogDb"

const tmpDirs: string[] = []

function openTemp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "10p-catalog-"))
  tmpDirs.push(dir)
  return openCatalog(path.join(dir, "warmups.sqlite"))
}

afterEach(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
  tmpDirs.length = 0
})

describe("warmup catalog", () => {
  it("seeds A1 and stores title, section, and tagger edits", () => {
    const db = openTemp()
    const seeded = readCatalog(db)
    const a1 = seeded.warmups.find(warmup => warmup.id === "A1")
    expect(a1?.title).toBe("Kneeling")
    expect(a1?.sectionId).toBe("A")
    expect(a1?.moves.length).toBeGreaterThan(0)

    expect(a1?.note.length).toBeGreaterThan(0)
    const escapedNote = a1!.note.replaceAll("'", "''").replaceAll("\n", "\\n")
    expect(seedSql.includes(escapedNote)).toBe(true)

    renameSection(db, "A", "Granby Rolls")
    updateWarmup(db, "A1", "Kneeling Roll", "B")
    createSection(db, "i", "Rubber Guard")
    const created = createWarmup(db, "New Wave", "I")
    expect(created).toBe("I1")

    saveTaggerJson(db, JSON.stringify({
      deckId: "A1",
      timestamps: [{ name: "Rolled", players: ["a"], t: 1.25 }],
    }))
    const note = " ** headline\n\n - first bullet \n"
    saveTaggerNote(db, "A1", note)

    const catalog = readCatalog(db)
    expect(catalog.sections.find(section => section.id === "A")?.name).toBe("Granby Rolls")
    expect(catalog.sections.find(section => section.id === "I")?.name).toBe("Rubber Guard")
    const moved = catalog.warmups.find(warmup => warmup.id === "A1")
    expect(moved?.title).toBe("Kneeling Roll")
    expect(moved?.sectionId).toBe("B")
    expect(moved?.note).toBe(note)
    expect(moved?.moves).toEqual([
      { text: "Rolled", players: ["A"], note: null, startSec: 1.25 },
    ])
    const createdRow = catalog.warmups.find(warmup => warmup.id === "I1")
    expect(createdRow?.title).toBe("New Wave")
    expect(createdRow?.moves).toEqual([])
    for (const id of ["attack-series", "ramey-flow", "marvin-flow", "preschool-flow"]) {
      expect(catalog.warmups.find(warmup => warmup.id === id)?.sectionId).toBe("special-flow")
    }
    expect(catalog.sections.find(section => section.id === "special-flow")?.name).toBe("Special Flows")
    db.close()
  })

  it("migrates legacy NOT NULL section_id and attaches special-flow", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "10p-catalog-"))
    tmpDirs.push(dir)
    const dbPath = path.join(dir, "warmups.sqlite")
    const legacy = new DatabaseSync(dbPath)
    legacy.exec(`
      CREATE TABLE sections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE warmups (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL REFERENCES sections(id),
        title TEXT NOT NULL,
        link TEXT,
        position INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE moves (
        warmup_id TEXT NOT NULL REFERENCES warmups(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        text TEXT NOT NULL,
        players TEXT NOT NULL,
        note TEXT,
        start_sec REAL,
        PRIMARY KEY (warmup_id, position)
      );
      INSERT INTO sections VALUES('A','Granbys',0);
      INSERT INTO warmups VALUES('A1','A','Kneeling',NULL,0,'');
      INSERT INTO warmups VALUES('attack-series','A','Attack Series',NULL,4,'');
      INSERT INTO warmups VALUES('ramey-flow','A','Ramey Flow',NULL,5,'');
      INSERT INTO warmups VALUES('marvin-flow','A','Marvin Flow',NULL,6,'');
      INSERT INTO warmups VALUES('preschool-flow','A','Preschool Flow',NULL,7,'');
      INSERT INTO moves VALUES('attack-series',0,'Full Guard','["A"]',NULL,NULL);
    `)
    legacy.close()

    const db = openCatalog(dbPath)
    const catalog = readCatalog(db)
    expect(catalog.warmups.find(warmup => warmup.id === "A1")?.sectionId).toBe("A")
    expect(catalog.warmups.find(warmup => warmup.id === "attack-series")?.moves[0]?.text).toBe("Full Guard")
    for (const id of ["attack-series", "ramey-flow", "marvin-flow", "preschool-flow"]) {
      expect(catalog.warmups.find(warmup => warmup.id === id)?.sectionId).toBe("special-flow")
    }
    expect(catalog.sections.find(section => section.id === "special-flow")?.name).toBe("Special Flows")
    db.close()
  })

  it("mints dashed special-flow ids and keeps letter ids", () => {
    const db = openTemp()
    expect(createWarmup(db, "Extra Flow", "special-flow")).toBe("special-flow-1")
    expect(createWarmup(db, "Another", "special-flow")).toBe("special-flow-2")
    createSection(db, "special-extra", "Extra Special")
    expect(createWarmup(db, "Slug One", "special-extra")).toBe("special-extra-1")
    createSection(db, "j", "Judo")
    expect(createWarmup(db, "Letter", "J")).toBe("J1")
    db.close()
  })

  it("applies special-flow migration once across re-open", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "10p-catalog-"))
    tmpDirs.push(dir)
    const dbPath = path.join(dir, "warmups.sqlite")
    const first = openCatalog(dbPath)
    const versions = first.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as { version: number }[]
    expect(versions.map(row => row.version)).toEqual([1, 2])
    const before = readCatalog(first)
    first.close()
    const second = openCatalog(dbPath)
    const after = readCatalog(second)
    expect(after.sections.filter(s => s.id === "special-flow")).toHaveLength(1)
    expect(after.warmups.filter(w => w.sectionId === "special-flow").map(w => w.id).sort()).toEqual(
      before.warmups.filter(w => w.sectionId === "special-flow").map(w => w.id).sort(),
    )
    const versions2 = second.prepare("SELECT version FROM schema_migrations ORDER BY version").all() as { version: number }[]
    expect(versions2.map(row => row.version)).toEqual([1, 2])
    second.close()
  })
})
