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

const CATALOG = {
  sections: [{ id: "A", name: "Granbys" }],
  warmups: [{
    id: "A1",
    sectionId: "A",
    title: "Kneeling",
    link: null,
    note: "",
    moves: [{ text: "Seated Granby", players: ["A"], note: null, startSec: 0 }],
  }],
}

const FRESH = {
  sections: CATALOG.sections,
  warmups: [
    { ...CATALOG.warmups[0], title: "Updated Kneeling" },
    {
      id: "Z9",
      sectionId: "A",
      title: "Late Listing",
      link: null,
      note: "",
      moves: [{ text: "Brand New Move", players: ["A"], note: null, startSec: 0 }],
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

function trainRow(id) {
  const row = Array.from(document.querySelectorAll("tr")).find(tr => {
    const label = tr.querySelector("td span")
    return label?.textContent?.trim() === id
  })
  if (!row) return false
  return Array.from(row.querySelectorAll("button")).some(button => button.textContent === "Train")
}

async function hasTrainRow(page, deckId) {
  return page.evaluate(trainRow, deckId)
}

async function waitForTrainRow(page, deckId) {
  await page.waitForFunction(trainRow, { timeout: 15000 }, deckId)
}

async function waitForFreshList(page) {
  await page.waitForFunction(() => {
    const text = document.body.innerText
    const z9 = Array.from(document.querySelectorAll("tr")).find(tr => {
      const label = tr.querySelector("td span")
      return label?.textContent?.trim() === "Z9"
    })
    return text.includes("Updated Kneeling") && !!z9
  }, { timeout: 15000 })
}

async function runCase(browser, baseUrl, { delayMs, status, expectFresh }) {
  const page = await browser.newPage()
  const marks = { started: 0, visible: 0, reconciled: 0, updated: 0, settled: false }
  await page.evaluateOnNewDocument(catalog => {
    localStorage.setItem("tp_catalog", JSON.stringify(catalog))
    localStorage.setItem("tp_schedule_onboarding_seen", "2026-08-26T00:00:00.000Z")
    localStorage.setItem("tp_whats_new_seen", "2026-07-24T18:00:00.000Z")
  }, CATALOG)
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
      // The navigation that this request belonged to was already finished.
    }
  })
  marks.started = Date.now()
  await page.goto(`${baseUrl}series/A/`, { waitUntil: "domcontentloaded", timeout: 60000 })
  await waitForTrainRow(page, "A1")
  marks.visible = Date.now()
  if (delayMs && marks.settled) {
    throw new Error("A1 painted only after the catalog response")
  }
  const deadline = Date.now() + 5000
  while (!marks.settled && Date.now() < deadline) await sleep(50)
  if (!marks.settled) throw new Error("Catalog request did not finish")
  if (!(await hasTrainRow(page, "A1"))) throw new Error("Late catalog response removed the A1 Train row")
  if (expectFresh) {
    await waitForFreshList(page)
    marks.updated = Date.now()
    if (!(await hasTrainRow(page, "A1"))) throw new Error("Fresh catalog removed the A1 Train row")
    if (!(await hasTrainRow(page, "Z9"))) throw new Error("Z9 arrived without a Train row")
  } else {
    const text = await page.evaluate(() => document.body.innerText)
    if (text.includes("Updated Kneeling") || text.includes("Z9")) {
      throw new Error("Late failure replaced the saved list")
    }
    if (!text.includes("Kneeling")) throw new Error("Saved title disappeared")
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
