import { afterEach, describe, expect, it } from "vitest"
import { captureAdminHash, clearAdminToken, googleSignInHref, readAdminToken } from "./taggerApi"

describe("tagger admin session", () => {
  afterEach(() => {
    localStorage.clear()
    window.history.replaceState(null, "", "/tagger/A1/edit")
  })

  it("stores the token from the hash and strips it", () => {
    window.location.hash = "#admin_token=abc.def"
    expect(captureAdminHash()).toBe("token")
    expect(readAdminToken()).toBe("abc.def")
    expect(window.location.hash).toBe("")
  })

  it("clears the stored admin token", () => {
    localStorage.setItem("tp_admin_token", "abc.def")
    clearAdminToken()
    expect(readAdminToken()).toBeNull()
  })

  it("builds a same-origin sign-in link when the api base is unset", () => {
    expect(googleSignInHref("/tagger/A1/edit", "http://localhost:5173")).toBe(
      "/auth/google?return=%2Ftagger%2FA1%2Fedit&origin=http%3A%2F%2Flocalhost%3A5173",
    )
  })
})
