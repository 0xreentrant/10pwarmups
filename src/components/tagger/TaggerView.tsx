import { useMachine } from "@xstate/react"
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { appMachine } from "../../appMachine"
import { DECKS } from "../../data/decks"
import { warmupNoteForDeck } from "../../data/warmupNotes"
import { playableIndicesFromTimestamps } from "../../data/moveTimestamps"
import type { Partner } from "../../types/domain"
import { usePersistedMediaVolume } from "../../hooks/usePersistedMediaVolume"
import {
  MAX_PLAYBACK_SPEED,
  MIN_PLAYBACK_SPEED,
  PLAYBACK_SPEED_STEP,
  usePersistedPlaybackSpeed,
} from "../../hooks/usePersistedPlaybackSpeed"
import {
  MAX_NUDGE_MS,
  MIN_NUDGE_MS,
  NUDGE_MS_STEP,
  usePersistedNudgeMs,
} from "../../hooks/usePersistedNudgeMs"
import {
  clearNoteDraftForDeck,
  resolveNoteDraft,
  saveNoteDraftForDeck,
} from "../../hooks/usePersistedTaggerNoteDrafts"
import {
  clearMoveNamesForDeck,
  loadMoveNamesByDeck,
  resolveMoveNames,
  saveMoveNamesForDeck,
} from "../../hooks/usePersistedTaggerMoveNames"
import { deckHasTaggedMoves } from "../../utils/deckTimestamps"
import { nextDeckId, precomputeDeckOptions } from "../../utils/deckUtils"
import { listVideoDeckIds, videoSrcForDeck } from "../../utils/deckVideo"
import { CinemaOverlay } from "../cinema/review"
import MoveLabel from "../MoveLabel"
import TrainingSessionView from "../training/TrainingSessionView"
import { commitJsonHistory, redoJsonHistory, undoJsonHistory } from "./jsonHistory"
import { taggerKeyDownAction, taggerKeyTarget, taggerKeyUpShouldSuppress } from "./taggerKeyboard"
import { SELECT_NUDGE_SEC, taggerMachine } from "./taggerMachine"
import {
  buildJsonText,
  formatVideoTimeMs,
  isFiniteTimestamp,
  moveIndexAtTime,
  parseTimestampsJson,
  taggerSeedTimestamps,
  timeFromClientX,
} from "./taggerTimestamps"

import type { TaggerTab } from "./taggerTypes"

const VIDEO_IDS = listVideoDeckIds()

type SavedTarget = "json" | "note"

async function postTaggerApi(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? "Save failed")
  }
}

type TaggerViewProps = {
  warmup: string
  mode: TaggerTab
  onWarmupChange: (warmup: string) => void
  onModeChange: (mode: TaggerTab) => void
}

function deckMoveNames(deckId: string, defaultNames: string[]): string[] {
  return resolveMoveNames(deckId, defaultNames, loadMoveNamesByDeck())
}

/** iPhone 13 Pro Max CSS viewport (428×926). transform contains fixed cinema overlays. */
function PhonePreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto w-[min(428px,100%,calc((100dvh-10rem)*428/926))] aspect-[428/926] overflow-hidden bg-black [transform:translateZ(0)]"
    >
      {children}
    </div>
  )
}

