import { createServer } from "node:net"
import { describe, expect, it } from "vitest"
import { apiPort, portOpen } from "./dev.mjs"

describe("dev API port", () => {
  it("prefers PORT, then the env file, else 3101", () => {
    expect(apiPort({ PORT: "3200" }, "PORT=3101")).toBe(3200)
    expect(apiPort({}, "PORT=3205\n")).toBe(3205)
    expect(apiPort({}, "# PORT=9999\n")).toBe(3101)
    expect(apiPort({}, "")).toBe(3101)
  })

  it("reports whether 127.0.0.1 accepts connections", async () => {
    const server = createServer()
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0
    expect(await portOpen(port)).toBe(true)
    await new Promise((resolve) => server.close(resolve))
    expect(await portOpen(port)).toBe(false)
  })
})
