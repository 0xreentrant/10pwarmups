import { execSync } from "node:child_process"

const port = process.env.PORT ?? "5173"

try {
  execSync(`tailscale serve --bg ${port}`, { stdio: "inherit" })
  const self = JSON.parse(execSync("tailscale status --json", { encoding: "utf8" })).Self
  const host = self.DNSName?.replace(/\.$/, "")
  console.log(`HTTPS (phone): https://${host}`)
  console.log(`In another terminal: TAILSCALE_SERVE_HOST=${host} npm run dev`)
  console.log(`Status: tailscale serve status`)
  console.log(`Stop: npm run tailscale:reset`)
} catch {
  console.error("If serve is disabled on your tailnet, open the enable URL printed above, then rerun.")
  process.exit(1)
}
