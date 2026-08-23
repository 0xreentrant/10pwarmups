import { useEffect, useRef, useState } from "react"
import MoveLabel from "../../MoveLabel"
import MoveList from "../../MoveList"
import type { Deck } from "../../../types/domain"
import { captureAmbientColor } from "../frameCapture"
import { useMoveTimeline } from "../useMoveTimeline"

interface CinemaOverlayProps {
  deck: Deck
  videoSrc: string | null
  /** Full sequence on the scrubber with Train affordance, no quiz. */
  review?: boolean
  onClose: () => void
  onTrain?: () => void
}

export default function CinemaOverlay({
  deck,
  videoSrc,
  review = false,
  onClose,
  onTrain,
}: CinemaOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const seekSyncRef = useRef({ active: false, resume: false })
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [time, setTime] = useState(0)
  const [glow, setGlow] = useState("rgb(192, 57, 43)")
  const [movesOpen, setMovesOpen] = useState(false)
  const timeline = useMoveTimeline(deck.moves.length, videoEl)
  const currentIndex = timeline ? timeline.moveIndexAt(time) : 0

  useEffect(() => {
    setVideoEl(videoSrc ? videoRef.current : null)
  }, [videoSrc])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    if (!timeline || !videoSrc) return
    captureAmbientColor(videoSrc, timeline.timestamps[currentIndex]).then(setGlow).catch(() => {})
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
      if (e.key === "Escape" && !movesOpen) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, movesOpen])

  const seekToIndex = (i: number) => {
    if (!timeline) return
    const clamped = Math.min(deck.moves.length - 1, Math.max(0, i))
    const t = timeline.timestamps[clamped]
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
    if (video.paused) video.play()
    else video.pause()
  }

  const move = deck.moves[currentIndex]
  const handleTrain = onTrain ?? onClose

  return (
    <div className="ct-overlay">
      <CinemaStyles />
      <div className="ct-glow" style={{ background: `radial-gradient(circle at 50% 30%, ${glow}, transparent 65%)` }} />

      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="ct-video"
          autoPlay
          playsInline
          onSeeked={handleSeeked}
          onTimeUpdate={e => handleTimeUpdate(e.currentTarget.currentTime)}
        />
      ) : (
        <div className="ct-video ct-video--empty" aria-hidden />
      )}

      <div className="ct-scrim-top" />
      <div className="ct-scrim-bottom" />

      {review && (
        <div className="ct-review-bar">
          <div className="ct-review-deck">
            {deck.series && <span className="ct-review-id">{deck.id}</span>}
            <span className="ct-review-name">{deck.name}</span>
          </div>
          <button type="button" className="ct-review-train" onClick={handleTrain}>Train</button>
        </div>
      )}

      <button type="button" className="ct-close" onClick={onClose} aria-label="Exit review">✕</button>

      <div className="ct-tapzones">
        <button type="button" className="ct-tapzone" aria-label="Previous move" onClick={() => seekToIndex(currentIndex - 1)} />
        <button type="button" className="ct-tapzone" aria-label="Play or pause" onClick={togglePlay} />
        <button type="button" className="ct-tapzone" aria-label="Next move" onClick={() => seekToIndex(currentIndex + 1)} />
      </div>

      <div className={`ct-caption${review ? " ct-caption--review" : ""}`}>
        {review && (
          <div className="ct-review-seq-row">
            <button
              type="button"
              className="ct-review-moves-link"
              onClick={() => setMovesOpen(true)}
            >
              Show moves
            </button>
          </div>
        )}
        <span className={`ct-partner-tag ct-partner-tag--${move.partner}`}>Person {move.partner}</span>
        {!review && (
          <div className="ct-caption-index">Move {currentIndex + 1} / {deck.moves.length}</div>
        )}
        <MoveLabel move={move} className="ct-caption-text" />
        <div
          className="ct-progress"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {timeline?.timestamps.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`ct-progress-seg ${i <= currentIndex ? "ct-progress-seg--filled" : ""}`}
              aria-label={`Move ${i + 1}`}
              aria-current={i === currentIndex ? "step" : undefined}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                seekToIndex(i)
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
        height: 90px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.65), transparent);
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
        top: 16px;
        right: 16px;
        z-index: 20;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #fff;
      }

      .ct-review-bar {
        position: absolute;
        top: 14px;
        left: 14px;
        right: 56px;
        z-index: 25;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        pointer-events: none;
      }

      .ct-review-deck {
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
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-on-accent);
        background: var(--color-accent);
        border: 1px solid var(--color-accent);
        padding: 8px 14px;
      }

      .ct-review-seq-row {
        margin-bottom: 6px;
        pointer-events: auto;
      }

      .ct-review-moves-link {
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 1.4rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #ffd9a0;
        background: transparent;
        border: none;
        padding: 6px 3px;
        min-height: 33px;
        text-decoration: underline;
        text-underline-offset: 7px;
      }

      .ct-review-moves-link:hover {
        color: #fff;
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
        font-size: 1.5rem;
      }

      .ct-drawer-moves .flex {
        gap: 0.75rem;
        padding-top: 0.35rem;
        padding-bottom: 0.35rem;
      }

      .ct-drawer-moves .min-w-3\\.5 {
        min-width: 1.75rem;
        font-size: 1.5rem;
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
        flex: 1;
        height: 100%;
        background: transparent;
        border: none;
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
        margin-top: 10px;
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

      @media (prefers-reduced-motion: reduce) {
        .ct-drawer { animation: none; }
      }
    `}</style>
  )
}
