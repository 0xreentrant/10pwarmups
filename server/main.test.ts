import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { ServerEnv } from "./env"
import { startServer } from "./main"
import { signAdminToken } from "./token"

const env: ServerEnv = {
  port: 0,
  taggerSave: "fs",
  allowedOrigins: ["http://localhost:5173", "https://openthesystem.app"],
  googleClientId: "test-client",
  googleClientSecret: "test-secret",
  adminEmails: new Set(["alexanderlperez@gmail.com"]),
  adminTokenSecret: "test-secret",
  authRedirectUri: "https://10p-api.qalm.work/auth/google/callback",
  githubToken: null,
  githubRepo: "0xreentrant/10pwarmups",
  githubBranch: "main",
}

let base = ""
const server = startServer(env)

beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  base = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()))
  })
})

describe("tagger api", () => {
  it("starts Google login on an allowlisted localhost origin", async () => {
    const res = await fetch(
      `${base}/auth/google?return=${encodeURIComponent("/tagger/A1/edit")}&origin=${encodeURIComponent("http://localhost:5173")}`,
      { redirect: "manual" },
    )
    expect(res.status).toBe(302)
    const location = new URL(res.headers.get("location") ?? "")
    expect(location.hostname).toBe("accounts.google.com")
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost:5173/auth/google/callback")
    expect(location.searchParams.get("client_id")).toBe("test-client")
    expect(res.headers.get("set-cookie")).toContain("tp_oauth=")
  })

  it("uses the prod callback when the browser is on the pages origin", async () => {
    const res = await fetch(
      `${base}/auth/google?return=/tagger/A1/edit&origin=${encodeURIComponent("https://openthesystem.app")}`,
      { redirect: "manual" },
    )
    const location = new URL(res.headers.get("location") ?? "")
    expect(location.searchParams.get("redirect_uri")).toBe("https://10p-api.qalm.work/auth/google/callback")
  })

  it("rejects a callback whose state does not match the cookie", async () => {
    const start = await fetch(
      `${base}/auth/google?return=/tagger/A1/edit&origin=${encodeURIComponent("http://localhost:5173")}`,
      { redirect: "manual" },
    )
    const cookie = start.headers.get("set-cookie")?.split(";")[0]
    const res = await fetch(`${base}/auth/google/callback?code=x&state=nope`, {
      headers: cookie ? { cookie } : {},
      redirect: "manual",
    })
    expect(res.status).toBe(401)
  })

  it("rejects a save without a token and accepts an admin token up to validation", async () => {
    const missing = await fetch(`${base}/api/tagger/save-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
    expect(missing.status).toBe(401)

    const token = signAdminToken("other@gmail.com", env.adminTokenSecret)
    const stranger = await fetch(`${base}/api/tagger/save-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{}",
    })
    expect(stranger.status).toBe(401)

    const admin = signAdminToken("alexanderlperez@gmail.com", env.adminTokenSecret)
    const bad = await fetch(`${base}/api/tagger/save-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin}` },
      body: "{}",
    })
    expect(bad.status).toBe(400)
    const body = (await bad.json()) as { error?: string }
    expect(body.error).toMatch(/jsonText|Invalid JSON|Missing/)
  })
})
