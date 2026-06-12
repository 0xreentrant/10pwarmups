import { describe, it, expect, beforeAll } from "vitest"
import fs from "fs"
import path from "path"

const dist = path.resolve("dist")
const base = "/"

function distPath(file: string) {
  return path.join(dist, file)
}

function readDist(file: string) {
  return fs.readFileSync(distPath(file), "utf8")
}

function extractPrecacheUrls(swContent: string) {
  const matches = [...swContent.matchAll(/url:"([^"]+)"/g)]
  return matches.map(m => m[1])
}

describe("PWA build artifacts", () => {
  beforeAll(() => {
    if (!fs.existsSync(dist)) {
      throw new Error("dist/ not found — run npm run build first")
    }
  })

  it("generates manifest.webmanifest with required fields", () => {
    const manifest = JSON.parse(readDist("manifest.webmanifest"))
    expect(manifest.name).toBe("10th Planet Warmup Trainer")
    expect(manifest.short_name).toBe("Warmups")
    expect(manifest.start_url).toBe(base)
    expect(manifest.scope).toBe(base)
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toBe("#c0392b")
    expect(manifest.background_color).toBe("#0f0f0f")
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "192x192")).toBe(true)
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true)
  })

  it("includes iOS and Android icon files in dist", () => {
    expect(fs.existsSync(distPath("apple-touch-icon-180x180.png"))).toBe(true)
    expect(fs.existsSync(distPath("icon-192x192.png"))).toBe(true)
    expect(fs.existsSync(distPath("icon-512x512.png"))).toBe(true)
  })

  it("includes iOS meta tags in built index.html", () => {
    const html = readDist("index.html")
    expect(html).toContain('name="apple-mobile-web-app-capable"')
    expect(html).toContain('name="apple-mobile-web-app-title"')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain(`${base}apple-touch-icon-180x180.png`)
    expect(html).toContain('rel="manifest"')
    expect(html).toContain("registerSW.js")
  })

  it("generates service worker with precache for critical assets", () => {
    expect(fs.existsSync(distPath("sw.js"))).toBe(true)
    const urls = extractPrecacheUrls(readDist("sw.js"))
    expect(urls).toContain("index.html")
    expect(urls).toContain("updates.html")
    expect(urls).toContain("favicon.svg")
    expect(urls).toContain("apple-touch-icon-180x180.png")
    expect(urls).toContain("icon-192x192.png")
    expect(urls).toContain("icon-512x512.png")
    expect(urls.some(u => u.startsWith("assets/index-") && u.endsWith(".js"))).toBe(true)
    expect(urls.some(u => u.startsWith("assets/index-") && u.endsWith(".css"))).toBe(true)
    expect(urls.some(u => u.endsWith(".woff2"))).toBe(true)
  })
})
