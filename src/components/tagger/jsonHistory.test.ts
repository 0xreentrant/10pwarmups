import { describe, expect, it } from "vitest"
import {
  commitJsonHistory,
  DEFAULT_JSON_HISTORY_MAX,
  redoJsonHistory,
  undoJsonHistory,
} from "./jsonHistory"

describe("jsonHistory", () => {
  it("no-ops commit when unchanged or empty current", () => {
    expect(commitJsonHistory(["a"], "b", "b")).toBeNull()
    expect(commitJsonHistory([], "", "c")).toBeNull()
  })

  it("caps past length on commit", () => {
    const past = Array.from({ length: DEFAULT_JSON_HISTORY_MAX }, (_, i) => `v${i}`)
    const result = commitJsonHistory(past, "current", "next", DEFAULT_JSON_HISTORY_MAX)
    expect(result?.past).toHaveLength(DEFAULT_JSON_HISTORY_MAX)
    expect(result?.past[0]).toBe("v1")
    expect(result?.past.at(-1)).toBe("current")
    expect(result?.future).toEqual([])
  })

  it("round-trips commit, undo, and redo", () => {
    let past: string[] = []
    let future: string[] = []
    let applied = "v0"

    const stacks = commitJsonHistory(past, applied, "v1")!
    past = stacks.past
    future = stacks.future
    applied = "v1"

    const u1 = undoJsonHistory(past, future, applied)!
    expect(u1.current).toBe("v0")
    expect(u1.future).toEqual(["v1"])

    const r1 = redoJsonHistory(u1.past, u1.future, u1.current)!
    expect(r1.current).toBe("v1")
    expect(r1.future).toEqual([])
  })

  it("undo and redo return null at stack ends", () => {
    expect(undoJsonHistory([], ["x"], "c")).toBeNull()
    expect(redoJsonHistory(["a"], [], "b")).toBeNull()
  })
})
