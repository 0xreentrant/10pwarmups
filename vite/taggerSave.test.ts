import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  formatMoveLine,
  formatTimestampsBlock,
  replaceDeckMoves,
  replaceDeckTimestamps,
  upsertDeckTimestamps,
  saveTaggerNote,
} from "./taggerSave"

describe("taggerSave formatting", () => {
  it("formats timestamps with nulls", () => {
    expect(formatTimestampsBlock([0, null, 2.5])).toBe("    0,\n    null,\n    2.5,")
  })

  it("escapes quotes in move names", () => {
    expect(formatMoveLine("Say \"hi\"", "B")).toBe('      m("Say \\"hi\\"", "B"),')
  })

  it("replaces a deck timestamp block", () => {
    const source = `export const MOVE_TIMESTAMPS = {
  A1: [
    0,
    1,
  ],
  A2: [
    0,
    2,
  ],
}`
    const out = replaceDeckTimestamps(source, "A2", "    0,\n    null,")
    expect(out).toContain("A2: [\n    0,\n    null,\n  ],")
    expect(out).toContain("A1: [\n    0,\n    1,\n  ],")
  })

  it("inserts a new deck timestamp block", () => {
    const source = `export const MOVE_TIMESTAMPS: Record<string, (number | null)[]> = {
  A3: [
    0,
    1,
  ],
}

/** Tagged starts when length matches and times fit the clip; else equal slices. */
export function resolveMoveTimestamps() {}`
    const out = upsertDeckTimestamps(source, "A4", "    0,\n    null,")
    expect(out).toContain("A3: [\n    0,\n    1,\n  ],")
    expect(out).toContain("A4: [\n    0,\n    null,\n  ]")
    expect(out).toContain("export function resolveMoveTimestamps() {}")
  })

  it("replaces a deck moves block", () => {
    const source = `{
    id: "A1", series: "A", name: "Kneeling",
    moves: [
      m("Old", "A"),
    ]
  },
  {
    id: "A2", series: "A", name: "Standing",
    moves: [
      m("Keep", "A"),
    ]
  },`
    const out = replaceDeckMoves(source, "A2", "      m(\"New\", \"B\"),")
    expect(out).toContain('id: "A2"')
    expect(out).toContain('m("New", "B"),')
    expect(out).toContain('m("Old", "A"),')
  })
})

describe("saveTaggerNote", () => {
  const tmpDirs: string[] = []

  afterEach(() => {
    for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
    tmpDirs.length = 0
  })

  it("preserves leading spaces, blank lines, and trailing space", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tagger-note-"))
    tmpDirs.push(dir)
    const notesDir = path.join(dir, "src/data/warmup-notes")
    fs.mkdirSync(notesDir, { recursive: true })
    const note = " ** headline\n\n - first bullet\n - second bullet \n"
    saveTaggerNote("A1", note, { root: dir })
    const saved = fs.readFileSync(path.join(notesDir, "A1.txt"), "utf8")
    expect(saved).toBe(note)
  })
})
