import { spawn } from "child_process"
import { createServer } from "net"
import puppeteer from "puppeteer"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "../..")

// Give-up ceiling for a held /api/catalog. refreshCatalog aborts at 2000ms.
// This scripted tail stays under that ceiling.
const CATALOG_TAIL_MS = 1500

const CACHED = {
  sections: [
    { id: "A", name: "Granbys" },
    { id: "special-flow", name: "Special Flows" },
  ],
  warmups: [
    {
      id: "A1",
      sectionId: "A",
      title: "Kneeling",
      link: null,
      note: "",
      moves: [{ text: "Seated Granby", players: ["A"], note: null, startSec: 0 }],
    },
    {
      id: "attack-series",
      sectionId: "special-flow",
      title: "Attack Series",
      link: null,
      note: "",
      moves: [{ text: "Full Guard", players: ["A"], note: null, startSec: null }],
    },
  ],
}

const FRESH = {
  sections: CACHED.sections,
  warmups: [
    { ...CACHED.warmups[0], title: "Updated Kneeling" },
    { ...CACHED.warmups[1], title: "Attack Series Live" },
    {
      id: "ramey-flow",
      sectionId: "special-flow",
      title: "Ramey Flow",
      link: null,
      note: "",
      moves: [{ text: "Wheelbarrow", players: ["A"], note: null, startSec: null }],
    },
  ],
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
    waitForHttp(url).then(() => resolve(proc)).catch(reject)
  })
}

function pageHasSpecialFlows(text) {
  const lower = text.toLowerCase()
  return lower.includes("special flows") && lower.includes("attack series")
}

async function waitForSpecialFlows(page) {
  await page.waitForFunction(() => {
    const text = document.body.innerText.toLowerCase()
    return text.includes("special flows") && text.includes("attack series")
  }, { timeout: 15000 })
}

async function runCase(browser, baseUrl, { delayMs, status, expectFresh }) {
  const page = await browser.newPage()
  const marks = { started: 0, visible: 0, reconciled: 0, updated: 0, settled: false }
  await page.evaluateOnNewDocument(catalog => {
    localStorage.setItem("tp_catalog", JSON.stringify(catalog))
    localStorage.setItem("tp_schedule_onboarding_seen", "2026-08-26T00:00:00.000Z")
    localStorage.setItem("tp_whats_new_seen", "2026-07-24T18:00:00.000Z")
  }, CACHED)
  await page.setRequestInterception(true)
  page.on("request", async req => {
    try {
      if (req.url().includes("/api/catalog")) {
        if (delayMs) await sleep(delayMs)
        marks.reconciled = Date.now()
        marks.settled = true
        await req.respond({
          status,
          contentType: "application/json",
          body: status === 200 ? JSON.stringify(FRESH) : "nope",
        })
        return
      }
      await req.continue()
    } catch {
      // Navigation finished before respond.
    }
  })
  marks.started = Date.now()
  await page.goto(`${baseUrl}all/`, { waitUntil: "domcontentloaded", timeout: 60000 })
  await waitForSpecialFlows(page)
  marks.visible = Date.now()
  if (delayMs && marks.settled) {
    throw new Error("Special Flows painted only after the catalog response")
  }
  const deadline = Date.now() + 5000
  while (!marks.settled && Date.now() < deadline) await sleep(50)
  if (!marks.settled) throw new Error("Catalog request did not finish")
  const afterReconcile = await page.evaluate(() => document.body.innerText)
  if (!pageHasSpecialFlows(afterReconcile)) {
    throw new Error("Late catalog response removed Special Flows")
  }
  if (expectFresh) {
    await page.waitForFunction(() => {
      const text = document.body.innerText.toLowerCase()
      return text.includes("attack series live") && text.includes("ramey flow") && text.includes("special flows")
    }, { timeout: 15000 })
    marks.updated = Date.now()
    const freshText = await page.evaluate(() => document.body.innerText)
    if (!pageHasSpecialFlows(freshText)) throw new Error("Fresh catalog removed Special Flows")
    if (!freshText.toLowerCase().includes("ramey flow")) throw new Error("Ramey Flow did not arrive under Special Flows")
  } else {
    const lower = afterReconcile.toLowerCase()
    if (lower.includes("attack series live") || lower.includes("ramey flow")) {
      throw new Error("Late failure replaced the saved Special Flows list")
    }
    if (!lower.includes("attack series")) throw new Error("Cached Attack Series disappeared")
  }
  await page.close()
  return {
    visibleMs: marks.visible - marks.started,
    reconcileMs: marks.reconciled - marks.started,
    ...(expectFresh ? { updatedMs: marks.updated - marks.started } : {}),
  }
}

async function main() {
  const port = await getFreePort()
  const baseUrl = `http://127.0.0.1:${port}/`
  const preview = await startPreview(port)
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  try {
    const golden = await runCase(browser, baseUrl, { delayMs: 0, status: 200, expectFresh: true })
    const tail = await runCase(browser, baseUrl, { delayMs: CATALOG_TAIL_MS, status: 200, expectFresh: true })
    const failed = await runCase(browser, baseUrl, { delayMs: CATALOG_TAIL_MS, status: 500, expectFresh: false })
    console.log(JSON.stringify({ golden, tail, failed }))
  } finally {
    await browser.close()
    preview.kill("SIGTERM")
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
