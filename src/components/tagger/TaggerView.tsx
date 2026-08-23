import { useMachine } from "@xstate/react"
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { appMachine } from "../../appMachine"
import { DECKS } from "../../data/decks"
import { warmupNoteForDeck } from "../../data/warmupNotes"
import { resolveMoveTimestamps } from "../../data/moveTimestamps"
import { usePersistedMediaVolume } from "../../hooks/usePersistedMediaVolume"
import { usePersistedNudgeMs } from "../../hooks/usePersistedNudgeMs"
import { precomputeDeckOptions } from "../../utils/deckUtils"
import { listVideoDeckIds, videoSrcForDeck } from "../../utils/deckVideo"
import { BleedDusk2Overlay, DUSK2_BLEED_VARIANT } from "../cinema/dusk2"
import { CinemaOverlay } from "../cinema/review"
import MoveLabel from "../MoveLabel"
import { SELECT_NUDGE_SEC, taggerMachine } from "./taggerMachine"
import {
  isFiniteTimestamp,
  moveIndexAtTime,
  parseTimestampsJson,
  timeFromClientX,
} from "./taggerTimestamps"

const VIDEO_IDS = listVideoDeckIds()

type TaggerTab = "edit" | "train" | "review"

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

const CURSOR_PROMPT_DEEPLINK = "cursor://anysphere.cursor-deeplink/prompt"
const CURSOR_DEEPLINK_MAX_URL = 8000

function buildJsonText(deckId: string, timestamps: (number | null)[], moveNames: string[]): string {
  return JSON.stringify(
    {
      deckId,
      timestamps: timestamps.map((t, i) => ({
        name: moveNames[i] ?? `Move ${i + 1}`,
        t: isFiniteTimestamp(t) ? t : null,
      })),
    },
    null,
    2,
  )
}

function buildSavePrompt(jsonText: string): string {
  return [
    "Update the warmup timestamps for this deck using the JSON below. Write the times into MOVE_TIMESTAMPS (or the project's stored timestamp source) for the deckId in the JSON.",
    "",
    "```json",
    jsonText,
    "```",
  ].join("\n")
}

function buildNoteSavePrompt(deckId: string, noteText: string): string {
  return [
    `Write or overwrite src/data/warmup-notes/${deckId}.txt with the tagger note for warmup deck ${deckId}. Replace the entire file with exactly this text:`,
    "",
    "```",
    noteText,
    "```",
  ].join("\n")
}

function buildCursorPromptDeeplink(text: string): string {
  const url = new URL(CURSOR_PROMPT_DEEPLINK)
  const empty = new URL(CURSOR_PROMPT_DEEPLINK)
  empty.searchParams.set("text", "")
  const overhead = empty.toString().length
  let prompt = text
  if (encodeURIComponent(prompt).length + overhead > CURSOR_DEEPLINK_MAX_URL) {
    const suffix = "\n\n[truncated for deeplink length limit]"
    let low = 0
    let high = prompt.length
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      const candidate = `${prompt.slice(0, mid)}${suffix}`
      if (encodeURIComponent(candidate).length + overhead <= CURSOR_DEEPLINK_MAX_URL) {
        low = mid
      } else {
        high = mid - 1
      }
    }
    prompt = `${prompt.slice(0, low)}${suffix}`
  }
  url.searchParams.set("text", prompt)
  return url.toString()
}

