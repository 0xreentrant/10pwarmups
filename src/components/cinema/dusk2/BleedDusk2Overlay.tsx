import { useEffect, useRef, useState } from "react"
import { usePersistedMediaVolume } from "../../../hooks/usePersistedMediaVolume"
import type { Deck, ProgressMap, Session } from "../../../types/domain"
import { AnteBaseStyles, AnteOptions, AnteVerdict } from "../ante/AnteBits"
import { fadeLook } from "../ante/fadeLooks"
import { SlapOverlay, TappedStyles, type TappedCtx } from "../ante/SlapOverlay"
import { ANTE_CLOCK_MS, useAnteRound, type DrillPhase } from "../ante/useAnteRound"
import type { BleedVariant } from "./bleedVariant"
import Dusk2CompleteOverlay from "./Dusk2CompleteOverlay"

const CORRECT_HOLD_MS = 300

/** Video filter for the bleed stage; exported for tests. */
export function bleedVideoFilter(
  phase: DrillPhase,
  picked: number | null,
  ready: boolean,
  askingLook: ReturnType<typeof fadeLook>,
  dissolveFull: ReturnType<typeof fadeLook>,
): string {
  const buzzed = phase === "wrong" && picked === null
  const revealing = phase === "correct" || (phase === "wrong" && picked !== null)
  if (revealing) return "none"
  if (phase === "wrong") return buzzed ? dissolveFull.filter : "brightness(0.35) grayscale(0.8)"
  if (!ready) return "brightness(0.85)"
  return askingLook.filter
}
const EARNED_CLARITY = 4

interface OverlayProps {
  deck: Deck
  session: Session
  progress: ProgressMap
  videoSrc: string | null
  variant: BleedVariant
  onOptionClick: (optionIndex: number) => void
  onTapOut?: () => void
  onClose: () => void
  onReview?: () => void
  onRestart?: () => void
  onNext: () => void
  onHome: () => void
  onTryAgain: () => void
  onStats: () => void
  /** Optional in-memory timestamps (e.g. tagger preview). */
  timestamps?: (number | null)[] | null
}

