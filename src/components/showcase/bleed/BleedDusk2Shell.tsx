import { useEffect, useRef, useState } from "react"
import type { Deck } from "../../../types/domain"
import { AnteBaseStyles, AnteDone, AnteHud, AnteOptions, AnteVerdict } from "../ante/AnteBits"
import { fadeLook } from "../ante/fadeLooks"
import { SlapOverlay, TappedStyles, type TappedCtx } from "../ante/SlapOverlay"
import { ANTE_CLOCK_MS, useAnteRound } from "../ante/useAnteRound"
import type { BleedVariant } from "./bleedVariant"

const CORRECT_HOLD_MS = 300
const EARNED_CLARITY = 4

interface BleedDusk2ShellProps {
  deck: Deck
  videoSrc: string
  variant: BleedVariant
}

/** Full-bleed dissolve + Slap In buzz hold + Blackout correct payoff. */
export default function BleedDusk2Shell({ deck, videoSrc, variant }: BleedDusk2ShellProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [open])

  return (
    <div>
      <BleedDusk2Styles />
      <button type="button" className="bl-launcher" onClick={() => setOpen(true)}>
        <span className="bl-launcher-meta">full-bleed · slap in · sharp payoff</span>
        <h2 className="bl-launcher-title">Enter {variant.title}</h2>
        <span className="bl-launcher-hint">{variant.hint}</span>
      </button>

      {open && (
        <BleedDusk2Overlay
          deck={deck}
          videoSrc={videoSrc}
          variant={variant}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

interface OverlayProps {
  deck: Deck
  videoSrc: string
  variant: BleedVariant
  onClose: () => void
}

function BleedDusk2Overlay({ deck, videoSrc, variant, onClose }: OverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streakRef = useRef(0)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  useEffect(() => setVideoEl(videoRef.current), [])
  const round = useAnteRound(deck, videoEl, {
    buzzHoldMs: null,
    correctHoldMs: CORRECT_HOLD_MS,
  })
  const { drill, live, ready, stake, remaining } = round

  useEffect(() => {
    if (drill.phase === "asking") streakRef.current = drill.streak
  }, [drill.phase, drill.streak])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (drill.phase === "done") {
    return (
      <div className="bl-overlay bl-overlay--done">
        <AnteBaseStyles />
        <BleedDusk2Styles />
        <button type="button" className="bl-close" onClick={onClose} aria-label="Exit bleed mode">✕</button>
        <div className="bl-done">
          <AnteDone round={round} line={variant.doneLine} />
        </div>
      </div>
    )
  }

  const p = live ? 1 - remaining / ANTE_CLOCK_MS : 0
  const look = fadeLook("dissolve", p)
  const dissolveFull = fadeLook("dissolve", 1)
  const buzzed = drill.phase === "wrong" && drill.picked === null
  const sharp = drill.phase === "correct"
  const videoFilter = sharp
    ? "none"
    : drill.phase === "wrong"
      ? buzzed
        ? dissolveFull.filter
        : "brightness(0.35) grayscale(0.8)"
      : !ready
        ? "brightness(0.85)"
        : look.filter
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
    <div className="bl-overlay" data-variant="dissolve">
      <AnteBaseStyles />
      <BleedDusk2Styles />
      <TappedStyles />

      <div className={`bl-stage ${buzzed ? "bl-stage--slap-buzz" : ""}`}>
        <video
          ref={videoRef}
          src={videoSrc}
          className={`bl-video ${sharp ? "bl2-video--sharp" : ""}`}
          style={{ filter: videoFilter, opacity: videoOpacity }}
          muted
          playsInline
          preload="auto"
        />

        {sharp && <div className="bl2-wipe" key={`wipe-${drill.beat}`} />}

        {(live || buzzed) && (
          <div className="bl-static" style={{ opacity: buzzed ? dissolveFull.veil : look.veil }} />
        )}

        {sharp && (
          <div className="bl2-earned" key={`earned-${drill.beat}`}>
            <span className="bl2-earned-word">Sharp</span>
            <span className="bl2-earned-sub">+{EARNED_CLARITY} clarity</span>
          </div>
        )}

        <div className="bl-scrim-top" />
        <div className="bl-scrim-bottom" />

        <AnteHud round={round} />
        {!buzzed && !sharp && <AnteVerdict round={round} buzzerWord="Tapped out!" />}

        {live && (
          <div className="bl-ghost" aria-hidden>
            <span className="bl-seconds">{seconds}</span>
            <span className="bl-stake" key={`stake-${stake}`}>×{stake}</span>
          </div>
        )}
        {drill.phase === "asking" && !live && <span className="bl-wait">tape rolling</span>}

        {buzzed && <SlapOverlay key={`buzz-${drill.beat}`} {...ctx} />}

        {!buzzed && (
          <div className="bl-deck">
            <AnteOptions round={round} />
          </div>
        )}
      </div>

      <button type="button" className="bl-close" onClick={onClose} aria-label="Exit bleed mode">✕</button>
    </div>
  )
}

function BleedDusk2Styles() {
  return (
    <style>{`
      .bl-launcher {
        display: block;
        width: 100%;
        text-align: left;
        border: 1px solid var(--color-border);
        background: linear-gradient(160deg, var(--color-surface), var(--color-bg));
        padding: 18px 16px;
      }

      .bl-launcher-meta {
        display: block;
        font-size: 0.62rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--color-muted);
        margin-bottom: 4px;
      }

      .bl-launcher-title {
        color: var(--color-accent);
        margin-bottom: 6px;
      }

      .bl-launcher-hint {
        display: block;
        font-size: 0.72rem;
        line-height: 1.5;
        color: color-mix(in srgb, var(--color-text), var(--color-muted) 30%);
      }

      .bl-overlay {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: #000;
        overflow: hidden;
        user-select: none;
      }

      .bl-overlay--done {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        background: var(--color-bg);
        overflow: auto;
      }

      .bl-done {
        width: min(420px, 100%);
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

      .bl-close {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 40;
        width: 36px;
        height: 36px;
        font-size: 1.1rem;
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

      .bl-deck {
        position: absolute;
        left: 50%;
        bottom: 48px;
        transform: translateX(-50%);
        width: calc(100% - 24px);
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        z-index: 4;
      }

      .bl-deck .ao-option {
        font-size: clamp(2.4rem, 10vw, 3.5rem);
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

      .bl-deck .ao-option--truth {
        border: none;
        background: color-mix(in srgb, var(--color-green) 52%, rgba(10, 10, 12, 0.42));
      }

      .bl-deck .ao-option--wrong {
        border: none;
        background: color-mix(in srgb, var(--color-accent) 52%, rgba(10, 10, 12, 0.42));
        text-decoration: line-through;
      }

      .bl-deck .ao-option--truth:disabled,
      .bl-deck .ao-option--truth:disabled:hover {
        opacity: 1;
        color: #fff;
        border: none;
        background: color-mix(in srgb, var(--color-green) 52%, rgba(10, 10, 12, 0.42));
      }

      .bl-deck .ao-option--wrong:disabled,
      .bl-deck .ao-option--wrong:disabled:hover {
        opacity: 1;
        color: #fff;
        border: none;
        background: color-mix(in srgb, var(--color-accent) 52%, rgba(10, 10, 12, 0.42));
        text-decoration: line-through;
      }

      .bl-overlay .ao-hud {
        z-index: 30;
        padding: 14px 56px 14px 14px;
        font-size: 11px;
      }

      .bl-overlay .ao-verdict {
        font-size: clamp(2.6rem, 10vw, 4rem);
        z-index: 35;
      }

      .bl-overlay .tp-veil {
        z-index: 20;
        gap: 20px;
      }

      .bl-overlay .tp-head--stamp,
      .bl-overlay .tp-head.tp-head--stamp {
        font-size: clamp(5.5rem, 22vw, 6.8rem);
      }

      .bl-overlay .tp-veil--slap .tp-cost {
        font-size: clamp(22.5px, 6.625vw, 27.5px);
        max-width: 34ch;
        margin-top: 2px;
      }

      .bl-overlay .tp-veil--slap .tp-note {
        font-size: clamp(18.75px, 5.25vw, 22.5px);
        margin-top: 2px;
      }

      .bl-overlay .tp-action {
        font-size: clamp(1.5rem, 6.5vw, 1.75rem);
        padding: 16px 28px;
      }

      .bl-overlay .tp-veil--slap .tp-action {
        margin-top: 10px;
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
