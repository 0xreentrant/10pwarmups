import { afterEach, describe, expect, it, vi } from "vitest"
import { appActor, restartAppActor } from "../appActor"
import fixture from "../test/catalogFixture.json"
import { applyCatalog, refreshCatalog, type CatalogPayload } from "./catalog"
import { DECKS } from "./decks"

describe("refreshCatalog", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    applyCatalog(fixture as CatalogPayload)
    restartAppActor()
  })

  it("applies a newer catalog from the network and keeps the open session", async () => {
    const payload = structuredClone(fixture) as CatalogPayload
    const warmup = payload.warmups.find(entry => entry.id === "A1")
    if (!warmup) throw new Error("missing A1")
    warmup.title = "Updated Kneeling"
    payload.warmups.push({
      id: "Z9",
      sectionId: "A",
      title: "New Listing",
      link: null,
      note: "",
      moves: [{ text: "Brand New Move", players: ["A"], note: null, startSec: 0 }],
    })
    localStorage.setItem("tp_progress", JSON.stringify({
      A1: { bestStreak: 3, lastAttemptDate: null, attempts: [] },
    }))
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.cache).toBe("no-store")
      return { ok: true, json: async () => payload }
    }))

    expect(await refreshCatalog()).toBe(true)
    expect(DECKS.find(deck => deck.id === "A1")?.name).toBe("Updated Kneeling")
    expect(DECKS.some(deck => deck.id === "Z9")).toBe(true)
    const snap = appActor.getSnapshot()
    expect(snap.context.decks.find(deck => deck.id === "A1")?.name).toBe("Updated Kneeling")
    expect(snap.context.progress.A1?.bestStreak).toBe(3)
    expect(snap.context.progress.Z9?.attempts).toEqual([])

    appActor.send({ type: "START_DECK", deckId: "A1" })
    const session = appActor.getSnapshot().context.session
    expect(session).not.toBeNull()
    warmup.title = "Newer Kneeling"
    expect(await refreshCatalog()).toBe(true)
    const next = appActor.getSnapshot()
    expect(next.context.session).toBe(session)
    expect(next.value).toBe("training")
    expect(next.context.decks.find(deck => deck.id === "A1")?.name).toBe("Newer Kneeling")
  })
})