export default function TaggerView({ warmup, mode, onWarmupChange, onModeChange }: TaggerViewProps) {
  const [tagger, send] = useMachine(taggerMachine)
  const {
    deckId,
    moveCount,
    moveNames,
    movePartners,
    timestamps,
    duration,
    currentTime,
    selectedIndex,
  } = tagger.context

  const [preview, previewSend] = useMachine(appMachine, {
    input: { decks: DECKS, precomputeDeckOptions },
  })

  const [jsonDraft, setJsonDraft] = useState("")
  const [notesDraft, setNotesDraft] = useState("")
  const [savedNoteByDeck, setSavedNoteByDeck] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<SavedTarget | null>(null)
  const [saving, setSaving] = useState<SavedTarget | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const nudgeInputRef = useRef<HTMLInputElement>(null)
  const moveNameDialogRef = useRef<HTMLDialogElement>(null)
  const [editVideoEl, setEditVideoEl] = useState<HTMLVideoElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nudgeMs, setNudgeMs] = usePersistedNudgeMs()
  const [playbackSpeed, setPlaybackSpeed] = usePersistedPlaybackSpeed(editVideoEl)
  const [editingMoveIndex, setEditingMoveIndex] = useState<number | null>(null)
  const [moveNameDraft, setMoveNameDraft] = useState("")
  const [movePartnerDraft, setMovePartnerDraft] = useState<Partner>("A")
  const [hoveredMoveIndex, setHoveredMoveIndex] = useState<number | null>(null)
  const [listDragIndex, setListDragIndex] = useState<number | null>(null)
  const [listDropIndex, setListDropIndex] = useState<number | null>(null)
  const [dropLineTop, setDropLineTop] = useState<number | null>(null)
  const [jsonPast, setJsonPast] = useState<string[]>([])
  const [jsonFuture, setJsonFuture] = useState<string[]>([])

  const appliedJsonRef = useRef("")
  const jsonPastRef = useRef<string[]>([])
  const jsonFutureRef = useRef<string[]>([])
  const skipHistoryCommitRef = useRef(false)
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const moveListBodyRef = useRef<HTMLDivElement>(null)
  const moveRowRefs = useRef<Array<HTMLDivElement | null>>([])

  const deck = DECKS.find(d => d.id === deckId)
  const defaultMoveNames = deck?.moves.map(m => m.text) ?? []
  const videoSrc = deckId ? videoSrcForDeck(deckId) : null
  const timestampsReady =
    timestamps.length === moveCount &&
    moveCount > 0 &&
    playableIndicesFromTimestamps(timestamps).length > 0
  const activeIndex =
    timestamps.length === moveCount && moveCount > 0
      ? moveIndexAtTime(timestamps, currentTime)
      : -1
  const previewTimestamps = timestampsReady ? timestamps : null
  const onDiskJson = buildJsonText(deckId, timestamps, moveNames, movePartners)
  const savedNoteText = savedNoteByDeck[deckId] ?? warmupNoteForDeck(deckId)
  const jsonUnsaved = jsonDraft !== onDiskJson
  const notesUnsaved = notesDraft !== savedNoteText

  useEffect(() => {
    const d = DECKS.find(x => x.id === warmup)
    const moves = d?.moves.length ?? 0
    const names = deckMoveNames(warmup, d?.moves.map(m => m.text) ?? [])
    const partners = d?.moves.map(m => m.partner) ?? []
    send({ type: "SET_DECK", deckId: warmup, moveCount: moves, moveNames: names, movePartners: partners })
  }, [warmup, send])

  useEffect(() => {
    if (!deckId || moveNames.length !== moveCount) return
    saveMoveNamesForDeck(deckId, moveNames)
  }, [deckId, moveCount, moveNames])

  useEffect(() => {
    setEditVideoEl(mode === "edit" && videoSrc ? videoRef.current : null)
  }, [mode, videoSrc, deckId])

  usePersistedMediaVolume(editVideoEl)

  useEffect(() => {
    if (!settingsOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (settingsRef.current?.contains(e.target as Node)) return
      setSettingsOpen(false)
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    const el = nudgeInputRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setNudgeMs(Number(el.value) + (e.deltaY < 0 ? NUDGE_MS_STEP : -NUDGE_MS_STEP))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [settingsOpen, setNudgeMs])

  useEffect(() => {
    setLoadError(null)
    setSaveError(null)
  }, [deckId])

  useEffect(() => {
    setJsonPast([])
    setJsonFuture([])
    jsonPastRef.current = []
    jsonFutureRef.current = []
    skipHistoryCommitRef.current = true
  }, [deckId])

  function syncJsonHistory(past: string[], future: string[]) {
    jsonPastRef.current = past
    jsonFutureRef.current = future
    setJsonPast(past)
    setJsonFuture(future)
  }

  function commitDocumentJson(nextJson: string) {
    if (skipHistoryCommitRef.current) {
      appliedJsonRef.current = nextJson
      return
    }
    const prevJson = appliedJsonRef.current
    if (prevJson !== nextJson) {
      const committed = commitJsonHistory(jsonPastRef.current, prevJson, nextJson)
      if (committed) syncJsonHistory(committed.past, committed.future)
      appliedJsonRef.current = nextJson
    }
  }

  useEffect(() => {
    if (skipHistoryCommitRef.current) {
      appliedJsonRef.current = onDiskJson
      skipHistoryCommitRef.current = false
      setJsonDraft(onDiskJson)
      return
    }
    commitDocumentJson(onDiskJson)
    setJsonDraft(onDiskJson)
  }, [deckId, onDiskJson])

  useEffect(() => {
    const onDisk = savedNoteByDeck[deckId] ?? warmupNoteForDeck(deckId)
    setNotesDraft(resolveNoteDraft(deckId, onDisk))
  }, [deckId])

  useEffect(() => {
    if (!deckId) return
    if (notesDraft === savedNoteText) clearNoteDraftForDeck(deckId)
    else saveNoteDraftForDeck(deckId, notesDraft)
  }, [deckId, notesDraft, savedNoteText])

  useEffect(() => {
    if (!deckId || moveCount <= 0 || timestamps.length === moveCount) return
    send({
      type: "LOAD",
      timestamps: taggerSeedTimestamps(
        deckId,
        moveCount,
        duration > 0 ? duration : Number.POSITIVE_INFINITY,
      ),
    })
  }, [deckId, moveCount, duration, timestamps.length, send])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !deckId) return

    const onMeta = () => {
      const d = video.duration
      send({
        type: "SEED",
        duration: d,
        timestamps: taggerSeedTimestamps(deckId, moveCount, d),
      })
    }
    const onTime = () => send({ type: "TIME", time: video.currentTime })

    if (video.readyState >= 1 && video.duration) onMeta()
    video.addEventListener("loadedmetadata", onMeta)
    video.addEventListener("timeupdate", onTime)
    return () => {
      video.removeEventListener("loadedmetadata", onMeta)
      video.removeEventListener("timeupdate", onTime)
    }
  }, [deckId, moveCount, videoSrc, send])

  useEffect(() => {
    if (mode !== "train" || !deckId || !timestampsReady) {
      if (preview.value !== "home") previewSend({ type: "REQUEST_EXIT" })
      return
    }
    previewSend({ type: "START_PREVIEW", deckId, timestamps })
  }, [mode, deckId, timestampsReady, timestamps, previewSend])

  useLayoutEffect(() => {
    if (listDropIndex === null || listDragIndex === null || listDropIndex === listDragIndex) {
      setDropLineTop(null)
      return
    }
    const row = moveRowRefs.current[listDropIndex]
    setDropLineTop(row ? row.offsetTop : null)
  }, [listDropIndex, listDragIndex, moveCount, moveNames, timestamps, activeIndex, selectedIndex])

  useEffect(() => {
    if (tagger.value !== "dragging") return
    const onMove = (e: PointerEvent) => {
      const track = trackRef.current
      if (!track || duration <= 0) return
      const rect = track.getBoundingClientRect()
      const t = timeFromClientX(e.clientX, rect.left, rect.width, duration)
      send({ type: "DRAG", time: t })
      const video = videoRef.current
      if (video) video.currentTime = t
    }
    const onUp = () => send({ type: "DRAG_END" })
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [tagger.value, duration, send])

  function applyJsonToMachine(jsonText: string): boolean {
    const refNames =
      moveNames.length === moveCount ? moveNames : defaultMoveNames
    const result = parseTimestampsJson(jsonText, moveCount, refNames)
    if (!result.ok) {
      setLoadError(result.error)
      return false
    }
    setLoadError(null)
    const names = result.names
      ? defaultMoveNames.map((name, i) => {
          const loaded = result.names![i]?.trim()
          return loaded || name
        })
      : undefined
    send({ type: "LOAD", timestamps: result.timestamps, names, partners: result.partners })
    return true
  }

  function undoJson() {
    const result = undoJsonHistory(
      jsonPastRef.current,
      jsonFutureRef.current,
      appliedJsonRef.current,
    )
    if (!result) return
    syncJsonHistory(result.past, result.future)
    skipHistoryCommitRef.current = true
    if (!applyJsonToMachine(result.current)) {
      skipHistoryCommitRef.current = false
      return
    }
    appliedJsonRef.current = result.current
    setJsonDraft(result.current)
  }

  function redoJson() {
    const result = redoJsonHistory(
      jsonPastRef.current,
      jsonFutureRef.current,
      appliedJsonRef.current,
    )
    if (!result) return
    syncJsonHistory(result.past, result.future)
    skipHistoryCommitRef.current = true
    if (!applyJsonToMachine(result.current)) {
      skipHistoryCommitRef.current = false
      return
    }
    appliedJsonRef.current = result.current
    setJsonDraft(result.current)
  }

  function handleTaggerKeyDown(e: KeyboardEvent | ReactKeyboardEvent) {
    const target = taggerKeyTarget(e.target, jsonTextareaRef.current)
    const action = taggerKeyDownAction({
      target,
      code: e.code,
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      nudgeSec: nudgeMs / 1000,
      jsonPastLength: jsonPastRef.current.length,
      jsonFutureLength: jsonFutureRef.current.length,
    })

    if (action.type === "ignore") return

    if (action.type === "undo") {
      e.preventDefault()
      e.stopPropagation()
      if ("stopImmediatePropagation" in e) e.stopImmediatePropagation()
      undoJson()
      return
    }
    if (action.type === "redo") {
      e.preventDefault()
      e.stopPropagation()
      if ("stopImmediatePropagation" in e) e.stopImmediatePropagation()
      redoJson()
      return
    }

    const video = videoRef.current
    if (!video) return

    if (action.type === "scrub") {
      e.preventDefault()
      e.stopPropagation()
      const dur = Number.isFinite(video.duration) ? video.duration : duration
      const t = Math.min(dur, Math.max(0, video.currentTime + action.deltaSec))
      send({ type: "SCRUB", time: t })
      video.currentTime = t
      return
    }

    if (action.type === "seek-start") {
      e.preventDefault()
      e.stopPropagation()
      send({ type: "SCRUB", time: 0 })
      video.currentTime = 0
      return
    }

    if (action.type === "delete-marker") {
      e.preventDefault()
      e.stopPropagation()
      deleteSelectedMarker()
      return
    }

    if (action.type === "toggle-playback") {
      e.preventDefault()
      e.stopPropagation()
      if (video.paused) void video.play().catch(() => {})
      else video.pause()
    }
  }

  useEffect(() => {
    if (mode !== "edit") return
    const onKeyDown = (e: KeyboardEvent) => handleTaggerKeyDown(e)
    const onKeyUp = (e: KeyboardEvent) => {
      const target = taggerKeyTarget(e.target, jsonTextareaRef.current)
      if (!taggerKeyUpShouldSuppress(target, e.code, e.key)) return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    const video = videoRef.current
    video?.addEventListener("keydown", onKeyDown, true)
    video?.addEventListener("keyup", onKeyUp, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      video?.removeEventListener("keydown", onKeyDown, true)
      video?.removeEventListener("keyup", onKeyUp, true)
    }
  }, [mode, videoSrc, deckId, duration, send, nudgeMs, selectedIndex, timestamps, moveCount, moveNames, defaultMoveNames])

  function deleteSelectedMarker() {
    if (selectedIndex === null) return
    const t = timestamps[selectedIndex]
    if (!isFiniteTimestamp(t)) return
    send({ type: "DELETE_SELECTED" })
  }

  function applyVideoTime(t: number) {
    const video = videoRef.current
    if (video) video.currentTime = t
  }

  function scrubTo(clientX: number) {
    const track = trackRef.current
    if (!track || duration <= 0) return
    const rect = track.getBoundingClientRect()
    const t = timeFromClientX(clientX, rect.left, rect.width, duration)
    send({ type: "SCRUB", time: t })
    applyVideoTime(t)
  }

  function selectMove(index: number) {
    if (index < 0 || index >= moveCount) return
    send({ type: "SELECT", index })
    const t = timestamps[index]
    if (isFiniteTimestamp(t)) {
      applyVideoTime(Math.min(duration, t + SELECT_NUDGE_SEC))
    }
  }

  function startMarkerDrag(index: number, e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const track = trackRef.current
    if (!track || duration <= 0) return
    const rect = track.getBoundingClientRect()
    const t = timeFromClientX(e.clientX, rect.left, rect.width, duration)
    send({ type: "DRAG_START", index, time: t })
    applyVideoTime(t)
  }

  async function copyJson() {
    await navigator.clipboard.writeText(jsonDraft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  function loadJson() {
    if (!applyJsonToMachine(jsonDraft)) return
  }

  function resetTimestamps() {
    if (
      !window.confirm(
        "Discard timestamps and move names, restoring the moveset from decks.ts for this deck?",
      )
    ) {
      return
    }
    setLoadError(null)
    clearMoveNamesForDeck(deckId)
    send({
      type: "RESET",
      timestamps: taggerSeedTimestamps(
        deckId,
        moveCount,
        duration > 0 ? duration : Number.POSITIVE_INFINITY,
      ),
      moveNames: defaultMoveNames,
      movePartners: deck?.moves.map(m => m.partner) ?? [],
    })
  }

  function saveJson() {
    if (saving) return
    setSaveError(null)
    setSaving("json")
    void postTaggerApi("/api/tagger/save-json", { jsonText: jsonDraft })
      .then(() => {
        setSaved("json")
        window.setTimeout(() => setSaved(null), 1200)
      })
      .catch(err => {
        setSaveError(err instanceof Error ? err.message : "Save failed")
      })
      .finally(() => setSaving(null))
  }

  function saveNote() {
    if (saving) return
    setSaveError(null)
    setSaving("note")
    void postTaggerApi("/api/tagger/save-note", { deckId, noteText: notesDraft })
      .then(() => {
        setSavedNoteByDeck(prev => ({ ...prev, [deckId]: notesDraft }))
        clearNoteDraftForDeck(deckId)
        setSaved("note")
        window.setTimeout(() => setSaved(null), 1200)
      })
      .catch(err => {
        setSaveError(err instanceof Error ? err.message : "Save failed")
      })
      .finally(() => setSaving(null))
  }

  function restartTrainPreview() {
    if (!deckId) return
    previewSend({ type: "START_PREVIEW", deckId, timestamps })
  }

  function onDeckChange(nextId: string) {
    onWarmupChange(nextId)
  }

  function openMoveNameEditor(index: number) {
    setEditingMoveIndex(index)
    setMoveNameDraft(moveNames[index] ?? deck?.moves[index]?.text ?? `Move ${index + 1}`)
    setMovePartnerDraft(movePartners[index] ?? deck?.moves[index]?.partner ?? "A")
    moveNameDialogRef.current?.showModal()
  }

  function addMove() {
    const newIndex = moveCount
    send({ type: "ADD_MOVE" })
    setEditingMoveIndex(newIndex)
    setMoveNameDraft(`Move ${newIndex + 1}`)
    setMovePartnerDraft("A")
    moveNameDialogRef.current?.showModal()
  }

  function deleteEditingMove() {
    if (editingMoveIndex === null || moveCount <= 1) return
    const label =
      moveNameDraft.trim() ||
      moveNames[editingMoveIndex] ||
      deck?.moves[editingMoveIndex]?.text ||
      `Move ${editingMoveIndex + 1}`
    if (!window.confirm(`Delete ${label}?`)) return
    send({ type: "DELETE_MOVE", index: editingMoveIndex })
    moveNameDialogRef.current?.close()
    setEditingMoveIndex(null)
  }

  function reorderMove(from: number, to: number) {
    if (from === to) return
    send({ type: "REORDER_MOVE", from, to })
  }

  function saveMoveName() {
    if (editingMoveIndex === null) return
    const trimmed = moveNameDraft.trim()
    if (!trimmed) return
    send({ type: "SET_MOVE", index: editingMoveIndex, name: trimmed, partner: movePartnerDraft })
    moveNameDialogRef.current?.close()
    setEditingMoveIndex(null)
  }

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={e => {
        if (mode === "edit") handleTaggerKeyDown(e)
      }}
      onPointerDown={e => {
        const t = e.target
        if (!(t instanceof HTMLElement)) return
        if (t.closest("textarea, input, button, select, dialog, a, [role=\"button\"]")) return
        rootRef.current?.focus({ preventScroll: true })
      }}
      className="relative left-1/2 w-[80vw] max-w-[80vw] -translate-x-1/2 py-4 outline-none"
    >
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <h1 className="text-xl">Video Tagger</h1>
        <div ref={settingsRef} className="relative shrink-0">
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            className="p-1 text-muted hover:text-text"
            onClick={() => setSettingsOpen(open => !open)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
              />
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.7.8 1.2 1.5 1.2H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
              />
            </svg>
          </button>
          {settingsOpen && (
            <div className="absolute right-0 z-30 mt-1 min-w-52 border border-border bg-surface py-1 shadow-lg">
              <div className="border-b border-border px-3 py-2">
                <label className="flex flex-col gap-2">
                  <span className="text-muted text-[11px] uppercase tracking-wider">
                    Playback speed
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={MIN_PLAYBACK_SPEED}
                      max={MAX_PLAYBACK_SPEED}
                      step={PLAYBACK_SPEED_STEP}
                      value={playbackSpeed}
                      onChange={e => setPlaybackSpeed(Number(e.target.value))}
                      className="min-w-0 flex-1"
                    />
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text">
                      {playbackSpeed.toFixed(2)}×
                    </span>
                  </div>
                </label>
              </div>
              <div className="px-3 py-2">
                <label className="flex flex-col gap-2">
                  <span className="text-muted text-[11px] uppercase tracking-wider">
                    Keyboard nudge
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={nudgeInputRef}
                      type="number"
                      min={MIN_NUDGE_MS}
                      max={MAX_NUDGE_MS}
                      step={NUDGE_MS_STEP}
                      value={nudgeMs}
                      onChange={e => setNudgeMs(Number(e.target.value))}
                      className="min-w-0 flex-1 border border-border bg-black px-2 py-1.5 text-sm tabular-nums"
                    />
                    <span className="shrink-0 text-xs text-muted">ms</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <dialog
        ref={moveNameDialogRef}
        className="fixed top-1/2 left-1/2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-border bg-surface p-4 text-text backdrop:bg-black/60"
      >
        <form
          method="dialog"
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault()
            saveMoveName()
          }}
        >
          <p className="text-muted text-[11px] uppercase tracking-wider">
            Edit move {editingMoveIndex !== null ? editingMoveIndex + 1 : ""}
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[11px] uppercase tracking-wider">Name</span>
            <input
              type="text"
              value={moveNameDraft}
              onChange={e => setMoveNameDraft(e.target.value)}
              className="border border-border bg-black px-2 py-1.5 text-sm"
            />
          </label>
          <fieldset className="flex flex-col gap-1 border-0 p-0">
            <legend className="text-muted text-[11px] uppercase tracking-wider">Player</legend>
            <div className="flex gap-2">
              {(["A", "B"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`flex-1 border px-2 py-1.5 text-sm ${
                    movePartnerDraft === p
                      ? p === "A"
                        ? "border-partner-a text-partner-a"
                        : "border-partner-b text-partner-b"
                      : "border-border text-muted"
                  }`}
                  onClick={() => setMovePartnerDraft(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-between gap-3">
            <button
              type="button"
              className="text-accent text-[11px] uppercase tracking-wider disabled:opacity-50"
              disabled={moveCount <= 1}
              onClick={deleteEditingMove}
            >
              Delete
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-muted text-[11px] uppercase tracking-wider"
                onClick={() => {
                  setEditingMoveIndex(null)
                  moveNameDialogRef.current?.close()
                }}
              >
                Cancel
              </button>
              <button type="submit" className="text-[11px] uppercase tracking-wider text-text">
                Save
              </button>
            </div>
          </div>
        </form>
      </dialog>

      <div className="mb-3 flex gap-3">
        {([
          ["edit", "Edit"],
          ["train", "Train"],
          ["review", "Review"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`text-[11px] uppercase tracking-wider ${
              mode === id ? "text-text" : "text-muted"
            }`}
            onClick={() => onModeChange(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mb-3 flex flex-col gap-1">
        <span className="text-muted text-[11px] uppercase tracking-wider">Video</span>
        <select value={deckId} onChange={e => onDeckChange(e.target.value)}>
          {VIDEO_IDS.map(id => {
            const d = DECKS.find(x => x.id === id)
            const untagged = !deckHasTaggedMoves(id, d?.moves.length ?? 0)
            return (
              <option
                key={id}
                value={id}
                style={untagged ? { color: "var(--color-accent)" } : undefined}
              >
                {id}{d ? ` - ${d.name}` : ""}{untagged ? " · untagged" : ""}
              </option>
            )
          })}
        </select>
      </label>

      {mode === "edit" && (
        <>
          <div className="mb-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              {videoSrc && (
                <>
                  <video
                    key={deckId}
                    ref={videoRef}
                    className="max-h-[60vh] w-full object-contain bg-black"
                    src={videoSrc}
                    controls
                    playsInline
                    tabIndex={-1}
                    onFocus={() => {
                      videoRef.current?.blur()
                      rootRef.current?.focus({ preventScroll: true })
                    }}
                  />
                  <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                    {formatVideoTimeMs(currentTime)}
                    {duration > 0 ? ` / ${formatVideoTimeMs(duration)}` : ""}
                  </p>
                </>
              )}
            </div>

            <div className="max-h-[60vh] w-full shrink-0 overflow-y-auto sm:ml-auto sm:w-[15.4rem]">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-muted text-[11px] uppercase tracking-wider">Moves</p>
                <button
                  type="button"
                  aria-label="Add move"
                  className="p-0.5 text-muted hover:text-text"
                  onClick={addMove}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      d="M12 5v14M5 12h14"
                    />
                  </svg>
                </button>
              </div>
              <div ref={moveListBodyRef} className="relative isolate">
                {dropLineTop !== null && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-50 h-0.5 bg-white"
                    style={{ top: dropLineTop }}
                    aria-hidden
                  />
                )}
              {Array.from({ length: moveCount }, (_, i) => {
                const deckMove = deck?.moves[i]
                return (
                <div
                  key={i}
                  ref={el => {
                    moveRowRefs.current[i] = el
                  }}
                  className={`flex w-full items-center gap-1 py-0.5 ${
                    i === activeIndex ? "ring-1 ring-inset ring-accent" : ""
                  } ${listDragIndex === i ? "opacity-50" : ""}`}
                  onDragOver={e => {
                    e.preventDefault()
                    if (listDragIndex !== null && listDragIndex !== i) setListDropIndex(i)
                  }}
                  onDragLeave={() => setListDropIndex(null)}
                  onDrop={e => {
                    e.preventDefault()
                    if (listDragIndex !== null) reorderMove(listDragIndex, i)
                    setListDragIndex(null)
                    setListDropIndex(null)
                  }}
                >
                  <button
                    type="button"
                    draggable
                    aria-label={`Reorder move ${i + 1}`}
                    className="shrink-0 cursor-grab p-0.5 text-muted hover:text-text active:cursor-grabbing"
                    onDragStart={e => {
                      setListDragIndex(i)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onDragEnd={() => {
                      setListDragIndex(null)
                      setListDropIndex(null)
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        d="M8 7h8M8 12h8M8 17h8"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`flex min-w-0 flex-1 gap-2 text-left text-xs ${
                      i === selectedIndex ? "bg-surface" : ""
                    }`}
                    onClick={() => selectMove(i)}
                  >
                    <span className="min-w-5 text-muted">{i + 1}</span>
                    <MoveLabel
                      move={{
                        text: moveNames[i] ?? deckMove?.text ?? `Move ${i + 1}`,
                        partner: movePartners[i] ?? deckMove?.partner ?? "A",
                      }}
                      className={
                        i === hoveredMoveIndex
                          ? "rounded-sm bg-white/15 px-0.5 -mx-0.5"
                          : undefined
                      }
                    />
                    <span className="ml-auto text-muted tabular-nums">
                      {isFiniteTimestamp(timestamps[i]) ? `${timestamps[i]!.toFixed(2)}s` : "-"}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit name for move ${i + 1}`}
                    className="shrink-0 p-0.5 text-muted hover:text-text"
                    onClick={e => {
                      e.stopPropagation()
                      openMoveNameEditor(i)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                      />
                      <path
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m13.5 6.5 3 3"
                      />
                    </svg>
                  </button>
                </div>
                )
              })}
              </div>
            </div>
          </div>

          <div
            ref={trackRef}
            className="relative mb-4 h-10 w-full cursor-crosshair touch-none"
            onPointerDown={e => scrubTo(e.clientX)}
          >
            <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 bg-border" />
            {timestamps.map((t, i) => {
              if (!isFiniteTimestamp(t)) return null
              const pct = duration > 0 ? (t / duration) * 100 : 0
              const selected = i === selectedIndex
              const active = i === activeIndex
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Move ${i + 1} at ${t.toFixed(2)}s`}
                  className={`absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                    selected
                      ? "border-accent bg-accent"
                      : "border-text bg-surface"
                  } ${active ? "outline outline-2 outline-offset-1 outline-accent" : ""}`}
                  style={{ left: `${pct}%` }}
                  onPointerEnter={() => setHoveredMoveIndex(i)}
                  onPointerLeave={() => setHoveredMoveIndex(null)}
                  onPointerDown={e => startMarkerDrag(i, e)}
                />
              )
            })}
            <div
              className="pointer-events-none absolute inset-y-0 z-20 -translate-x-1/2"
              style={{ left: `${playheadPct}%` }}
              aria-hidden
            >
              <div className="absolute top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-text" />
              <div className="absolute top-1.5 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-text" />
            </div>
          </div>

          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="text-muted text-[11px] uppercase tracking-wider">
              JSON
              {copied ? " - copied" : jsonUnsaved ? " - unsaved" : saved === "json" ? " - saved" : ""}
            </p>
            <div className="flex items-baseline gap-3">
              <button
                type="button"
                className="text-muted text-[11px] uppercase tracking-wider disabled:opacity-50"
                onClick={undoJson}
                disabled={jsonPast.length === 0}
              >
                Undo
              </button>
              <button
                type="button"
                className="text-muted text-[11px] uppercase tracking-wider disabled:opacity-50"
                onClick={redoJson}
                disabled={jsonFuture.length === 0}
              >
                Redo
              </button>
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={copyJson}>
                Copy
              </button>
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={loadJson}>
                Load
              </button>
              <button
                type="button"
                className="text-muted text-[11px] uppercase tracking-wider disabled:opacity-50"
                onClick={saveJson}
                disabled={saving === "json"}
              >
                {saving === "json" ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="text-muted text-[11px] uppercase tracking-wider"
                onClick={resetTimestamps}
              >
                Reset
              </button>
            </div>
          </div>
          <textarea
            ref={jsonTextareaRef}
            onKeyDown={e => handleTaggerKeyDown(e)}
            className="min-h-48 w-full resize-y border border-border bg-surface p-3 font-mono text-[11px] leading-relaxed"
            value={jsonDraft}
            onChange={e => {
              setJsonDraft(e.target.value)
              setLoadError(null)
            }}
            spellCheck={false}
          />
          {loadError && <p className="mt-1 text-[11px] text-accent">{loadError}</p>}
          {saveError && <p className="mt-1 text-[11px] text-accent">{saveError}</p>}

          <div className="mt-4 mb-1 flex items-baseline justify-between gap-3">
            <p className="text-muted text-[11px] uppercase tracking-wider">
              Notes
              {notesUnsaved ? " - unsaved" : saved === "note" ? " - saved" : ""}
            </p>
            <button
              type="button"
              className="text-muted text-[11px] uppercase tracking-wider disabled:opacity-50"
              onClick={saveNote}
              disabled={saving === "note"}
            >
              {saving === "note" ? "Saving..." : "Save note"}
            </button>
          </div>
          <textarea
            className="min-h-24 w-full resize-y border border-border bg-surface p-3 text-[11px] leading-relaxed"
            value={notesDraft}
            onChange={e => setNotesDraft(e.target.value)}
          />
        </>
      )}

      {mode === "train" && (
        !deck || !timestampsReady ? (
          <p className="text-muted text-sm">Tag at least one move in Edit first.</p>
        ) : (
          <TrainingSessionView
            snap={preview}
            send={previewSend}
            deck={deck}
            timestamps={previewTimestamps}
            frameTraining={node => <PhonePreviewFrame>{node}</PhonePreviewFrame>}
            onExit={() => onModeChange("edit")}
            onSwitchToReview={() => onModeChange("review")}
            onRestart={restartTrainPreview}
            onTryAgain={restartTrainPreview}
            onHome={() => {
              previewSend({ type: "REQUEST_EXIT" })
              onModeChange("edit")
            }}
            onNext={() => {
              const nid = nextDeckId(deck.id)
              if (nid && listVideoDeckIds().includes(nid)) {
                onWarmupChange(nid)
                return
              }
              previewSend({ type: "REQUEST_EXIT" })
              onModeChange("edit")
            }}
            onStats={() => onModeChange("edit")}
          />
        )
      )}

      {mode === "review" && (
        !deck || !timestampsReady ? (
          <p className="text-muted text-sm">Tag at least one move in Edit first.</p>
        ) : (
          <PhonePreviewFrame>
            <CinemaOverlay
              deck={deck}
              videoSrc={videoSrc}
              review
              timestamps={previewTimestamps}
              onClose={() => onModeChange("edit")}
              onTrain={() => onModeChange("train")}
            />
          </PhonePreviewFrame>
        )
      )}
    </div>
  )
}
