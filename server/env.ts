export type ServerEnv = {
  port: number
  allowedOrigins: string[]
  googleClientId: string
  googleClientSecret: string
  adminEmails: Set<string>
  adminTokenSecret: string
  authRedirectUri: string | null
  warmupDb: string
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export function readServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const allowedOrigins = required(env, "ALLOWED_ORIGINS")
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
  if (allowedOrigins.length === 0) throw new Error("ALLOWED_ORIGINS is required")

  return {
    port: Number(env.PORT?.trim() || "3101"),
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
    warmupDb: env.WARMUP_DB?.trim() || "data/warmups.sqlite",
  }
}
