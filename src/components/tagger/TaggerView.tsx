import { useMachine } from "@xstate/react"
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { appMachine } from "../../appMachine"
import { DECKS } from "../../data/decks"
import { warmupNoteForDeck } from "../../data/warmupNotes"
import { playableIndicesFromTimestamps } from "../../data/moveTimestamps"
import { usePersistedMediaVolume } from "../../hooks/usePersistedMediaVolume"
import {
  MAX_NUDGE_MS,
  MIN_NUDGE_MS,
  usePersistedNudgeMs,
} from "../../hooks/usePersistedNudgeMs"
import {
  clearMoveNamesForDeck,
  loadMoveNamesByDeck,
  resolveMoveNames,
  saveMoveNamesForDeck,
} from "../../hooks/usePersistedTaggerMoveNames"
import { precomputeDeckOptions } from "../../utils/deckUtils"
import { listVideoDeckIds, videoSrcForDeck } from "../../utils/deckVideo"
import { BleedDusk2Overlay, DUSK2_BLEED_VARIANT } from "../cinema/dusk2"
import { CinemaOverlay } from "../cinema/review"
import MoveLabel from "../MoveLabel"
import { SELECT_NUDGE_SEC, taggerMachine } from "./taggerMachine"
import {
  buildJsonText,
  isFiniteTimestamp,
  moveIndexAtTime,
  parseTimestampsJson,
  taggerSeedTimestamps,
  timeFromClientX,
} from "./taggerTimestamps"

const VIDEO_IDS = listVideoDeckIds()

type TaggerTab = "edit" | "train" | "review"
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

