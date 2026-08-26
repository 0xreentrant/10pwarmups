import { describe, expect, it } from "vitest"
import {
  commitJsonHistory,
  DEFAULT_JSON_HISTORY_MAX,
  redoJsonHistory,
  undoJsonHistory,
} from "./jsonHistory"

describe("jsonHistory", () => {
  it("commit pushes current and clears future", () => {
    const result = commitJsonHistory(["a"], "b", "c")
    expect(result).toEqual({ past: ["a", "b"], future: [] })
  })

  it("commit no-ops when current equals next", () => {
    expect(commitJsonHistory(["a"], "b", "b")).toBeNull()
  })

  it("commit no-ops when current is empty", () => {
    expect(commitJsonHistory([], "", "c")).toBeNull()
  })

  it("commit caps past length", () => {
    const past = Array.from({ length: DEFAULT_JSON_HISTORY_MAX }, (_, i) => `v${i}`)
    const result = commitJsonHistory(past, "current", "next", DEFAULT_JSON_HISTORY_MAX)
    expect(result?.past).toHaveLength(DEFAULT_JSON_HISTORY_MAX)
    expect(result?.past[0]).toBe("v1")
    expect(result?.past.at(-1)).toBe("current")
  })

  it("undo restores previous and moves current to future", () => {
    const result = undoJsonHistory(["a", "b"], [], "c")
    expect(result).toEqual({ past: ["a"], future: ["c"], current: "b" })
  })

  it("undo returns null when past is empty", () => {
    expect(undoJsonHistory([], ["x"], "c")).toBeNull()
  })

  it("redo restores next and moves current to past", () => {
    const result = redoJsonHistory(["a"], ["c", "d"], "b")
    expect(result).toEqual({ past: ["a", "b"], future: ["d"], current: "c" })
  })

  it("redo returns null when future is empty", () => {
    expect(redoJsonHistory(["a"], [], "b")).toBeNull()
  })

  it("round-trips commit, undo, and redo", () => {
    let past: string[] = []
    let future: string[] = []
    let applied = "v0"

    const commit = (next: string) => {
      const stacks = commitJsonHistory(past, applied, next)
      if (stacks) {
        past = stacks.past
        future = stacks.future
      }
      applied = next
    }

    commit("v1")
    commit("v2")
    expect(past).toEqual(["v0", "v1"])
    expect(applied).toBe("v2")

    const u1 = undoJsonHistory(past, future, applied)!
    past = u1.past
    future = u1.future
    applied = u1.current
    expect(applied).toBe("v1")

    const r1 = redoJsonHistory(past, future, applied)!
    past = r1.past
    future = r1.future
    applied = r1.current
    expect(applied).toBe("v2")
    expect(future).toEqual([])
  })
})
