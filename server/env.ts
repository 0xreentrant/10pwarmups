export type TaggerSaveMode = "fs" | "github"

export type ServerEnv = {
  port: number
  taggerSave: TaggerSaveMode
  allowedOrigins: string[]
  googleClientId: string
  googleClientSecret: string
  adminEmails: Set<string>
  adminTokenSecret: string
  authRedirectUri: string | null
  githubToken: string | null
  githubRepo: string
  githubBranch: string
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const taggerSave = env.TAGGER_SAVE?.trim() || "fs"
  if (taggerSave !== "fs" && taggerSave !== "github") {
    throw new Error("TAGGER_SAVE must be fs or github")
  }
  const allowedOrigins = required(env, "ALLOWED_ORIGINS")
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
  if (allowedOrigins.length === 0) throw new Error("ALLOWED_ORIGINS is required")

  const githubToken = env.GITHUB_TOKEN?.trim() || null
  if (taggerSave === "github" && !githubToken) throw new Error("GITHUB_TOKEN is required")

  return {
    port: Number(env.PORT?.trim() || "3101"),
    taggerSave,
    allowedOrigins,
    googleClientId: required(env, "GOOGLE_CLIENT_ID"),
    googleClientSecret: required(env, "GOOGLE_CLIENT_SECRET"),
    adminEmails: new Set(
      required(env, "ADMIN_EMAILS")
        .split(",")
        .map(email => email.trim().toLowerCase())
        .filter(Boolean),
    ),
    adminTokenSecret: required(env, "ADMIN_TOKEN_SECRET"),
    authRedirectUri: env.AUTH_REDIRECT_URI?.trim() || null,
    githubToken,
    githubRepo: env.GITHUB_REPO?.trim() || "0xreentrant/10pwarmups",
    githubBranch: env.GITHUB_BRANCH?.trim() || "main",
  }
}
