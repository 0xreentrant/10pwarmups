export function isAdminEmail(email: string, allowlist: Set<string>): boolean {
  return allowlist.has(email.trim().toLowerCase())
}

export function safeReturnPath(value: string | null): string | null {
  if (!value || value.startsWith("//")) return null
  if (value.includes("\\") || value.includes("://")) return null
  if (value === "/admin" || value.startsWith("/admin/") || value.startsWith("/tagger")) return value
  return null
}

export function sameOriginCallback(origin: string): boolean {
  const host = new URL(origin).hostname
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".ts.net")
}

export function redirectUriForOrigin(origin: string, authRedirectUri: string | null): string {
  const normalized = origin.replace(/\/$/, "")
  if (sameOriginCallback(normalized)) return `${normalized}/auth/google/callback`
  if (!authRedirectUri) throw new Error("AUTH_REDIRECT_URI is required")
  return authRedirectUri
}
