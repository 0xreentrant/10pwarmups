import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const releaseVersion = new Date().toISOString().slice(0, 10)

const whatsNewPath = path.join(root, "src/data/whatsNew.js")
let whatsNew = fs.readFileSync(whatsNewPath, "utf8")
const currentRelease = whatsNew.match(/APP_RELEASE_VERSION = "([^"]+)"/)?.[1]

let changed = false

if (currentRelease !== releaseVersion) {
  whatsNew = whatsNew.replace(
    /export const APP_RELEASE_VERSION = "[^"]+"/,
    `export const APP_RELEASE_VERSION = "${releaseVersion}"`
  )
  fs.writeFileSync(whatsNewPath, whatsNew)
  console.log(`APP_RELEASE_VERSION: ${currentRelease} -> ${releaseVersion}`)
  changed = true

  const pkgPath = path.join(root, "package.json")
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  const [major, minor, patch] = pkg.version.split(".").map(Number)
  pkg.version = `${major}.${minor}.${patch + 1}`
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`package.json version -> ${pkg.version}`)

  const lockPath = path.join(root, "package-lock.json")
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"))
  lock.version = pkg.version
  if (lock.packages?.[""]) lock.packages[""].version = pkg.version
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
} else {
  console.log(`APP_RELEASE_VERSION already ${releaseVersion}`)
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`)
}
