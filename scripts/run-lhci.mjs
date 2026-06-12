import { spawn } from "child_process"
import { createServer } from "net"
import path from "path"
import { fileURLToPath } from "url"
import waitOn from "wait-on"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on("error", reject)
  })
}

function waitForPreviewServer(proc, port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Preview server did not start")), 30000)
    const checkReady = chunk => {
      const text = chunk.toString()
      if (text.includes(`localhost:${port}`)) {
        clearTimeout(timeout)
        proc.stdout.off("data", checkReady)
        proc.stderr.off("data", checkReady)
        resolve()
      }
    }
    proc.stdout.on("data", checkReady)
    proc.stderr.on("data", checkReady)
    proc.on("exit", code => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout)
        reject(new Error(`Preview server exited with code ${code}`))
      }
    })
  })
}

function startPreview(port) {
  const viteBin = path.join(root, "node_modules", ".bin", "vite")
  const proc = spawn(viteBin, ["preview", "--port", String(port), "--strictPort"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  })
  return waitForPreviewServer(proc, port).then(() => proc)
}

function runLhci(url) {
  return new Promise((resolve, reject) => {
    const lhciBin = path.join(root, "node_modules", ".bin", "lhci")
    const proc = spawn(lhciBin, ["autorun", `--collect.url=${url}`], {
      cwd: root,
      stdio: "inherit",
    })
    proc.on("exit", code => {
      if (code === 0) resolve()
      else reject(new Error(`Lighthouse CI exited with code ${code}`))
    })
  })
}

async function main() {
  const port = await getFreePort()
  const url = `http://localhost:${port}/`
  const preview = await startPreview(port)

  try {
    await waitOn({ resources: [`http-get://127.0.0.1:${port}/`], timeout: 30000 })
    await runLhci(url)
    console.log("Lighthouse CI passed")
  } finally {
    preview.kill("SIGTERM")
  }
}

main().catch(err => {
  console.error("Lighthouse CI failed:", err)
  process.exit(1)
})