export default function TaggerView() {
  const [tagger, send] = useMachine(taggerMachine)
  const {
    deckId,
    moveCount,
    timestamps,
    duration,
    currentTime,
    selectedIndex,
  } = tagger.context

  // Isolated appMachine actor so tagger preview never persists via appActor.
  const [preview, previewSend] = useMachine(appMachine, {
    input: { decks: DECKS, precomputeDeckOptions },
  })
  const previewSession = preview.context.session

  const [jsonDraft, setJsonDraft] = useState("")
  const [notesDraft, setNotesDraft] = useState("")
  const [copied, setCopied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<TaggerTab>("edit")
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const nudgeDialogRef = useRef<HTMLDialogElement>(null)
  const [editVideoEl, setEditVideoEl] = useState<HTMLVideoElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nudgeMs, setNudgeMs] = usePersistedNudgeMs()
  const [nudgeDraft, setNudgeDraft] = useState(String(nudgeMs))

  const deck = DECKS.find(d => d.id === deckId)
  const videoSrc = deckId ? videoSrcForDeck(deckId) : null
  const timestampsReady =
    timestamps.length === moveCount &&
    moveCount > 0 &&
    timestamps.every(isFiniteTimestamp)
  const activeIndex =
    timestamps.length === moveCount && moveCount > 0
      ? moveIndexAtTime(timestamps, currentTime)
      : -1
  const finiteTimestamps = timestampsReady ? (timestamps as number[]) : null

  useEffect(() => {
    const id = VIDEO_IDS[0] ?? ""
    const moves = DECKS.find(d => d.id === id)?.moves.length ?? 0
    send({ type: "SET_DECK", deckId: id, moveCount: moves })
  }, [send])

  useEffect(() => {
    setEditVideoEl(tab === "edit" && videoSrc ? videoRef.current : null)
  }, [tab, videoSrc, deckId])

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
  }, [deckId])

  useEffect(() => {
    const names = DECKS.find(d => d.id === deckId)?.moves.map(m => m.text) ?? []
    setJsonDraft(buildJsonText(deckId, timestamps, names))
  }, [deckId, timestamps])

  useEffect(() => {
    setNotesDraft(warmupNoteForDeck(deckId))
  }, [deckId])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !deckId) return

    const onMeta = () => {
      const d = video.duration
      send({
        type: "SEED",
        duration: d,
        timestamps: resolveMoveTimestamps(deckId, moveCount, d),
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
    if (tab !== "train" || !deckId || !timestampsReady) {
      if (preview.value !== "home") previewSend({ type: "REQUEST_EXIT" })
      return
    }
    previewSend({ type: "START_PREVIEW", deckId })
  }, [tab, deckId, timestampsReady, previewSend])

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
    if (tab !== "edit") return
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
    // Space toggle on keydown: video.play() needs user-activation; keyup is not one
    // when focus is in native media controls. keyup still blocks <select> Space.
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
  }, [tab, videoSrc, deckId, duration, send, nudgeMs])

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
    const result = parseTimestampsJson(jsonDraft, moveCount)
    if (!result.ok) {
      setLoadError(result.error)
      return
    }
    setLoadError(null)
    send({ type: "LOAD", timestamps: result.timestamps })
  }

  function resetTimestamps() {
    if (duration <= 0) return
    if (!window.confirm("Discard current timestamps and restore defaults?")) return
    setLoadError(null)
    send({
      type: "RESET",
      timestamps: resolveMoveTimestamps(deckId, moveCount, duration),
    })
  }

  function saveViaCursorDeeplink() {
    window.open(buildCursorPromptDeeplink(buildSavePrompt(jsonDraft)), "_blank")
  }

  function saveNoteViaCursorDeeplink() {
    window.open(buildCursorPromptDeeplink(buildNoteSavePrompt(deckId, notesDraft)), "_blank")
  }

  function restartTrainPreview() {
    if (!deckId) return
    previewSend({ type: "START_PREVIEW", deckId })
  }

  function onDeckChange(nextId: string) {
    const moves = DECKS.find(d => d.id === nextId)?.moves.length ?? 0
    send({ type: "SET_DECK", deckId: nextId, moveCount: moves })
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
        className="w-[min(22rem,calc(100vw-2rem))] border border-border bg-surface p-4 text-text backdrop:bg-black/60"
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
              min={100}
              max={60000}
              step={100}
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
              tab === id ? "text-text" : "text-muted"
            }`}
            onClick={() => setTab(id)}
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

      {tab === "edit" && (
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

            <div className="max-h-[60vh] w-full shrink-0 overflow-y-auto sm:ml-auto sm:w-56">
              <p className="mb-1 text-muted text-[11px] uppercase tracking-wider">Moves</p>
              {deck?.moves.map((move, i) => (
                <button
                  key={i}
                  type="button"
                  className={`flex w-full gap-2 py-0.5 text-left text-xs ${
                    i === selectedIndex ? "bg-surface" : ""
                  } ${i === activeIndex ? "outline outline-1 outline-accent" : ""}`}
                  onClick={() => selectMove(i)}
                >
                  <span className="min-w-5 text-muted">{i + 1}</span>
                  <MoveLabel move={move} />
                  <span className="ml-auto text-muted tabular-nums">
                    {isFiniteTimestamp(timestamps[i]) ? `${timestamps[i]!.toFixed(2)}s` : "-"}
                  </span>
                </button>
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
              JSON{copied ? " - copied" : ""}
            </p>
            <div className="flex items-baseline gap-3">
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={copyJson}>
                Copy
              </button>
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={loadJson}>
                Load
              </button>
              <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={saveViaCursorDeeplink}>
                Save
              </button>
              <button
                type="button"
                className="text-muted text-[11px] uppercase tracking-wider disabled:opacity-40"
                disabled={duration <= 0}
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

          <div className="mt-4 mb-1 flex items-baseline justify-between gap-3">
            <p className="text-muted text-[11px] uppercase tracking-wider">Notes</p>
            <button
              type="button"
              className="text-muted text-[11px] uppercase tracking-wider"
              onClick={saveNoteViaCursorDeeplink}
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

      {tab === "train" && (
        !deck || !timestampsReady ? (
          <p className="text-muted text-sm">Load video timestamps in Edit first.</p>
        ) : previewSession?.locked ? (
          <div className="flex flex-col items-start gap-2 py-8">
            <p className="text-sm">Preview complete (not scored).</p>
            <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={restartTrainPreview}>
              Restart
            </button>
            <button type="button" className="text-muted text-[11px] uppercase tracking-wider" onClick={() => setTab("edit")}>
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
              timestamps={finiteTimestamps}
              onOptionClick={optionIndex => {
                previewSend({ type: "OPTION_CLICK", optionIndex })
              }}
              onClose={() => setTab("edit")}
              onReview={() => setTab("review")}
              onRestart={restartTrainPreview}
            />
          </PhonePreviewFrame>
        ) : null
      )}

      {tab === "review" && (
        !deck || !timestampsReady ? (
          <p className="text-muted text-sm">Load video timestamps in Edit first.</p>
        ) : (
          <PhonePreviewFrame>
            <CinemaOverlay
              deck={deck}
              videoSrc={videoSrc}
              review
              timestamps={finiteTimestamps}
              onClose={() => setTab("edit")}
              onTrain={() => setTab("train")}
            />
          </PhonePreviewFrame>
        )
      )}
    </div>
  )
}
