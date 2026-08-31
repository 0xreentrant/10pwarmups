import { createJiti } from "jiti"
import { createActor } from "xstate"
import { createWebSocketInspector } from "@statelyai/inspect"
import { createInspectorServer } from "@statelyai/inspect/server"

const jiti = createJiti(import.meta.url)
const { appMachine } = await jiti.import("../src/appMachine.ts")
const { precomputeDeckOptions } = await jiti.import("../src/utils/deckUtils.ts")

const mockDecks = [
  {
    id: "A1",
    series: "A",
    name: "Kneeling",
    moves: [
      { text: "Kneeling Granby", partner: "A" },
      { text: "Seated Granby", partner: "A" },
      { text: "Bridging Granby", partner: "A" },
      { text: "Belly to Belly Granby", partner: "A" },
      { text: "Granby Flow", partner: "A" },
    ],
  },
]

globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] ?? null },
  setItem(key, value) { this.store[key] = value },
  removeItem(key) { delete this.store[key] },
  clear() { this.store = {} },
}

// 8080 is often taken locally (e.g. assets-src http.server); override with PORT=
const port = Number(process.env.PORT) || 8081

const server = createInspectorServer({
  port,
  autoOpen: true,
})

const inspector = createWebSocketInspector({
  url: `ws://localhost:${port}`,
})

const actor = createActor(appMachine, {
  inspect: inspector.inspect,
  input: { decks: mockDecks, precomputeDeckOptions },
})

actor.start()

console.log("XState machine viewer running at https://stately.ai/inspect")
console.log(`Relay server: ws://localhost:${port}`)
console.log("Initial state:", actor.getSnapshot().value)
console.log("Press Ctrl+C to stop")

process.on("SIGINT", () => {
  server.close()
  actor.stop()
  process.exit(0)
})
