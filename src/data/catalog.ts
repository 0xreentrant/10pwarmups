import { appActor } from "../appActor"
import type { Partner } from "../types/domain"
import { clearAdminToken, readAdminToken, taggerApiBase } from "../utils/taggerApi"
import { applyDeckCatalog } from "./decks"
import { applyMoveTimestamps } from "./moveTimestamps"
import { applyWarmupNotes } from "./warmupNotes"

export type CatalogMove = {
  text: string
  players: Partner[]
  note: string | null
  startSec: number | null
}

export type CatalogWarmup = {
  id: string
  sectionId: string | null
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

export let catalogApplied = false

let appliedSnapshot = ""
let catalogRevision = 0
const catalogListeners = new Set<() => void>()

export function subscribeCatalog(listener: () => void) {
  catalogListeners.add(listener)
  return () => catalogListeners.delete(listener)
}

export function getCatalogRevision() {
  return catalogRevision
}

function publishCatalog() {
  catalogRevision += 1
  for (const listener of catalogListeners) listener()
}

export function applyCatalog(payload: CatalogPayload) {
  catalogApplied = true
  appliedSnapshot = JSON.stringify(payload)
  applyDeckCatalog(
    payload.sections.map(section => ({ id: section.id, name: section.name })),
    payload.warmups.map(warmup => {
      const notes: Record<number, string> = {}
      warmup.moves.forEach((move, index) => {
        if (move.note?.trim()) notes[index] = move.note
      })
      return {
        id: warmup.id,
        series: warmup.sectionId || undefined,
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
  const res = await fetch(`${taggerApiBase()}/api/catalog`, { cache: "no-store" })
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

export function applyCachedCatalog(): boolean {
  try {
    const cached = localStorage.getItem(CATALOG_KEY)
    if (!cached) return false
    applyCatalog(JSON.parse(cached) as CatalogPayload)
    return true
  } catch {
    return false
  }
}

export async function refreshCatalog(): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2000)
  try {
    const res = await fetch(`${taggerApiBase()}/api/catalog`, { cache: "no-store", signal: ctrl.signal })
    if (!res.ok) return catalogApplied
    const payload = (await res.json()) as CatalogPayload
    const next = JSON.stringify(payload)
    if (next === appliedSnapshot) return true
    applyCatalog(payload)
    localStorage.setItem(CATALOG_KEY, next)
    publishCatalog()
    appActor.send({ type: "REPLACE_DECKS" })
    return true
  } catch {
    return catalogApplied
  } finally {
    clearTimeout(timer)
  }
}
