import { execSync } from "node:child_process"

const port = process.env.PORT ?? "5173"
const httpsPort = process.env.TAILSCALE_SERVE_PORT ?? "443"
const httpsFlag = httpsPort === "443" ? "" : ` --https=${httpsPort}`

try {
  execSync(`tailscale serve --bg${httpsFlag} ${port}`, { stdio: "inherit" })
  const self = JSON.parse(execSync("tailscale status --json", { encoding: "utf8" })).Self
  const host = self.DNSName?.replace(/\.$/, "")
  const origin = httpsPort === "443" ? `https://${host}` : `https://${host}:${httpsPort}`
  console.log(`HTTPS (phone): ${origin}`)
  console.log(
    `In another terminal: TAILSCALE_SERVE_HOST=${host} TAILSCALE_SERVE_PORT=${httpsPort} npm run dev`,
  )
  console.log(`Status: tailscale serve status`)
  console.log(`Stop this port: tailscale serve --https=${httpsPort} off`)
  console.log(`Stop all: npm run tailscale:reset`)
} catch {
  console.error("If serve is disabled on your tailnet, open the enable URL printed above, then rerun.")
  process.exit(1)
}
