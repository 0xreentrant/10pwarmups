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
    for (const id of ["attack-series", "ramey-flow", "marvin-flow"]) {
      expect(catalog.warmups.find(warmup => warmup.id === id)?.sectionId).toBeNull()
    }
    const named = catalog.warmups.filter(warmup => warmup.sectionId == null).map(warmup => warmup.id)
    expect(named).toEqual(["attack-series", "ramey-flow", "marvin-flow"])
    db.close()
  })

  it("moves named flows off section A when an older database required a section", () => {
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
      INSERT INTO moves VALUES('attack-series',0,'Full Guard','["A"]',NULL,NULL);
    `)
    legacy.close()

    const db = openCatalog(dbPath)
    const catalog = readCatalog(db)
    expect(catalog.warmups.find(warmup => warmup.id === "A1")?.sectionId).toBe("A")
    expect(catalog.warmups.find(warmup => warmup.id === "attack-series")?.moves[0]?.text).toBe("Full Guard")
    for (const id of ["attack-series", "ramey-flow", "marvin-flow"]) {
      expect(catalog.warmups.find(warmup => warmup.id === id)?.sectionId).toBeNull()
    }
    db.close()
  })
})
