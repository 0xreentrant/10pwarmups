import { spawn } from "child_process"
import { createServer } from "net"
import puppeteer from "puppeteer"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

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

function waitForHttp(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const poll = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve()
      } catch {}
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Server did not respond at ${url}`))
        return
      }
      setTimeout(poll, 250)
    }
    poll()
  })
}

function startPreview(port) {
  const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js")
  const host = "127.0.0.1"
  const url = `http://${host}:${port}/`

  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [
      viteBin,
      "preview",
      "--host", host,
      "--port", String(port),
      "--strictPort",
    ], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stderr = ""
    proc.stderr.on("data", chunk => { stderr += chunk.toString() })
    proc.on("exit", code => {
      if (code !== null && code !== 0) {
        reject(new Error(`Preview server exited with code ${code}: ${stderr}`))
      }
    })

    waitForHttp(url)
      .then(() => resolve(proc))
      .catch(reject)
  })
}

async function waitForServiceWorker(page) {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("Service workers not supported")
    await navigator.serviceWorker.ready
  })
}

async function setOffline(page, offline) {
  const client = await page.createCDPSession()
  await client.send("Network.enable")
  await client.send("Network.emulateNetworkConditions", {
    offline,
    downloadThroughput: offline ? 0 : -1,
    uploadThroughput: offline ? 0 : -1,
    latency: 0,
  })
}

/** Skip intro overlays so the offline schedule is visible. */
async function skipHomeOverlays(page) {
  await page.evaluate(() => {
    localStorage.setItem("tp_schedule_onboarding_seen", "2026-08-26T00:00:00.000Z")
    localStorage.setItem("tp_whats_new_seen", "2026-07-24T18:00:00.000Z")
  })
}

async function runOfflineE2E() {
  const port = await getFreePort()
  const baseUrl = `http://127.0.0.1:${port}/`
  const preview = await startPreview(port)
  let browser

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    })
    const page = await browser.newPage()

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
    await waitForServiceWorker(page)
    await skipHomeOverlays(page)
    await page.goto(`${baseUrl}series/A/`, { waitUntil: "domcontentloaded", timeout: 60000 })
    await waitForServiceWorker(page)
    await page.reload({ waitUntil: "domcontentloaded" })
    await waitForServiceWorker(page)

    await setOffline(page, true)
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.waitForFunction(() => document.body.textContent.includes("10th Planet"), { timeout: 15000 })

    const scheduleReady = await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll("tr")).find(tr => {
        const label = tr.querySelector("td span")
        return label?.textContent?.trim() === "A1"
      })
      if (!row) return false
      return Array.from(row.querySelectorAll("button")).some(b => b.textContent === "Train")
    })
    if (!scheduleReady) throw new Error("Offline schedule did not show the A1 Train row")

    console.log("E2E offline test passed")
  } finally {
    if (browser) await browser.close()
    preview.kill("SIGTERM")
  }
}

runOfflineE2E().catch(err => {
  console.error("E2E offline test failed:", err)
  process.exit(1)
})
