const ADMIN_TOKEN_KEY = "tp_admin_token"

export function taggerApiBase(): string {
  const raw = import.meta.env.VITE_TAGGER_API_URL
  return typeof raw === "string" ? raw.replace(/\/$/, "") : ""
}

export function readAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function captureAdminHash(): "token" | "not_admin" | "not_verified" | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  const token = params.get("admin_token")
  const error = params.get("admin_error")
  if (!token && !error) return null
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
  const url = new URL(window.location.href)
  url.hash = ""
  window.history.replaceState(null, "", `${url.pathname}${url.search}`)
  if (error === "not_admin") return "not_admin"
  if (error === "not_verified") return "not_verified"
  if (token) return "token"
  return null
}

export function googleSignInHref(returnPath: string, origin: string): string {
  const q = new URLSearchParams({ return: returnPath, origin })
  return `${taggerApiBase()}/auth/google?${q.toString()}`
}

export function committedSaveNotice(): string | null {
  if (!taggerApiBase()) return null
  return "Committed. Live site updates after the Pages deploy finishes."
}

export async function postTaggerApi(path: string, body: unknown): Promise<void> {
  const token = readAdminToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${taggerApiBase()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    clearAdminToken()
    throw new Error("Sign in with Google")
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? "Save failed")
  }
}
