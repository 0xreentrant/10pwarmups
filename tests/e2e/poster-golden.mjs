import puppeteer from "puppeteer"

const base = "http://127.0.0.1:5174"
// Give-up ceiling for a held clip plus the frame that follows. A real phone
// on a slow link can sit longer; this only bounds the scripted tail.
const TAIL_CEILING_MS = 15000

function fail(message) {
  throw new Error(message)
}

async function cover(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector(".ct-overlay, .bl-overlay")
    const poster = document.querySelector(".clip-poster")
    const spinner = document.querySelector(".clip-spinner")
    const video = document.querySelector("video.ct-video, video.bl-video")
    const seconds = document.querySelector(".bl-seconds")
    const tapped = document.body.textContent.includes("Tapped out")
    const opacity = video && video.style.opacity !== "" ? Number(video.style.opacity) : (video ? 1 : null)
    return {
      overlay: !!overlay,
      kind: document.querySelector(".ct-overlay") ? "review" : document.querySelector(".bl-overlay") ? "train" : null,
      poster: !!poster,
      posterSrc: poster?.getAttribute("src") ?? null,
      spinner: !!spinner,
      videoOpacity: opacity,
      readyState: video?.readyState ?? null,
      currentTime: video?.currentTime ?? null,
      seconds: seconds?.textContent ?? null,
      tapped,
    }
  })
}

function shown(state) {
  if (!state.overlay || state.spinner || state.poster || state.readyState < 2) return false
  if (state.kind === "train") return state.videoOpacity !== 0 && !state.tapped
  return state.videoOpacity === 1
}

async function prep(page) {
  await page.goto(`${base}/series/A`, { waitUntil: "domcontentloaded", timeout: 30000 })
  await page.evaluate(() => {
    localStorage.setItem("tp_schedule_onboarding_seen", "2026-08-26T00:00:00.000Z")
    localStorage.setItem("tp_whats_new_seen", "2026-08-31T18:00:00.000Z")
  })
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForFunction(() => {
    return [...document.querySelectorAll("tr")].some(tr => {
      const label = tr.querySelector("td span")
      return label?.textContent?.trim() === "A1"
    })
  }, { timeout: 15000 })
}

async function clickRow(page, label) {
  const clicked = await page.evaluate(buttonLabel => {
    const row = [...document.querySelectorAll("tr")].find(tr => {
      return tr.querySelector("td span")?.textContent?.trim() === "A1"
    })
    const button = [...row.querySelectorAll("button")].find(b => b.textContent === buttonLabel)
    if (!button) return false
    button.click()
    return true
  }, label)
  if (!clicked) fail(`A1 ${label} button missing`)
}

async function watch(page, ms) {
  const start = Date.now()
  let posterAt = null
  let reconcileAt = null
  let last = null
  while (Date.now() - start < ms) {
    last = await cover(page)
    const t = Date.now() - start
    if (posterAt == null && last.poster && last.spinner) posterAt = t
    if (reconcileAt == null && shown(last)) reconcileAt = t
    if (posterAt != null && reconcileAt != null) break
    await new Promise(r => setTimeout(r, 16))
  }
  return { posterAt, reconcileAt, last, elapsed: Date.now() - start }
}

async function holdVideo(page) {
  const client = await page.createCDPSession()
  await client.send("Network.enable")
  await client.send("Network.setCacheDisabled", { cacheDisabled: true })
  await client.send("Fetch.enable", {
    patterns: [{ urlPattern: "*://*/videos/A1.mp4*", requestStage: "Request" }],
  })
  const held = []
  let released = false
  client.on("Fetch.requestPaused", event => {
    if (released) {
      client.send("Fetch.continueRequest", { requestId: event.requestId }).catch(() => {})
      return
    }
    held.push(event.requestId)
  })
  return {
    held,
    async release() {
      released = true
      for (const requestId of held.splice(0)) {
        await client.send("Fetch.continueRequest", { requestId }).catch(() => {})
      }
    },
  }
}

