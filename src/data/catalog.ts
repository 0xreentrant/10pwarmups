import { applyDeckCatalog } from "./decks"
import { applyMoveTimestamps } from "./moveTimestamps"
import { applyWarmupNotes } from "./warmupNotes"
import type { Partner } from "../types/domain"
import { clearAdminToken, readAdminToken, taggerApiBase } from "../utils/taggerApi"

export type CatalogMove = {
  text: string
  players: Partner[]
  note: string | null
  startSec: number | null
}

export type CatalogWarmup = {
  id: string
  sectionId: string
  title: string
  link: string | null
  note: string
  moves: CatalogMove[]
}

export type CatalogSection = { id: string; name: string }

export type CatalogPayload = {
  sections: CatalogSection[]
  warmups: CatalogWarmup[]
}

const CATALOG_KEY = "tp_catalog"

export function applyCatalog(payload: CatalogPayload) {
  applyDeckCatalog(
    payload.sections.map(section => ({ id: section.id, name: section.name })),
    payload.warmups.map(warmup => {
      const notes: Record<number, string> = {}
      warmup.moves.forEach((move, index) => {
        if (move.note?.trim()) notes[index] = move.note
      })
      return {
        id: warmup.id,
        series: warmup.sectionId,
        name: warmup.title,
        link: warmup.link ?? undefined,
        moves: warmup.moves.map(move => ({ text: move.text, players: move.players })),
        notes: Object.keys(notes).length > 0 ? notes : undefined,
      }
    }),
  )
  const stamps: Record<string, (number | null)[]> = {}
  const noteMap: Record<string, string> = {}
  for (const warmup of payload.warmups) {
    stamps[warmup.id] = warmup.moves.map(move => move.startSec)
    noteMap[warmup.id] = warmup.note
  }
  applyMoveTimestamps(stamps)
  applyWarmupNotes(noteMap)
}

export async function fetchCatalog(): Promise<CatalogPayload> {
  const res = await fetch(`${taggerApiBase()}/api/catalog`)
  if (!res.ok) throw new Error("Could not load catalog")
  return (await res.json()) as CatalogPayload
}

export async function writeCatalog(path: string, method: string, body: unknown): Promise<CatalogPayload> {
  const token = readAdminToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${taggerApiBase()}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    clearAdminToken()
    throw new Error("Sign in with Google")
  }
  const data = (await res.json().catch(() => null)) as (CatalogPayload & { error?: string }) | null
  if (!res.ok || !data?.sections || !data.warmups) throw new Error(data?.error ?? "Save failed")
  return data
}

export async function loadCatalog(): Promise<void> {
  try {
    const cached = localStorage.getItem(CATALOG_KEY)
    if (cached) applyCatalog(JSON.parse(cached) as CatalogPayload)
  } catch {
    // Seed stays in place when the cache is missing or unreadable.
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2000)
  try {
    const res = await fetch(`${taggerApiBase()}/api/catalog`, { signal: ctrl.signal })
    if (!res.ok) return
    const payload = (await res.json()) as CatalogPayload
    applyCatalog(payload)
    localStorage.setItem(CATALOG_KEY, JSON.stringify(payload))
  } catch {
    // Seed or the last cache stays in place when the API is down.
  } finally {
    clearTimeout(timer)
  }
}
