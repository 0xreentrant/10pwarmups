import { execSync, spawn } from "node:child_process"

function tailscaleIPv4() {
  const self = JSON.parse(execSync("tailscale status --json", { encoding: "utf8" })).Self
  const ip = self.TailscaleIPs?.find((addr) => addr.includes("."))
  if (!ip) throw new Error("No Tailscale IPv4 address (is tailscale up?)")
  return { ip, dns: self.DNSName?.replace(/\.$/, "") ?? ip }
}

const { ip, dns } = tailscaleIPv4()

console.log(`Phone URL: http://${ip}:5173`)
console.log(`Tailnet DNS: https://${dns} (needs tailscale serve; run pnpm run tailscale:serve)`)

const child = spawn("pnpm", ["exec", "vite", "--strictPort"], {
  stdio: "inherit",
  env: {
    ...process.env,
    TAILSCALE_HOST: ip,
    // MagicDNS Host header (via tailscale serve) must pass Vite allowedHosts.
    TAILSCALE_SERVE_HOST: dns,
  },
})

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