/** Full-bleed dissolve + Slap In buzz hold + Blackout correct payoff. */
export default function BleedDusk2Overlay({
  deck,
  session,
  progress,
  videoSrc,
  variant,
  onOptionClick,
  onTapOut,
  onClose,
  onReview,
  onRestart,
  onNext,
  onHome,
  onTryAgain,
  onStats,
  timestamps: timestampOverrides = null,
}: OverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streakRef = useRef(0)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [showComplete, setShowComplete] = useState(
    () => !!session.locked && !!session.finalAttempt,
  )

  useEffect(() => {
    setVideoEl(videoSrc ? videoRef.current : null)
  }, [videoSrc])

  // Autoplay needs mute; still restore volume level without writing mute back.
  usePersistedMediaVolume(videoEl, { forceMuted: true })

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [])

  const round = useAnteRound({
    deck,
    session,
    videoEl,
    onOptionClick,
    onTapOut,
    onRestart,
    timestamps: timestampOverrides,
    config: {
      buzzHoldMs: null,
      correctHoldMs: CORRECT_HOLD_MS,
    },
  })
  const { drill, live, ready, stake, remaining } = round

  useEffect(() => {
    if (drill.phase === "asking") streakRef.current = drill.streak
  }, [drill.phase, drill.streak])

  useEffect(() => {
    if (session.locked && session.finalAttempt) setShowComplete(true)
  }, [session.locked, session.finalAttempt])

  useEffect(() => {
    if (!showComplete || !videoEl) return
    videoEl.pause()
    if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
      videoEl.currentTime = videoEl.duration
    }
  }, [showComplete, videoEl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const finale = showComplete || drill.phase === "done" || session.locked
  const p = live ? 1 - remaining / ANTE_CLOCK_MS : 0
  const look = fadeLook("dissolve", p)
  const dissolveFull = fadeLook("dissolve", 1)
  const buzzed = !finale && drill.phase === "wrong" && drill.picked === null
  const sharp = finale || drill.phase === "correct"
  const videoFilter = finale
    ? "none"
    : bleedVideoFilter(drill.phase, drill.picked, ready, look, dissolveFull)
  const videoOpacity = sharp
    ? 1
    : buzzed
      ? dissolveFull.videoOpacity
      : drill.phase === "asking" && ready
        ? look.videoOpacity
        : 1
  const seconds = (remaining / 1000).toFixed(1)
  const ctx: TappedCtx = { round, deck, prevStreak: streakRef.current }

  return (
    <div className="bl-overlay" data-variant={variant.id}>
      <AnteBaseStyles />
      <BleedDusk2Styles />
      <TappedStyles />

      {!showComplete && (
        <div className="bl-top-bar">
          <div className="bl-top-left">
            <span className="bl-progress">{drill.moveIdx + 1}</span>
            {onReview && (
              <button type="button" className="bl-review" onClick={onReview}>
                Review
              </button>
            )}
          </div>
          <div className="bl-top-right">
            <span className="bl-streak" aria-label={`Streak: ${drill.streak}`}>
              {drill.streak} streak
            </span>
            <button type="button" className="bl-close" onClick={onClose} aria-label="Exit training">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={`bl-stage ${buzzed ? "bl-stage--slap-buzz" : ""}`}>
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className={`bl-video ${sharp ? "bl2-video--sharp" : ""}`}
            style={{ filter: videoFilter, opacity: videoOpacity }}
            muted
            playsInline
            preload="auto"
          />
        ) : (
          <div className="bl-video bl-video--empty" aria-hidden />
        )}

        {drill.phase === "correct" && !showComplete && (
          <div className="bl2-wipe" key={`wipe-${drill.beat}`} />
        )}

        {(live || buzzed) && (
          <div className="bl-static" style={{ opacity: buzzed ? dissolveFull.veil : look.veil }} />
        )}

        {drill.phase === "correct" && !showComplete && (
          <div className="bl2-earned" key={`earned-${drill.beat}`}>
            <span className="bl2-earned-word">Sharp</span>
            <span className="bl2-earned-sub">+{EARNED_CLARITY} clarity</span>
          </div>
        )}

        <div className="bl-scrim-top" />
        <div className="bl-scrim-bottom" />

        {!finale && !buzzed && !sharp && <AnteVerdict round={round} buzzerWord="Tapped out!" />}

        {live && (
          <div className="bl-ghost" aria-hidden>
            <span className="bl-seconds">{seconds}</span>
            <span className="bl-stake" key={`stake-${stake}`}>×{stake}</span>
          </div>
        )}
        {drill.phase === "asking" && !live && !finale && (
          <span className="bl-wait">{videoSrc ? "tape rolling" : "get ready"}</span>
        )}

        {buzzed && <SlapOverlay key={`buzz-${drill.beat}`} {...ctx} />}

        {showComplete && session.finalAttempt && (
          <Dusk2CompleteOverlay
            deck={deck}
            session={session}
            progress={progress}
            onNext={onNext}
            onHome={onHome}
            onTryAgain={onTryAgain}
            onStats={onStats}
          />
        )}

        {!finale && !buzzed && (
          <div className="bl-quiz">
            <span className={`bl-partner-tag bl-partner-tag--${drill.move.partner}`}>
              Person {drill.move.partner}
            </span>
            <div className="bl-deck">
              <AnteOptions round={round} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BleedDusk2Styles() {
  return (
    <style>{`
      .bl-overlay {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: #000;
        overflow: hidden;
        user-select: none;
        container-type: inline-size;
      }

      .bl-stage {
        position: absolute;
        inset: 0;
      }

      .bl-stage--slap-buzz .bl-video {
        transition: filter 420ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .bl-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: filter 120ms linear, opacity 120ms linear, transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .bl-video--empty {
        background: #0a0a0c;
      }

      .bl-static {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        background: rgba(255, 255, 255, 0.08);
      }

      .bl2-video--sharp {
        transform: scale(1);
        filter: none !important;
      }

      .bl-scrim-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 130px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.82), transparent);
        pointer-events: none;
        z-index: 2;
      }

      .bl-scrim-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 280px;
        background: linear-gradient(0deg, rgba(0, 0, 0, 0.88), transparent);
        pointer-events: none;
        z-index: 2;
      }

      .bl2-wipe {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 3;
        background: linear-gradient(100deg, rgba(255, 255, 255, 0) 35%, rgba(255, 255, 255, 0.55) 50%, rgba(255, 255, 255, 0) 65%);
        animation: bl2-wipe 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      .bl2-earned {
        position: absolute;
        left: 0;
        right: 0;
        top: 42%;
        z-index: 8;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        pointer-events: none;
        animation: bl2-earned-in 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .bl2-earned-word {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: clamp(2.85rem, 10vw, 4.4rem);
        line-height: 1;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #f2fff6;
        text-shadow: 0 0 18px rgba(39, 174, 96, 0.9), 0 0 48px rgba(39, 174, 96, 0.45);
      }

      .bl2-earned-sub {
        font-size: clamp(12px, 3.2vw, 14px);
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #cfd6da;
      }

      .bl-top-bar {
        position: absolute;
        top: 12px;
        left: 12px;
        right: 12px;
        z-index: 40;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        pointer-events: none;
      }

      .bl-top-left {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        min-width: 0;
        pointer-events: auto;
      }

      .bl-top-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        pointer-events: auto;
      }

      .bl-progress {
        font-family: var(--font-family-disp);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #fff;
        line-height: 1;
      }

      .bl-streak {
        font-family: var(--font-family-disp);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #fff;
        line-height: 1;
      }

      .bl-review {
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #fff;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.28);
        padding: 7px 12px;
        line-height: 1;
      }

      .bl-close {
        width: 32px;
        height: 32px;
        font-size: 0.85rem;
        line-height: 1;
        color: #fff;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.28);
      }

      .bl-ghost {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        pointer-events: none;
        z-index: 3;
      }

      .bl-seconds {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: clamp(3.6rem, 14vw, 6.5rem);
        line-height: 1;
        font-variant-numeric: tabular-nums;
        color: rgba(255, 255, 255, 0.28);
        text-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
        mix-blend-mode: screen;
      }

      .bl-stake {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: clamp(1.9rem, 5vw, 2.05rem);
        color: #ffd9a0;
        text-shadow: 0 0 14px rgba(255, 170, 60, 0.8);
        animation: bl-stake-drop 300ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes bl-stake-drop {
        from { opacity: 0.3; transform: translateY(-4px) scale(1.3); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .bl-wait {
        position: absolute;
        left: 0;
        right: 0;
        top: 42%;
        text-align: center;
        font-size: 11px;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.65);
        pointer-events: none;
        z-index: 3;
      }

      .bl-quiz {
        position: absolute;
        left: 50%;
        bottom: 48px;
        transform: translateX(-50%);
        width: calc(100% - 24px);
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 4;
      }

      .bl-partner-tag {
        display: inline-block;
        align-self: flex-start;
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 0.936rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 2px;
      }

      .bl-partner-tag--A {
        background: rgba(93, 226, 93, 0.18);
        color: #5de25d;
      }

      .bl-partner-tag--B {
        background: rgba(120, 165, 255, 0.18);
        color: #78a5ff;
      }

      .bl-deck {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .bl-deck .ao-option {
        /* ponytail: cqw tracks overlay (phone frame); no rem floor below ~240px-wide. */
        font-size: min(2.625rem, 7.5cqw);
        line-height: 1.1;
        padding: 16px 8px;
        background: rgba(10, 10, 12, 0.42);
        border: none;
        color: #fff;
        backdrop-filter: blur(3px);
      }

      .bl-deck .ao-option:not(:disabled):hover {
        background: rgba(10, 10, 12, 0.55);
      }

      .bl-deck .ao-option:disabled:not(.ao-option--truth):not(.ao-option--wrong) {
        opacity: 0.38;
        color: rgba(255, 255, 255, 0.38);
        background: rgba(10, 10, 12, 0.38);
        border: none;
      }

      .bl-deck .ao-option:disabled:not(.ao-option--truth):not(.ao-option--wrong):hover {
        background: rgba(10, 10, 12, 0.38);
        border: none;
      }

      .bl-deck .ao-option.ao-option--truth,
      .bl-deck .ao-option.ao-option--truth:disabled,
      .bl-deck .ao-option.ao-option--truth:disabled:hover {
        opacity: 1;
        color: #f2fff7;
        border: 2px solid var(--color-green);
        background: color-mix(in srgb, var(--color-green) 58%, rgba(10, 10, 12, 0.55));
        backdrop-filter: none;
        box-shadow: 0 0 18px color-mix(in srgb, var(--color-green) 42%, transparent);
      }

      .bl-deck .ao-option.ao-option--wrong,
      .bl-deck .ao-option.ao-option--wrong:disabled,
      .bl-deck .ao-option.ao-option--wrong:disabled:hover {
        opacity: 1;
        color: #fff0ee;
        border: 2px solid var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 58%, rgba(10, 10, 12, 0.55));
        backdrop-filter: none;
        box-shadow: 0 0 18px color-mix(in srgb, var(--color-accent) 42%, transparent);
        text-decoration: line-through;
      }

      .bl-overlay .ao-verdict {
        font-size: clamp(2.6rem, 10vw, 4rem);
        z-index: 35;
      }

      .bl-overlay .ao-verdict--hit {
        color: #f2fff7;
        text-shadow: 0 0 20px rgba(39, 174, 96, 0.95), 0 0 54px rgba(39, 174, 96, 0.45);
      }

      .bl-overlay .ao-verdict--miss {
        color: #fff0ee;
        text-shadow: 0 0 20px rgba(192, 57, 43, 0.95), 0 0 50px rgba(192, 57, 43, 0.5);
      }

      .bl-overlay .tp-veil {
        z-index: 20;
        gap: 20px;
      }

      .bl-overlay .tp-head--stamp,
      .bl-overlay .tp-head.tp-head--stamp {
        font-size: clamp(4.4rem, 17.6vw, 5.44rem);
      }

      .bl-overlay .tp-veil--slap .tp-cost {
        font-size: clamp(18px, 5.3vw, 22px);
        max-width: 34ch;
        margin-top: 2px;
      }

      .bl-overlay .tp-veil--slap .tp-note {
        font-size: clamp(15px, 4.2vw, 18px);
        margin-top: 2px;
      }

      .bl-overlay .tp-action {
        font-size: clamp(1.2rem, 5.2vw, 1.4rem);
        padding: 13px 22px;
      }

      .bl-overlay .tp-veil--slap .tp-action {
        margin-top: 8px;
      }

      @keyframes bl2-wipe {
        0% { opacity: 0; transform: translateX(-100%); }
        30% { opacity: 1; }
        100% { opacity: 0; transform: translateX(100%); }
      }

      @keyframes bl2-earned-in {
        0% { opacity: 0; transform: scale(1.45); filter: blur(6px); }
        55% { opacity: 1; transform: scale(1); filter: blur(0); }
        100% { opacity: 1; transform: scale(1); filter: blur(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .bl-stake { animation: none; }
        .bl-stage--slap-buzz .bl-video { transition-duration: 90ms; }
        .bl2-wipe { animation: none; opacity: 0; }
        .bl2-earned { animation: none; opacity: 1; }
      }
    `}</style>
  )
}
