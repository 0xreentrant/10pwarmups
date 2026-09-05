import { useEffect, useRef, useState, type PointerEvent } from "react"
import MoveLabel from "../../MoveLabel"
import MoveList from "../../MoveList"
import PartnerTags from "../../PartnerTags"
import { usePersistedMediaVolume } from "../../../hooks/usePersistedMediaVolume"
import type { Deck } from "../../../types/domain"
import { captureAmbientColor } from "../frameCapture"
import {
  clampNextPlayable,
  clampPrevPlayable,
  isFiniteTimestamp,
  playableIndicesFromTimestamps,
} from "../../../data/moveTimestamps"
import { useMoveTimeline } from "../useMoveTimeline"
import ReviewTapDemo from "./ReviewTapDemo"

interface CinemaOverlayProps {
  deck: Deck
  videoSrc: string | null
  /** Full sequence on the scrubber with Train affordance, no quiz. */
  review?: boolean
  /** Beta-only tap-zone walkthrough before playback starts. */
  tapDemo?: boolean
  /** Optional in-memory timestamps (e.g. tagger preview). */
  timestamps?: (number | null)[] | null
  onClose: () => void
  onTrain?: () => void
}

export default function CinemaOverlay({
  deck,
  videoSrc,
  review = false,
  tapDemo = false,
  timestamps: timestampOverrides = null,
  onClose,
  onTrain,
}: CinemaOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const seekSyncRef = useRef({ active: false, resume: false })
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [time, setTime] = useState(0)
  const [glow, setGlow] = useState("rgb(192, 57, 43)")
  const [movesOpen, setMovesOpen] = useState(false)
  const [reviewEnded, setReviewEnded] = useState(false)
  const [demoComplete, setDemoComplete] = useState(!tapDemo)
  const showTapDemo = tapDemo && !demoComplete
  const timeline = useMoveTimeline(deck.id, deck.moves.length, videoEl, undefined, timestampOverrides)
  const currentIndex = timeline ? timeline.moveIndexAt(time) : 0
  const playableIndices = timeline
    ? playableIndicesFromTimestamps(timeline.timestamps)
    : Array.from({ length: deck.moves.length }, (_, i) => i)

  useEffect(() => {
    setVideoEl(videoSrc ? videoRef.current : null)
    setReviewEnded(false)
  }, [videoSrc])

  useEffect(() => {
    setDemoComplete(!tapDemo)
  }, [tapDemo, videoSrc])

  useEffect(() => {
    if (!demoComplete || !tapDemo) return
    videoRef.current?.play().catch(() => {})
  }, [demoComplete, tapDemo])

  usePersistedMediaVolume(videoEl)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    if (!timeline || !videoSrc) return
    const t = timeline.timestamps[Math.max(0, currentIndex)]
    captureAmbientColor(videoSrc, isFiniteTimestamp(t) ? t : 0).then(setGlow).catch(() => {})
  }, [timeline, currentIndex, videoSrc])

  useEffect(() => {
    if (!movesOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMovesOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [movesOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !movesOpen && !showTapDemo) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, movesOpen, showTapDemo])

  const seekToIndex = (i: number) => {
    setReviewEnded(false)
    if (!timeline) return
    if (!isFiniteTimestamp(timeline.timestamps[i])) return
    const clamped = Math.min(deck.moves.length - 1, Math.max(0, i))
    const t = timeline.timestamps[clamped]
    if (!isFiniteTimestamp(t)) return
    const video = videoRef.current
    if (!video) {
      setTime(t)
      return
    }
    const resume = !video.paused
    if (Math.abs(video.currentTime - t) < 0.05) {
      setTime(t)
      if (resume) video.play().catch(() => {})
      return
    }
    seekSyncRef.current = { active: true, resume }
    video.currentTime = t
  }

  const syncTimeFromVideo = () => {
    const video = videoRef.current
    if (video) setTime(video.currentTime)
  }

  const handleSeeked = () => {
    const video = videoRef.current
    if (!video) return
    const { resume } = seekSyncRef.current
    seekSyncRef.current.active = false
    syncTimeFromVideo()
    if (resume) video.play().catch(() => {})
  }

  const handleTimeUpdate = (next: number) => {
    if (seekSyncRef.current.active) return
    setTime(next)
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      setReviewEnded(false)
      video.play()
    } else {
      video.pause()
    }
  }

  const handleEnded = () => {
    if (!review) return
    syncTimeFromVideo()
    setReviewEnded(true)
  }

  const handlePlayAgain = () => {
    setReviewEnded(false)
    const first = playableIndices[0] ?? 0
    seekToIndex(first)
    videoRef.current?.play().catch(() => {})
  }

  const move = deck.moves[Math.max(0, currentIndex)]
  const handleTrain = onTrain ?? onClose
  const seekPrev = () => {
    if (!timeline) return
    seekToIndex(clampPrevPlayable(timeline.timestamps, currentIndex))
  }
  const seekNext = () => {
    if (!timeline) return
    seekToIndex(clampNextPlayable(timeline.timestamps, currentIndex))
  }
  const flashNavPress = (e: PointerEvent<HTMLButtonElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const ripple = document.createElement("span")
    ripple.className = "ct-ripple"
    ripple.style.setProperty("--tap-x", `${e.clientX - rect.left}px`)
    ripple.style.setProperty("--tap-y", `${e.clientY - rect.top}px`)
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true })
    el.appendChild(ripple)
  }

  return (
    <div className="ct-overlay">
      <CinemaStyles />
      <div className="ct-glow" style={{ background: `radial-gradient(circle at 50% 30%, ${glow}, transparent 65%)` }} />

      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="ct-video"
          autoPlay={!tapDemo}
          preload="auto"
          playsInline
          onSeeked={handleSeeked}
          onTimeUpdate={e => handleTimeUpdate(e.currentTarget.currentTime)}
          onEnded={handleEnded}
        />
      ) : (
        <div className="ct-video ct-video--empty" aria-hidden />
      )}

      <div className="ct-scrim-top" />
      <div className="ct-scrim-bottom" />

      {review && !showTapDemo && (
        <div className="ct-review-bar">
          <div className="ct-review-head">
            <div className="ct-review-title-row">
              {deck.series && <span className="ct-review-id">{deck.id}</span>}
              <span className="ct-review-name">{deck.name}</span>
            </div>
            <div className="ct-review-actions">
              <button
                type="button"
                className="ct-review-moves-btn"
                onClick={() => setMovesOpen(true)}
              >
                Show moves
              </button>
              <button type="button" className="ct-review-train" onClick={handleTrain}>Train</button>
            </div>
          </div>
        </div>
      )}

      {!showTapDemo && (
        <button type="button" className="ct-close" onClick={onClose} aria-label="Exit review">✕</button>
      )}

      {!reviewEnded && !showTapDemo && (
        <div className="ct-tapzones">
          <button
            type="button"
            className="ct-tapzone ct-tapzone--nav"
            aria-label="Previous move"
            onPointerDown={flashNavPress}
            onClick={seekPrev}
          />
          <button type="button" className="ct-tapzone" aria-label="Play or pause" onClick={togglePlay} />
          <button
            type="button"
            className="ct-tapzone ct-tapzone--nav"
            aria-label="Next move"
            onPointerDown={flashNavPress}
            onClick={seekNext}
          />
        </div>
      )}

      {review && reviewEnded && (
        <div className="ct-play-again">
          <button type="button" className="ct-play-again-btn" aria-label="Play again" onClick={handlePlayAgain}>
            <span className="ct-play-again-icon" aria-hidden>↺</span>
          </button>
        </div>
      )}

      {showTapDemo && <ReviewTapDemo onComplete={() => setDemoComplete(true)} />}

      <div className={`ct-caption${review ? " ct-caption--review" : ""}${showTapDemo ? " ct-caption--demo" : ""}`}>
        <PartnerTags players={move.players} classPrefix="ct" />
        {!review && (
          <div className="ct-caption-index">Move {currentIndex + 1} / {deck.moves.length}</div>
        )}
        <MoveLabel move={move} className="ct-caption-text" />
        <div
          className="ct-progress"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {playableIndices.map(moveIdx => (
            <button
              key={moveIdx}
              type="button"
              className={`ct-progress-seg ${moveIdx <= currentIndex ? "ct-progress-seg--filled" : ""}`}
              aria-label={`Move ${moveIdx + 1}`}
              aria-current={moveIdx === currentIndex ? "step" : undefined}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                seekToIndex(moveIdx)
              }}
            />
          ))}
        </div>
      </div>

      {review && movesOpen && (
        <>
          <button
            type="button"
            className="ct-drawer-backdrop"
            aria-label="Close moves list"
            onClick={() => setMovesOpen(false)}
          />
          <div className="ct-drawer" role="dialog" aria-label="Move sequence">
            <div className="ct-drawer-head">
              <span className="ct-drawer-title">Sequence</span>
              <button type="button" className="ct-drawer-close" onClick={() => setMovesOpen(false)}>
                Close
              </button>
            </div>
            <div className="ct-drawer-body">
              <div className="ct-drawer-legend">
                <span className="ct-review-legend-a">■ Person A</span>
                <span className="ct-review-legend-b">■ Person B</span>
              </div>
              <div className="ct-drawer-moves">
                <MoveList
                  deck={deck}
                  moveSequence={[]}
                  visibleThroughIndex={deck.moves.length - 1}
                  moveIndices={playableIndices}
                  onMoveClick={seekToIndex}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CinemaStyles() {
  return (
    <style>{`
      .ct-overlay {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: #000;
        overflow: hidden;
      }

      .ct-glow {
        position: absolute;
        inset: -20%;
        filter: blur(60px);
        opacity: 0.55;
        transition: background 0.6s ease-out;
      }

      .ct-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ct-video--empty {
        background: #0a0a0c;
      }

      .ct-scrim-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 140px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.9), transparent);
      }

      .ct-scrim-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 220px;
        background: linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent);
      }

      .ct-close {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 30;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #fff;
        font-size: 0.85rem;
        line-height: 1;
      }

      .ct-review-bar {
        position: absolute;
        top: 14px;
        left: 14px;
        right: 54px;
        z-index: 25;
        pointer-events: none;
      }

      .ct-review-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
        pointer-events: auto;
      }

      .ct-review-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .ct-review-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
      }

      .ct-review-id {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.85rem;
        letter-spacing: 0.06em;
        color: rgba(255, 255, 255, 0.55);
      }

      .ct-review-name {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 1rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #fff;
        text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
      }

      .ct-review-train {
        pointer-events: auto;
        flex-shrink: 0;
        align-self: center;
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-on-accent);
        background: var(--color-accent);
        border: 1px solid var(--color-accent);
        padding: 7px 12px;
        line-height: 1;
      }

      .ct-review-moves-btn {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #ffd9a0;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 217, 160, 0.55);
        padding: 7px 12px;
        line-height: 1;
      }

      .ct-review-moves-btn:hover {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.55);
      }

      .ct-drawer-backdrop {
        position: absolute;
        inset: 0;
        z-index: 45;
        background: rgba(0, 0, 0, 0.55);
        border: none;
      }

      .ct-drawer {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 50;
        max-height: min(72vh, 520px);
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        animation: ct-drawer-in 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .ct-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px 8px;
        border-bottom: 1px solid var(--color-border-subtle);
      }

      .ct-drawer-title {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 1.44rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--color-text);
      }

      .ct-drawer-close {
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 1.3rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-muted);
        background: transparent;
        border: none;
        padding: 4px 0;
      }

      .ct-drawer-close:hover {
        color: var(--color-text);
      }

      .ct-drawer-body {
        padding: 10px 16px 20px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .ct-drawer-legend {
        display: flex;
        gap: 14px;
        margin-bottom: 10px;
        font-size: 22px;
      }

      .ct-drawer-moves {
        line-height: 1.35;
      }

      .ct-drawer-moves .text-xs,
      .ct-drawer-moves .move-label-btn,
      .ct-drawer-moves .text-partner-a,
      .ct-drawer-moves .text-partner-b {
        font-size: 1.2rem;
      }

      .ct-drawer-moves .flex {
        gap: 0.6rem;
        padding-top: 0.28rem;
        padding-bottom: 0.28rem;
      }

      .ct-drawer-moves .min-w-3\\.5 {
        min-width: 1.4rem;
        font-size: 1.2rem;
      }

      @keyframes ct-drawer-in {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }

      .ct-review-legend-a { color: var(--color-partner-a); }
      .ct-review-legend-b { color: var(--color-partner-b); }

      .ct-tapzones {
        position: absolute;
        inset: 0;
        z-index: 10;
        display: flex;
      }

      .ct-tapzone {
        height: 100%;
        background: transparent;
        border: none;
      }

      .ct-tapzone:nth-child(1),
      .ct-tapzone:nth-child(3) {
        flex: 0 0 27.5%;
      }

      .ct-tapzone:nth-child(2) {
        flex: 0 0 45%;
      }

      .ct-tapzone--nav {
        position: relative;
        overflow: hidden;
      }

      .ct-ripple {
        position: absolute;
        left: var(--tap-x, 50%);
        top: var(--tap-y, 50%);
        width: 96px;
        height: 96px;
        margin: -48px 0 0 -48px;
        border-radius: 50%;
        pointer-events: none;
        opacity: 0;
        transform: scale(0.25);
        background:
          radial-gradient(circle, rgba(0, 0, 0, 0.35) 0%, transparent 55%),
          radial-gradient(circle, transparent 48%, rgba(255, 255, 255, 0.35) 52%, transparent 58%);
        animation: ct-tap-dimple 480ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes ct-tap-dimple {
        0% { opacity: 0.95; transform: scale(0.25); }
        100% { opacity: 0; transform: scale(2.6); }
      }

      .ct-caption {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 15;
        padding: 0 20px 28px;
        pointer-events: auto;
      }

      .ct-caption--demo {
        opacity: 0.35;
      }

      .ct-partner-tag {
        display: inline-block;
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 2px;
        margin: 0 10px 8px 0;
      }

      .ct-partner-tag--A {
        background: rgba(93, 226, 93, 0.18);
        color: #5de25d;
      }

      .ct-partner-tag--B {
        background: rgba(120, 165, 255, 0.18);
        color: #78a5ff;
      }

      .ct-caption-index {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.55);
        margin-bottom: 2px;
      }

      .ct-caption-text {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: clamp(1.8rem, 8vw, 2.8rem);
        text-transform: uppercase;
        letter-spacing: -0.01em;
        line-height: 1.05;
        text-wrap: balance;
        text-shadow: 0 2px 20px rgba(0, 0, 0, 0.6);
      }

      .ct-caption--review .ct-caption-text {
        font-size: clamp(1.44rem, 6.4vw, 2.24rem);
      }

      .ct-progress {
        display: flex;
        gap: 3px;
        margin-top: 16px;
        position: relative;
        z-index: 16;
      }

      .ct-progress-seg {
        flex: 1;
        height: 7px;
        padding: 0;
        border: none;
        background: rgba(255, 255, 255, 0.25);
        cursor: pointer;
      }

      .ct-progress-seg--filled {
        background: var(--color-accent);
      }

      .ct-play-again {
        position: absolute;
        inset: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        animation: ct-play-again-in 200ms ease-out forwards;
      }

      .ct-play-again-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 96px;
        height: 96px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.65);
        color: #fff;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
        cursor: pointer;
      }

      .ct-play-again-btn:hover {
        background: rgba(255, 255, 255, 0.22);
      }

      .ct-play-again-btn:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 3px;
      }

      .ct-play-again-icon {
        font-size: 3.25rem;
        line-height: 1;
      }

      @keyframes ct-play-again-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .ct-drawer { animation: none; }
        .ct-play-again { animation: none; }
        .ct-ripple { animation: none; opacity: 0; }
      }
    `}</style>
  )
}
