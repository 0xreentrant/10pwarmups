import { describe, expect, it } from "vitest"
import { signAdminToken, verifyAdminToken } from "./token"

const secret = "test-secret"

describe("admin token", () => {
  it("round-trips a signed token", () => {
    const now = 1_700_000_000_000
    const token = signAdminToken("alexanderlperez@gmail.com", secret, now)
    expect(verifyAdminToken(token, secret, now + 1000)).toEqual({
      email: "alexanderlperez@gmail.com",
    })
  })

  it("rejects a tampered payload", () => {
    const token = signAdminToken("alexanderlperez@gmail.com", secret)
    const [, sig] = token.split(".")
    const forged = Buffer.from(JSON.stringify({ email: "other@gmail.com", exp: Date.now() + 60_000 })).toString("base64url")
    expect(verifyAdminToken(`${forged}.${sig}`, secret)).toBeNull()
  })

  it("rejects an expired token", () => {
    const now = 1_700_000_000_000
    const token = signAdminToken("alexanderlperez@gmail.com", secret, now)
    expect(verifyAdminToken(token, secret, now + 13 * 60 * 60 * 1000)).toBeNull()
  })
})
