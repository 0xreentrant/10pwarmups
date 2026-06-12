import { describe, it, expect } from "vitest"
import { formatReleaseDate } from "./whatsNew"

describe("formatReleaseDate", () => {
  it("formats an ISO release version as a long US date", () => {
    expect(formatReleaseDate("2026-06-11")).toBe("June 11, 2026")
  })
})
