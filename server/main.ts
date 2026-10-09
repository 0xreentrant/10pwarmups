import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { generateCodeVerifier, generateState, Google } from "arctic"
import { DatabaseSync } from "node:sqlite"
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
import { readServerEnv, type ServerEnv } from "./env"
import { isAdminEmail, redirectUriForOrigin, safeReturnPath } from "./origins"
import { signAdminToken, verifyAdminToken } from "./token"

const OAUTH_COOKIE = "tp_oauth"
const TOKEN_TTL_SEC = 600

type OAuthCookie = {
  state: string
  codeVerifier: string
  returnPath: string
  returnOrigin: string
  redirectUri: string
}

type GoogleProfile = {
  sub?: string
  email?: string
  email_verified?: boolean
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on("data", chunk => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buf.length
      if (size > 1_000_000) {
        reject(new Error("Body too large"))
        req.destroy()
        return
      }
      chunks.push(buf)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function cookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim())
  }
  return out
}

function setCookie(res: ServerResponse, value: string, secure: boolean, maxAge: number) {
  const parts = [
    `${OAUTH_COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ]
  if (secure) parts.push("Secure")
  res.setHeader("Set-Cookie", parts.join("; "))
}

function applyCors(req: IncomingMessage, res: ServerResponse, env: ServerEnv): boolean {
  const origin = req.headers.origin
  if (typeof origin === "string" && env.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
  }
  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return true
  }
  return false
}

function bearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) return null
  return header.slice("Bearer ".length).trim() || null
}

function requireAdmin(req: IncomingMessage, res: ServerResponse, env: ServerEnv): string | null {
  const token = bearer(req)
  if (!token) {
    sendJson(res, 401, { error: "Sign in with Google" })
    return null
  }
  const session = verifyAdminToken(token, env.adminTokenSecret)
  if (!session || !isAdminEmail(session.email, env.adminEmails)) {
    sendJson(res, 401, { error: "Sign in with Google" })
    return null
  }
  return session.email
}

function redirect(res: ServerResponse, location: string) {
  res.statusCode = 302
  res.setHeader("Location", location)
  res.end()
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error("google_userinfo_failed")
  return (await response.json()) as GoogleProfile
}

function requireText(value: unknown, message: string): string {
  if (typeof value !== "string") throw new Error(message)
  return value
}

async function handleAuthGoogle(reqUrl: URL, res: ServerResponse, env: ServerEnv) {
  const returnPath = safeReturnPath(reqUrl.searchParams.get("return"))
  const origin = reqUrl.searchParams.get("origin")?.replace(/\/$/, "") ?? ""
  if (!returnPath) {
    sendJson(res, 400, { error: "return path is not allowed" })
    return
  }
  if (!env.allowedOrigins.includes(origin)) {
    sendJson(res, 400, { error: "origin is not allowed" })
    return
  }
  let redirectUri: string
  try {
    redirectUri = redirectUriForOrigin(origin, env.authRedirectUri)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Redirect URI missing"
    sendJson(res, 500, { error: message })
    return
  }

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const google = new Google(env.googleClientId, env.googleClientSecret, redirectUri)
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"])
  const payload: OAuthCookie = { state, codeVerifier, returnPath, returnOrigin: origin, redirectUri }
  const secure = origin.startsWith("https://")
  setCookie(res, Buffer.from(JSON.stringify(payload)).toString("base64url"), secure, TOKEN_TTL_SEC)
  redirect(res, url.toString())
}

async function handleAuthCallback(req: IncomingMessage, reqUrl: URL, res: ServerResponse, env: ServerEnv) {
  const code = reqUrl.searchParams.get("code")
  const state = reqUrl.searchParams.get("state")
  const raw = cookies(req)[OAUTH_COOKIE]
  let stored: OAuthCookie | null = null
  if (raw) {
    try {
      stored = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthCookie
    } catch {
      stored = null
    }
  }
  setCookie(res, "", stored?.returnOrigin.startsWith("https://") ?? false, 0)
  if (!code || !state || !stored) {
    sendJson(res, 401, { error: "OAuth state missing" })
    return
  }
  if (stored.state !== state || !env.allowedOrigins.includes(stored.returnOrigin)) {
    sendJson(res, 401, { error: "OAuth state mismatch" })
    return
  }

  const google = new Google(env.googleClientId, env.googleClientSecret, stored.redirectUri)
  const tokens = await google.validateAuthorizationCode(code, stored.codeVerifier)
  const profile = await fetchGoogleProfile(tokens.accessToken())
  const back = (error: string) => redirect(res, `${stored.returnOrigin}${stored.returnPath}#admin_error=${error}`)
  if (!profile.email_verified || !profile.email || !profile.sub) {
    back("not_verified")
    return
  }
  if (!isAdminEmail(profile.email, env.adminEmails)) {
    back("not_admin")
    return
  }
  const token = signAdminToken(profile.email.toLowerCase(), env.adminTokenSecret)
  redirect(res, `${stored.returnOrigin}${stored.returnPath}#admin_token=${encodeURIComponent(token)}`)
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse, env: ServerEnv, db: DatabaseSync) {
  if (applyCors(req, res, env)) return
  const reqUrl = new URL(req.url ?? "/", "http://127.0.0.1")
  try {
    if (req.method === "GET" && reqUrl.pathname === "/auth/google") {
      await handleAuthGoogle(reqUrl, res, env)
      return
    }
    if (req.method === "GET" && reqUrl.pathname === "/auth/google/callback") {
      await handleAuthCallback(req, reqUrl, res, env)
      return
    }
    if (req.method === "GET" && reqUrl.pathname === "/api/catalog") {
      sendJson(res, 200, readCatalog(db))
      return
    }
    const sectionPatch = reqUrl.pathname.match(/^\/api\/catalog\/sections\/([^/]+)$/)
    const warmupPatch = reqUrl.pathname.match(/^\/api\/catalog\/warmups\/([^/]+)$/)
    if (req.method === "POST" && reqUrl.pathname === "/api/catalog/sections") {
      if (!requireAdmin(req, res, env)) return
      const body = JSON.parse(await readBody(req)) as { id?: unknown; name?: unknown }
      createSection(db, requireText(body.id, "Missing id"), requireText(body.name, "Missing name"))
      sendJson(res, 200, readCatalog(db))
      return
    }
    if (req.method === "PATCH" && sectionPatch) {
      if (!requireAdmin(req, res, env)) return
      const body = JSON.parse(await readBody(req)) as { name?: unknown }
      renameSection(db, decodeURIComponent(sectionPatch[1]), requireText(body.name, "Missing name"))
      sendJson(res, 200, readCatalog(db))
      return
    }
    if (req.method === "POST" && reqUrl.pathname === "/api/catalog/warmups") {
      if (!requireAdmin(req, res, env)) return
      const body = JSON.parse(await readBody(req)) as { title?: unknown; sectionId?: unknown }
      createWarmup(db, requireText(body.title, "Missing title"), requireText(body.sectionId, "Missing sectionId"))
      sendJson(res, 200, readCatalog(db))
      return
    }
    if (req.method === "PATCH" && warmupPatch) {
      if (!requireAdmin(req, res, env)) return
      const body = JSON.parse(await readBody(req)) as { title?: unknown; sectionId?: unknown }
      updateWarmup(
        db,
        decodeURIComponent(warmupPatch[1]),
        requireText(body.title, "Missing title"),
        requireText(body.sectionId, "Missing sectionId"),
      )
      sendJson(res, 200, readCatalog(db))
      return
    }
    if (req.method === "POST" && reqUrl.pathname === "/api/tagger/save-json") {
      if (!requireAdmin(req, res, env)) return
      const body = JSON.parse(await readBody(req)) as { jsonText?: unknown }
      sendJson(res, 200, saveTaggerJson(db, requireText(body.jsonText, "Missing jsonText")))
      return
    }
    if (req.method === "POST" && reqUrl.pathname === "/api/tagger/save-note") {
      if (!requireAdmin(req, res, env)) return
      const body = JSON.parse(await readBody(req)) as { deckId?: unknown; noteText?: unknown }
      const deckId = requireText(body.deckId, "Missing deckId")
      saveTaggerNote(db, deckId, requireText(body.noteText, "Missing noteText"))
      sendJson(res, 200, { deckId })
      return
    }
    sendJson(res, 404, { error: "Not found" })
  } catch (err) {
    if (res.headersSent || res.writableEnded) return
    const message = err instanceof Error ? err.message : "Request failed"
    sendJson(res, 400, { error: message })
  }
}

export function startServer(env: ServerEnv) {
  const db = openCatalog(env.warmupDb)
  return createServer((req, res) => {
    void handleRequest(req, res, env, db)
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const env = readServerEnv()
  startServer(env).listen(env.port, "127.0.0.1", () => {
    console.log(`tagger api http://127.0.0.1:${env.port} db=${env.warmupDb}`)
  })
}
