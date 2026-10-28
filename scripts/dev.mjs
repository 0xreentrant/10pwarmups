import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

export function apiPort(env = process.env, envFileText = "") {
  const fromEnv = env.PORT?.trim()
  if (fromEnv) return Number(fromEnv)
  for (const line of envFileText.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    if (!trimmed.startsWith("PORT=")) continue
    const value = Number(trimmed.slice("PORT=".length).trim())
    if (value) return value
  }
  return 3101
}

export function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port })
    const finish = (open) => {
      socket.destroy()
      resolve(open)
    }
    socket.once("connect", () => finish(true))
    socket.once("error", () => finish(false))
  })
}

function readEnvFile() {
  try {
    return readFileSync(".env", "utf8")
  } catch {
    return ""
  }
}

export async function startApiIfNeeded(env = process.env, envFileText = readEnvFile()) {
  const port = apiPort(env, envFileText)
  // ponytail: a listener on this port is reused, even when dist-server is stale. Restart with `pnpm run server` after API changes.
  if (await portOpen(port)) {
    console.log(`API already on 127.0.0.1:${port}`)
    return
  }

  console.log(`Starting API on 127.0.0.1:${port}`)
  const server = spawn("pnpm", ["run", "server"], { stdio: "inherit" })
  let exitError = null
  server.once("exit", (code, signal) => {
    exitError = new Error(signal ? `API exited from ${signal}` : `API exited ${code}`)
  })

  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (exitError) throw exitError
    if (await portOpen(port)) {
      server.unref()
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  server.kill("SIGTERM")
  throw new Error(`API did not listen on 127.0.0.1:${port}`)
}

async function main() {
  try {
    await startApiIfNeeded()
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const tailscale = process.argv.includes("--tailscale")
  const viteArgs = process.argv.slice(2).filter((arg) => arg !== "--tailscale")
  const child = tailscale
    ? spawn("node", ["scripts/tailscale-dev.mjs"], { stdio: "inherit" })
    : spawn("vite", viteArgs, { stdio: "inherit" })

  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0))
  })
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) await main()
