import { createActor } from "xstate"
import { createWebSocketInspector } from "@statelyai/inspect"
import { createInspectorServer } from "@statelyai/inspect/server"
import { appMachine } from "../src/appMachine.js"

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

function generateOptions(correctMove) {
  const wrongs = [
    { text: "Wrong Move 1", partner: "A", correct: false },
    { text: "Wrong Move 2", partner: "B", correct: false },
    { text: "Wrong Move 3", partner: "A", correct: false },
  ]
  return [
    { ...correctMove, correct: true },
    ...wrongs,
  ].sort(() => Math.random() - 0.5)
}

globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] ?? null },
  setItem(key, value) { this.store[key] = value },
  removeItem(key) { delete this.store[key] },
  clear() { this.store = {} },
}

const server = createInspectorServer({
  port: 8080,
  autoOpen: true,
})

const inspector = createWebSocketInspector({
  url: "ws://localhost:8080",
})

const actor = createActor(appMachine, {
  inspect: inspector.inspect,
  input: { decks: mockDecks, generateOptions },
})

actor.start()

console.log("XState machine viewer running at https://stately.ai/inspect")
console.log("Relay server: ws://localhost:8080")
console.log("Initial state:", actor.getSnapshot().value)
console.log("Press Ctrl+C to stop")

process.on("SIGINT", () => {
  server.close()
  actor.stop()
  process.exit(0)
})
