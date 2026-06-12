import { spawn } from "child_process"
import { createServer } from "net"
import puppeteer from "puppeteer"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

const A1_MOVES = [
  "Kneeling Granby",
  "Seated Granby",
  "Bridging Granby",
  "Belly to Belly Granby",
  "Granby Flow",
]

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

async function clickOptionWithText(page, text) {
  const clicked = await page.evaluate(target => {
    const btn = Array.from(document.querySelectorAll("button.option-btn"))
      .find(b => b.textContent.includes(target))
    if (!btn) return false
    btn.click()
    return true
  }, text)
  if (!clicked) throw new Error(`No option button found for "${text}"`)
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
    await page.reload({ waitUntil: "domcontentloaded" })
    await waitForServiceWorker(page)

    await setOffline(page, true)
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.waitForFunction(() => document.body.textContent.includes("10th Planet"), { timeout: 15000 })

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Train")
      if (!btn) throw new Error("Train button not found")
      btn.click()
    })

    await page.waitForSelector("button.option-btn")
    for (const move of A1_MOVES) {
      await clickOptionWithText(page, move)
      await new Promise(r => setTimeout(r, 50))
    }

    await page.waitForFunction(() => /Perfect|Complete|Try Again/.test(document.body.textContent), { timeout: 15000 })

    const progress = await page.evaluate(() => localStorage.getItem("tp_progress"))
    if (!progress) throw new Error("Progress not saved to localStorage")
    const parsed = JSON.parse(progress)
    if (!parsed.A1?.attempts?.length) throw new Error("A1 attempt not recorded")

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