export type { TaggerTab }

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
    timestamps,
    duration,
    currentTime,
    selectedIndex,
  } = tagger.context

  const [preview, previewSend] = useMachine(appMachine, {
    input: { decks: DECKS, precomputeDeckOptions },
  })
  const previewSession = preview.context.session

  const [jsonDraft, setJsonDraft] = useState("")
  const [notesDraft, setNotesDraft] = useState("")
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<SavedTarget | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const nudgeDialogRef = useRef<HTMLDialogElement>(null)
  const moveNameDialogRef = useRef<HTMLDialogElement>(null)
  const [editVideoEl, setEditVideoEl] = useState<HTMLVideoElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nudgeMs, setNudgeMs] = usePersistedNudgeMs()
  const [nudgeDraft, setNudgeDraft] = useState(String(nudgeMs))
  const [editingMoveIndex, setEditingMoveIndex] = useState<number | null>(null)
  const [moveNameDraft, setMoveNameDraft] = useState("")

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

  useEffect(() => {
    const d = DECKS.find(x => x.id === warmup)
    const moves = d?.moves.length ?? 0
    const names = deckMoveNames(warmup, d?.moves.map(m => m.text) ?? [])
    send({ type: "SET_DECK", deckId: warmup, moveCount: moves, moveNames: names })
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
    setLoadError(null)
    setSaveError(null)
  }, [deckId])

  useEffect(() => {
    setJsonDraft(buildJsonText(deckId, timestamps, moveNames))
  }, [deckId, timestamps, moveNames])

  useEffect(() => {
    setNotesDraft(warmupNoteForDeck(deckId))
  }, [deckId])

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
    previewSend({ type: "START_PREVIEW", deckId })
  }, [mode, deckId, timestampsReady, previewSend])

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

  useEffect(() => {
    if (mode !== "edit") return
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target
      return (
        el instanceof HTMLElement &&
        (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)
      )
    }
    const isSpace = (e: KeyboardEvent) => e.code === "Space" || e.key === " "
    const nudgeSec = nudgeMs / 1000
    const arrowDelta = (e: KeyboardEvent): number | null => {
      if (e.code === "ArrowLeft" || e.key === "ArrowLeft") return -nudgeSec
      if (e.code === "ArrowRight" || e.key === "ArrowRight") return nudgeSec
      return null
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const video = videoRef.current
      if (!video) return

      const delta = arrowDelta(e)
      if (delta !== null) {
        e.preventDefault()
        e.stopImmediatePropagation()
        const dur = Number.isFinite(video.duration) ? video.duration : duration
        const t = Math.min(dur, Math.max(0, video.currentTime + delta))
        send({ type: "SCRUB", time: t })
        video.currentTime = t
        return
      }

      if (e.code === "Delete" || e.key === "Delete") {
        e.preventDefault()
        e.stopImmediatePropagation()
        deleteSelectedMarker()
        return
      }

      if (!isSpace(e)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (video.paused) void video.play().catch(() => {})
      else video.pause()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      if (!isSpace(e) && arrowDelta(e) === null) return
      e.preventDefault()
      e.stopImmediatePropagation()
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
  }, [mode, videoSrc, deckId, duration, send, nudgeMs, selectedIndex, timestamps])

  function deleteSelectedMarker() {
    if (selectedIndex === null) return
    const t = timestamps[selectedIndex]
    if (!isFiniteTimestamp(t)) return
    const label = moveNames[selectedIndex] ?? `Move ${selectedIndex + 1}`
    if (!window.confirm(`Remove timestamp for ${label}?`)) return
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
    const refNames =
      moveNames.length === moveCount ? moveNames : defaultMoveNames
    const result = parseTimestampsJson(jsonDraft, moveCount, refNames)
    if (!result.ok) {
      setLoadError(result.error)
      return
    }
    setLoadError(null)
    const names = result.names
      ? defaultMoveNames.map((name, i) => {
          const loaded = result.names![i]?.trim()
          return loaded || name
        })
      : undefined
    send({ type: "LOAD", timestamps: result.timestamps, names })
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
    })
  }

  function saveJson() {
    setSaveError(null)
    void postTaggerApi("/api/tagger/save-json", { jsonText: jsonDraft })
      .then(() => {
        setSaved("json")
        window.setTimeout(() => setSaved(null), 1200)
      })
      .catch(err => {
        setSaveError(err instanceof Error ? err.message : "Save failed")
      })
  }

  function saveNote() {
    setSaveError(null)
    void postTaggerApi("/api/tagger/save-note", { deckId, noteText: notesDraft })
      .then(() => {
        setSaved("note")
        window.setTimeout(() => setSaved(null), 1200)
      })
      .catch(err => {
        setSaveError(err instanceof Error ? err.message : "Save failed")
      })
  }

  function restartTrainPreview() {
    if (!deckId) return
    previewSend({ type: "START_PREVIEW", deckId })
  }

  function onDeckChange(nextId: string) {
    onWarmupChange(nextId)
  }

  function openMoveNameEditor(index: number) {
    setEditingMoveIndex(index)
    setMoveNameDraft(moveNames[index] ?? deck?.moves[index]?.text ?? `Move ${index + 1}`)
    moveNameDialogRef.current?.showModal()
  }

  function saveMoveName() {
    if (editingMoveIndex === null) return
    const trimmed = moveNameDraft.trim()
    if (!trimmed) return
    send({ type: "SET_MOVE_NAME", index: editingMoveIndex, name: trimmed })
    moveNameDialogRef.current?.close()
    setEditingMoveIndex(null)
  }

  function openNudgeSettings() {
    setNudgeDraft(String(nudgeMs))
    setSettingsOpen(false)
    nudgeDialogRef.current?.showModal()
  }

  function saveNudgeSettings() {
    const n = Number(nudgeDraft)
    if (!Number.isFinite(n)) return
    setNudgeMs(n)
    nudgeDialogRef.current?.close()
  }

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="relative left-1/2 w-[80vw] max-w-[80vw] -translate-x-1/2 py-4">
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
            <div className="absolute right-0 z-30 mt-1 min-w-44 border border-border bg-surface py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-[11px] uppercase tracking-wider text-muted hover:bg-border/40 hover:text-text"
                onClick={openNudgeSettings}
              >
                Keyboard nudge
              </button>
            </div>
          )}
        </div>
      </div>

      <dialog
        ref={nudgeDialogRef}
        className="fixed top-1/2 left-1/2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-border bg-surface p-4 text-text backdrop:bg-black/60"
      >
        <form
          method="dialog"
          className="flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault()
            saveNudgeSettings()
          }}
        >
          <p className="text-muted text-[11px] uppercase tracking-wider">Keyboard nudge</p>
          <label className="flex flex-col gap-1">
            <span className="text-muted text-[11px] uppercase tracking-wider">Amount (ms)</span>
            <input
              type="number"
              min={MIN_NUDGE_MS}
              max={MAX_NUDGE_MS}
              step={1}
              value={nudgeDraft}
              onChange={e => setNudgeDraft(e.target.value)}
              className="border border-border bg-black px-2 py-1.5 text-sm tabular-nums"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="text-muted text-[11px] uppercase tracking-wider"
              onClick={() => nudgeDialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="text-[11px] uppercase tracking-wider text-text">
              Save
            </button>
          </div>
        </form>
      </dialog>

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
            Edit move {editingMoveIndex !== null ? editingMoveIndex + 1 : ""} name
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
          <div className="flex justify-end gap-3">
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
            return (
              <option key={id} value={id}>
                {id}{d ? ` - ${d.name}` : ""}
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
                <video
                  key={deckId}
                  ref={videoRef}
                  className="max-h-[60vh] w-full object-contain bg-black"
                  src={videoSrc}
                  controls
                  playsInline
                />
              )}
            </div>

            <div className="max-h-[60vh] w-full shrink-0 overflow-y-auto sm:ml-auto sm:w-[15.4rem]">
              <p className="mb-1 text-muted text-[11px] uppercase tracking-wider">Moves</p>
              {deck?.moves.map((move, i) => (
                <div
                  key={i}
                  className={`flex w-full items-center gap-1 py-0.5 ${
                    i === activeIndex ? "outline outline-1 outline-accent" : ""
                  }`}
                >
                  <button
                    type="button"
                    className={`flex min-w-0 flex-1 gap-2 text-left text-xs ${
                      i === selectedIndex ? "bg-surface" : ""
                    }`}
                    onClick={() => selectMove(i)}
                  >
                    <span className="min-w-5 text-muted">{i + 1}</span>
                    <MoveLabel move={{ ...move, text: moveNames[i] ?? move.text }} />
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
              ))}
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
              JSON{copied ? " - copied" : saved === "json" ? " - saved" : ""}
            </p>
            <div className="flex items-baseline gap-3">
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={copyJson}>
                Copy
              </button>
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={loadJson}>
                Load
              </button>
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={saveJson}>
                Save
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
              Notes{saved === "note" ? " - saved" : ""}
            </p>
            <button
              type="button"
              className="text-muted text-[11px] uppercase tracking-wider"
              onClick={saveNote}
            >
              Save note
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
        ) : previewSession?.locked ? (
          <div className="flex flex-col items-start gap-2 py-8">
            <p className="text-sm">Preview complete (not scored).</p>
            <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={restartTrainPreview}>
              Restart
            </button>
            <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={() => onModeChange("edit")}>
              Back to Edit
            </button>
          </div>
        ) : previewSession ? (
          <PhonePreviewFrame>
            <BleedDusk2Overlay
              deck={deck}
              session={previewSession}
              videoSrc={videoSrc}
              variant={DUSK2_BLEED_VARIANT}
              timestamps={previewTimestamps}
              onOptionClick={optionIndex => {
                previewSend({ type: "OPTION_CLICK", optionIndex })
              }}
              onTapOut={() => previewSend({ type: "TAP_OUT" })}
              onClose={() => onModeChange("edit")}
              onReview={() => onModeChange("review")}
              onRestart={restartTrainPreview}
            />
          </PhonePreviewFrame>
        ) : null
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
