import { describe, expect, it } from "vitest"
import { putRepoFile, readRepoFile } from "./github"

describe("github contents", () => {
  it("writes a file with the current sha", async () => {
    const calls: { url: string; method?: string; body?: string }[] = []
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method, body: typeof init?.body === "string" ? init.body : undefined })
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify({ sha: "abc", content: Buffer.from("old").toString("base64"), encoding: "base64" }), { status: 200 })
      }
      return new Response("{}", { status: 200 })
    }) as typeof fetch

    await putRepoFile({
      repo: "0xreentrant/10pwarmups",
      branch: "main",
      token: "t",
      path: "src/data/warmup-notes/A1.txt",
      content: "hi",
      message: "tagger: update A1 notes",
      fetchImpl,
    })

    const body = JSON.parse(calls[1]?.body ?? "{}") as { sha?: string; content?: string; message?: string }
    expect(body.sha).toBe("abc")
    expect(body.message).toBe("tagger: update A1 notes")
    expect(Buffer.from(body.content ?? "", "base64").toString("utf8")).toBe("hi")
  })

  it("reports a conflict as changed upstream", async () => {
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify({ sha: "abc" }), { status: 200 })
      }
      return new Response("conflict", { status: 409 })
    }) as typeof fetch

    await expect(putRepoFile({
      repo: "0xreentrant/10pwarmups",
      branch: "main",
      token: "t",
      path: "src/data/moveTimestamps.ts",
      content: "x",
      message: "tagger",
      fetchImpl,
    })).rejects.toThrow(/changed upstream/)
  })

  it("decodes a base64 file body", async () => {
    const fetchImpl = (async () => {
      return new Response(JSON.stringify({
        content: Buffer.from("note\n").toString("base64"),
        encoding: "base64",
      }), { status: 200 })
    }) as typeof fetch

    await expect(readRepoFile({
      repo: "0xreentrant/10pwarmups",
      branch: "main",
      token: "t",
      path: "src/data/warmup-notes/A1.txt",
      fetchImpl,
    })).resolves.toBe("note\n")
  })
})
