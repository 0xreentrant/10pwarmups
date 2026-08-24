import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"
import { saveTaggerJson, saveTaggerNote } from "./taggerSave"

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", chunk => chunks.push(chunk))
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

async function handleTaggerApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathname = req.url?.split("?")[0]
  if (!pathname?.startsWith("/api/tagger/")) return false

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" })
    return true
  }

  try {
    const body = JSON.parse(await readBody(req)) as Record<string, unknown>

    if (pathname === "/api/tagger/save-json") {
      const jsonText = body.jsonText
      if (typeof jsonText !== "string") throw new Error("Missing jsonText")
      const result = saveTaggerJson(jsonText)
      sendJson(res, 200, result)
      return true
    }

    if (pathname === "/api/tagger/save-note") {
      const deckId = body.deckId
      const noteText = body.noteText
      if (typeof deckId !== "string") throw new Error("Missing deckId")
      if (typeof noteText !== "string") throw new Error("Missing noteText")
      saveTaggerNote(deckId, noteText)
      sendJson(res, 200, { deckId })
      return true
    }

    sendJson(res, 404, { error: "Not found" })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed"
    sendJson(res, 400, { error: message })
    return true
  }
}

export function taggerApiPlugin(): Plugin {
  return {
    name: "tagger-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleTaggerApi(req, res).then(handled => {
          if (!handled) next()
        })
      })
    },
  }
}
