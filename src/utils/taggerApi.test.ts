import { afterEach, describe, expect, it } from "vitest"
import { captureAdminHash, clearAdminToken, googleSignInHref, readAdminToken, taggerNeedsGoogleLogin } from "./taggerApi"

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

  it("asks for Google until a token or OAuth hash is present", () => {
    expect(taggerNeedsGoogleLogin("")).toBe(true)
    localStorage.setItem("tp_admin_token", "abc.def")
    expect(taggerNeedsGoogleLogin("")).toBe(false)
    localStorage.clear()
    expect(taggerNeedsGoogleLogin("#admin_token=abc.def")).toBe(false)
    expect(taggerNeedsGoogleLogin("#admin_error=not_admin")).toBe(false)
  })

  it("drops an expired token and asks for Google", () => {
    const payload = btoa(JSON.stringify({ email: "a@b.c", exp: Date.now() - 1000 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
    localStorage.setItem("tp_admin_token", `${payload}.sig`)
    expect(readAdminToken()).toBeNull()
    expect(localStorage.getItem("tp_admin_token")).toBeNull()
    expect(taggerNeedsGoogleLogin("")).toBe(true)
  })

  it("builds a same-origin sign-in link when the api base is unset", () => {
    expect(googleSignInHref("/tagger/A1/edit", "http://localhost:5173")).toBe(
      "/auth/google?return=%2Ftagger%2FA1%2Fedit&origin=http%3A%2F%2Flocalhost%3A5173",
    )
  })
})
