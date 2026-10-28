import { execSync, spawn } from "node:child_process"

const VITE_PORT = "5174"
const SERVICE = "warmups"

function tailscaleIPv4() {
  const self = JSON.parse(execSync("tailscale status --json", { encoding: "utf8" })).Self
  const ip = self.TailscaleIPs?.find((addr) => addr.includes("."))
  if (!ip) throw new Error("No Tailscale IPv4 address (is tailscale up?)")
  return { ip, dns: self.DNSName?.replace(/\.$/, "") ?? ip }
}

function serviceHost(machineDns) {
  const tailnet = machineDns.split(".").slice(1).join(".")
  if (!tailnet) throw new Error("No Tailscale MagicDNS name")
  return `${SERVICE}.${tailnet}`
}

const { ip, dns } = tailscaleIPv4()
const host = serviceHost(dns)

try {
  execSync(`tailscale serve --service=svc:${SERVICE} --https=443 http://${ip}:${VITE_PORT}`, { stdio: "inherit" })
} catch (err) {
  process.exit(typeof err.status === "number" ? err.status : 1)
}

console.log(`Warmups: https://${host}`)

const child = spawn("pnpm", ["exec", "vite", "--strictPort"], {
  stdio: "inherit",
  env: {
    ...process.env,
    TAILSCALE_HOST: ip,
    // MagicDNS Host header (via tailscale serve) must pass Vite allowedHosts.
    TAILSCALE_SERVE_HOST: host,
  },
})

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
