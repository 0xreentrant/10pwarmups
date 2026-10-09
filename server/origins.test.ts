import { describe, expect, it } from "vitest"
import { isAdminEmail, redirectUriForOrigin, safeReturnPath } from "./origins"

describe("tagger origins", () => {
  it("uses a same-origin callback on localhost and tailscale", () => {
    expect(redirectUriForOrigin("http://localhost:5173", null)).toBe(
      "http://localhost:5173/auth/google/callback",
    )
    expect(redirectUriForOrigin("http://127.0.0.1:5173/", null)).toBe(
      "http://127.0.0.1:5173/auth/google/callback",
    )
    expect(redirectUriForOrigin("https://ubuntu.tail965c07.ts.net", null)).toBe(
      "https://ubuntu.tail965c07.ts.net/auth/google/callback",
    )
  })

  it("uses AUTH_REDIRECT_URI for the pages origin", () => {
    expect(redirectUriForOrigin("https://openthesystem.app", "https://10p-api.qalm.work/auth/google/callback")).toBe(
      "https://10p-api.qalm.work/auth/google/callback",
    )
    expect(() => redirectUriForOrigin("https://openthesystem.app", null)).toThrow(/AUTH_REDIRECT_URI/)
  })

  it("allows tagger and admin return paths", () => {
    expect(safeReturnPath("/tagger/A1/edit")).toBe("/tagger/A1/edit")
    expect(safeReturnPath("/admin")).toBe("/admin")
    expect(safeReturnPath("https://evil.example/tagger")).toBeNull()
    expect(safeReturnPath("//evil.example")).toBeNull()
    expect(safeReturnPath("/progress")).toBeNull()
  })

  it("matches admin emails case-insensitively", () => {
    const allow = new Set(["alexanderlperez@gmail.com"])
    expect(isAdminEmail("AlexanderLPerez@gmail.com", allow)).toBe(true)
    expect(isAdminEmail("other@gmail.com", allow)).toBe(false)
  })
})
