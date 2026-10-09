import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
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

    const seededNote = fs.readFileSync(path.join(process.cwd(), "src/data/warmup-notes/A1.txt"), "utf8")
    expect(a1?.note).toBe(seededNote)

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
    db.close()
  })
})