async function golden(browser) {
  const page = await browser.newPage()
  await prep(page)
  const t0 = Date.now()
  await clickRow(page, "Review")
  await page.waitForSelector(".ct-overlay", { timeout: 10000 })
  const open = await watch(page, 8000)
  if (open.reconcileAt == null) fail(`golden review never showed the video: ${JSON.stringify(open.last)}`)
  await new Promise(r => setTimeout(r, 400))
  const stayed = await cover(page)
  if (!shown(stayed)) fail(`golden review lost the frame: ${JSON.stringify(stayed)}`)

  await page.click('button[aria-label="Next move"]')
  const seekStart = Date.now()
  let seekPosterAt = null
  let seekAt = null
  let seekLast = null
  while (Date.now() - seekStart < 8000) {
    seekLast = await cover(page)
    const t = Date.now() - seekStart
    if (seekPosterAt == null && seekLast.posterSrc === "/posters/A1/1.webp" && seekLast.spinner) seekPosterAt = t
    if (
      seekAt == null
      && shown(seekLast)
      && seekLast.currentTime > 10
    ) seekAt = t
    if (seekPosterAt != null && seekAt != null) break
    await new Promise(r => setTimeout(r, 16))
  }
  if (seekAt == null) fail(`golden seek never landed on move 2: ${JSON.stringify(seekLast)}`)
  await new Promise(r => setTimeout(r, 400))
  const seekStayed = await cover(page)
  if (!shown(seekStayed) || seekStayed.currentTime < 10) {
    fail(`golden seek slid back: ${JSON.stringify(seekStayed)}`)
  }
  await page.close()
  return {
    posterAt: open.posterAt,
    videoAt: open.reconcileAt,
    wall: Date.now() - t0,
    seekPosterAt,
    seekAt,
  }
}

async function tail(browser) {
  const page = await browser.newPage()
  const gate = await holdVideo(page)
  await prep(page)
  const t0 = Date.now()
  await clickRow(page, "Review")
  await page.waitForSelector(".ct-overlay", { timeout: 10000 })
  let posterAt = null
  let last = null
  while (Date.now() - t0 < 5000) {
    last = await cover(page)
    if (last.poster && last.spinner && last.posterSrc === "/posters/A1/open.webp" && last.videoOpacity === 0) {
      posterAt = Date.now() - t0
      break
    }
    await new Promise(r => setTimeout(r, 16))
  }
  if (posterAt == null) fail(`tail never showed the open still while the clip was held: ${JSON.stringify(last)} held=${gate.held.length}`)
  if (gate.held.length < 1) fail("tail held no video request")
  await new Promise(r => setTimeout(r, 700))
  const during = await cover(page)
  if (!during.poster || !during.spinner) fail(`tail dropped the still before the clip arrived: ${JSON.stringify(during)}`)
  const releaseAt = Date.now() - t0
  await gate.release()
  let reconcileAt = null
  while (Date.now() - t0 < TAIL_CEILING_MS) {
    last = await cover(page)
    if (shown(last)) {
      reconcileAt = Date.now() - t0
      break
    }
    await new Promise(r => setTimeout(r, 16))
  }
  if (reconcileAt == null) fail(`tail frame never replaced the still: ${JSON.stringify(last)}`)
  await new Promise(r => setTimeout(r, 1200))
  const stayed = await cover(page)
  if (!shown(stayed)) fail(`late frame undid the review: ${JSON.stringify(stayed)}`)
  await page.close()
  return { posterAt, releaseAt, reconcileAt }
}

async function trainTail(browser) {
  const page = await browser.newPage()
  const gate = await holdVideo(page)
  await prep(page)
  const t0 = Date.now()
  await clickRow(page, "Train")
  await page.waitForSelector(".bl-overlay", { timeout: 10000 })
  let posterAt = null
  let last = null
  while (Date.now() - t0 < 5000) {
    last = await cover(page)
    if (last.poster && last.spinner && last.posterSrc === "/posters/A1/0.webp") {
      posterAt = Date.now() - t0
      break
    }
    await new Promise(r => setTimeout(r, 16))
  }
  if (posterAt == null) fail(`train tail never showed the still: ${JSON.stringify(last)}`)
  if (last.tapped) fail("train clock tapped out before the clip was released")
  await gate.release()
  let reconcileAt = null
  while (Date.now() - t0 < TAIL_CEILING_MS) {
    last = await cover(page)
    if (shown(last) && !last.tapped) {
      reconcileAt = Date.now() - t0
      break
    }
    if (last.tapped) fail(`train tapped out before the frame: ${JSON.stringify(last)}`)
    await new Promise(r => setTimeout(r, 16))
  }
  if (reconcileAt == null) fail(`train frame never replaced the still: ${JSON.stringify(last)}`)
  await new Promise(r => setTimeout(r, 1200))
  const stayed = await cover(page)
  if (!shown(stayed) || stayed.tapped) fail(`late frame undid the train ask: ${JSON.stringify(stayed)}`)
  await page.close()
  return { posterAt, reconcileAt, seconds: stayed.seconds }
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
})

try {
  const g = await golden(browser)
  const t = await tail(browser)
  const train = await trainTail(browser)
  console.log(JSON.stringify({ golden: g, tail: t, train }, null, 2))
} finally {
  await browser.close()
}
