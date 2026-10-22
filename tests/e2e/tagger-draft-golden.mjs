import puppeteer from "puppeteer"

const BASE = "http://127.0.0.1:5173"
// Give-up ceiling for a held save-json. A real save can sit longer; this only
// bounds the scripted tail, and it stays under loadCatalog's 2s abort.
const SAVE_TAIL_MS = 1500

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function fail(message) {
  throw new Error(message)
}

async function openEditor(browser, saveDelayMs) {
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  const marks = { saveStarted: 0, saveFinished: 0, saves: 0 }
  await page.setRequestInterception(true)
  page.on("request", async req => {
    const url = req.url()
    try {
      if (req.method() === "POST" && url.includes("/api/tagger/save-json")) {
        marks.saves += 1
        marks.saveStarted = Date.now()
        if (saveDelayMs) await sleep(saveDelayMs)
        marks.saveFinished = Date.now()
        await req.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ deckId: "A1" }),
        })
        return
      }
      await req.continue()
    } catch {
      // The navigation that this request belonged to was already finished.
    }
  })
  await page.goto(`${BASE}/series/A`, { waitUntil: "domcontentloaded", timeout: 30000 })
  await page.evaluate(() => {
    localStorage.setItem("tp_admin_token", "draft.token")
    localStorage.removeItem("tp_tagger_json_drafts")
    localStorage.setItem("tp_schedule_onboarding_seen", "2026-08-26T00:00:00.000Z")
    localStorage.setItem("tp_whats_new_seen", "2026-08-31T18:00:00.000Z")
  })
  await page.goto(`${BASE}/tagger/A1/edit`, { waitUntil: "domcontentloaded", timeout: 30000 })
  await page.waitForFunction(
    () => document.body.innerText.includes("Seated Granby"),
    { timeout: 20000 },
  )
  return { page, marks }
}

async function addMove(page, label) {
  await page.click('button[aria-label="Add move"]')
  await page.waitForFunction(
    name => document.body.innerText.includes(name),
    { timeout: 5000 },
    label,
  )
  await page.evaluate(() => {
    const dialog = document.querySelector("dialog[open]")
    const save = [...dialog.querySelectorAll("button")].find(button => button.textContent.trim() === "Save")
    save.click()
  })
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), { timeout: 5000 })
  await page.waitForFunction(
    name => (localStorage.getItem("tp_tagger_json_drafts") || "").includes(name),
    { timeout: 5000 },
    label,
  )
}

async function clickJsonSave(page) {
  const clicked = await page.evaluate(() => {
    const save = [...document.querySelectorAll("button")].find(
      button => button.textContent.trim() === "Save" && !button.closest("dialog"),
    )
    if (!save || save.disabled) return false
    save.click()
    return true
  })
  if (!clicked) fail("JSON Save was missing or disabled")
}

async function hasMove(page, label) {
  return page.evaluate(name => document.body.innerText.includes(name), label)
}

async function golden(browser) {
  const { page, marks } = await openEditor(browser, 0)
  const t0 = Date.now()
  await page.click('button[aria-label="Add move"]')
  await page.waitForFunction(
    () => document.body.innerText.includes("Move 6"),
    { timeout: 5000 },
  )
  const visibleMs = Date.now() - t0
  await page.waitForFunction(
    () => (localStorage.getItem("tp_tagger_json_drafts") || "").includes("Move 6"),
    { timeout: 5000 },
  )
  const draftMs = Date.now() - t0
  if (marks.saves !== 0) fail("golden path posted save-json before the user saved")
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForFunction(
    () => document.body.innerText.includes("Move 6"),
    { timeout: 20000 },
  )
  const reloadMs = Date.now() - t0
  if (!(await hasMove(page, "Move 6"))) fail("reload dropped the unsaved move")
  await page.close()
  return { visibleMs, draftMs, reloadMs }
}

async function tail(browser) {
  const { page, marks } = await openEditor(browser, SAVE_TAIL_MS)
  await addMove(page, "Move 6")
  const t0 = Date.now()
  await clickJsonSave(page)
  await page.waitForFunction(() => {
    const save = [...document.querySelectorAll("button")].find(
      button => !button.closest("dialog") && button.textContent.includes("Saving"),
    )
    return !!save
  }, { timeout: 5000 })
  await addMove(page, "Move 7")
  const visibleMs = Date.now() - t0
  if (marks.saveFinished) fail("Move 7 landed after save-json already returned")
  await page.waitForFunction(() => {
    const save = [...document.querySelectorAll("button")].find(
      button => button.textContent.trim() === "Save" && !button.closest("dialog"),
    )
    return !!save
  }, { timeout: SAVE_TAIL_MS + 5000 })
  const reconcileMs = marks.saveFinished ? marks.saveFinished - t0 : Date.now() - t0
  if (!(await hasMove(page, "Move 7"))) fail("late save-json removed Move 7")
  await sleep(200)
  if (!(await hasMove(page, "Move 7"))) fail("late save-json removed Move 7 after settle")
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForFunction(
    () => document.body.innerText.includes("Seated Granby"),
    { timeout: 20000 },
  )
  if (!(await hasMove(page, "Move 7"))) fail("reload after late save-json dropped Move 7")
  if (!(await hasMove(page, "Move 6"))) fail("reload after late save-json dropped Move 6")
  await page.close()
  return { visibleMs, reconcileMs }
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
})

try {
  const goldenResult = await golden(browser)
  const tailResult = await tail(browser)
  console.log(JSON.stringify({ golden: goldenResult, tail: tailResult }, null, 2))
} finally {
  await browser.close()
}
