import puppeteer from "puppeteer"

const BASE = "http://127.0.0.1:5174"
// loadCatalog aborts /api/catalog at 2000ms. The scripted tail stays under that ceiling.
const CATALOG_TAIL_MS = 1500

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function watchEditor(page, bag) {
  const timer = setInterval(() => {
    page
      .evaluate(() => document.body?.textContent?.includes("Log out") ?? false)
      .then(hit => {
        if (hit) bag.saw = true
      })
      .catch(() => {})
  }, 40)
  return () => clearInterval(timer)
}

async function openTaggedPage(browser, delays) {
  const page = await browser.newPage()
  await page.setCacheEnabled(false)
  const marks = { authUrl: "", googleAt: 0, catalogAt: 0 }
  const editor = { saw: false }
  await page.setRequestInterception(true)
  page.on("request", async req => {
    const url = req.url()
    try {
      const host = new URL(url).hostname
      if (host === "accounts.google.com") {
        if (delays.googleMs) await sleep(delays.googleMs)
        marks.googleAt = Date.now()
        await req.respond({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: "<!doctype html><title>Google</title><h1>Google sign-in</h1>",
        })
        return
      }
      if (delays.catalogMs && url.includes("/api/catalog")) {
        await sleep(delays.catalogMs)
        marks.catalogAt = Date.now()
      }
      if (url.includes("/auth/google") && !url.includes("/auth/google/callback")) {
        marks.authUrl = url
      }
      await req.continue()
    } catch {
      // The navigation that this request belonged to was already finished.
    }
  })
  const stopWatch = await watchEditor(page, editor)
  return { page, marks, editor, stopWatch }
}

async function assertSignedOutRedirect(page, marks, editor, started) {
  await page.goto(`${BASE}/tagger`, { waitUntil: "domcontentloaded", timeout: 30000 })
  await page.waitForFunction(
    () => document.querySelector("h1")?.textContent === "Google sign-in",
    { timeout: 20000 },
  )
  const visibleMs = Date.now() - started
  if (editor.saw) throw new Error("Tagger editor painted before Google sign-in")
  const auth = new URL(marks.authUrl)
  const returnPath = auth.searchParams.get("return")
  if (returnPath !== "/tagger/A1/edit") {
    throw new Error(`Expected return /tagger/A1/edit, got ${returnPath} from ${marks.authUrl}`)
  }
  if (new URL(page.url()).hostname !== "accounts.google.com") {
    throw new Error(`Expected Google host, got ${page.url()}`)
  }
  return visibleMs
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })
  try {
    const goldenStarted = Date.now()
    const golden = await openTaggedPage(browser, { googleMs: 0, catalogMs: 0 })
    const goldenVisibleMs = await assertSignedOutRedirect(
      golden.page,
      golden.marks,
      golden.editor,
      goldenStarted,
    )
    golden.stopWatch()
    await golden.page.close()

    const tailStarted = Date.now()
    const tail = await openTaggedPage(browser, { googleMs: 0, catalogMs: CATALOG_TAIL_MS })
    const tailRedirectMs = await assertSignedOutRedirect(
      tail.page,
      tail.marks,
      tail.editor,
      tailStarted,
    )
    if (!tail.marks.catalogAt) throw new Error("Tail catalog request did not finish")
    if (tail.editor.saw) throw new Error("Late catalog painted the tagger editor")

    const returnStarted = Date.now()
    tail.marks.catalogAt = 0
    tail.editor.saw = false
    await tail.page.goto(`${BASE}/tagger/A1/edit#admin_token=late.token`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    })
    try {
      await tail.page.waitForFunction(
        () => document.body.textContent.includes("Log out"),
        { timeout: 20000 },
      )
    } catch (err) {
      const info = await tail.page.evaluate(() => ({
        href: location.href,
        text: document.body?.innerText?.slice(0, 400) ?? "",
        token: localStorage.getItem("tp_admin_token"),
      })).catch(() => ({ href: tail.page.url(), text: "", token: null }))
      throw new Error(`${err.message}\n${JSON.stringify({ ...info, catalogAt: tail.marks.catalogAt, authUrl: tail.marks.authUrl })}`)
    }
    const editorVisibleMs = Date.now() - returnStarted
    const token = await tail.page.evaluate(() => localStorage.getItem("tp_admin_token"))
    if (token !== "late.token") throw new Error(`Token missing after late callback, got ${token}`)
    if (!tail.marks.catalogAt || tail.marks.catalogAt < returnStarted) {
      throw new Error("Return trip did not wait for a late catalog")
    }
    const reconcileMs = tail.marks.catalogAt - returnStarted
    await sleep(200)
    const stillIn = await tail.page.evaluate(() => document.body.textContent.includes("Log out"))
    if (!stillIn) throw new Error("Late catalog removed the tagger editor")
    tail.stopWatch()

    console.log(JSON.stringify({
      goldenVisibleMs,
      tailRedirectMs,
      editorVisibleMs,
      reconcileMs,
    }))
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error("Tagger login e2e failed:", err)
  process.exit(1)
})
