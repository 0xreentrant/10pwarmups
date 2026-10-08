import { createHmac, timingSafeEqual } from "node:crypto"

const TTL_MS = 12 * 60 * 60 * 1000

export function signAdminToken(email: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: now + TTL_MS })).toString("base64url")
  const sig = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export function verifyAdminToken(
  token: string,
  secret: string,
  now = Date.now(),
): { email: string } | null {
  const dot = token.indexOf(".")
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!payload || !sig) return null
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let body: { email?: unknown; exp?: unknown }
  try {
    body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown
      exp?: unknown
    }
  } catch {
    return null
  }
  if (typeof body.email !== "string" || typeof body.exp !== "number") return null
  if (body.exp <= now) return null
  return { email: body.email }
}
