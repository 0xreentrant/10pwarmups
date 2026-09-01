import { useEffect, useState } from "react"

const STEP_MS = 2000

const INTRO = {
  stamp: "New train",
  body: "Tests your knowledge of each warmup, move by move. Call what's next before the clock dies.",
}

const STEPS = [
  {
    zone: "buttons" as const,
    label: "buttons",
    body: "Pick what comes next. Tap the right move.",
  },
  {
    zone: "timer" as const,
    label: "timer",
    body: "Clock runs while you think. Tap the tape to pause.",
  },
  {
    zone: "tapout" as const,
    label: "tapped out",
    body: "Miss or time out - slapped. Streak dies. Slap in to keep rolling.",
  },
]

type Phase = "intro" | "zones"

interface TrainingZonesDemoProps {
  onComplete: () => void
}

export default function TrainingZonesDemo({ onComplete }: TrainingZonesDemoProps) {
  const [phase, setPhase] = useState<Phase>("intro")
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (phase !== "zones") return
    if (stepIndex >= STEPS.length) {
      onComplete()
      return
    }
    const timer = window.setTimeout(() => setStepIndex(i => i + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [phase, stepIndex, onComplete])

  if (phase === "zones" && stepIndex >= STEPS.length) return null

  function advance() {
    if (phase === "intro") {
      setPhase("zones")
      return
    }
    setStepIndex(i => i + 1)
  }

  return (
    <div
      className={`bl-train-demo${phase === "intro" ? "" : " bl-train-demo--locked"}`}
      aria-hidden={phase !== "intro"}
      onClick={advance}
    >
      <TrainingZonesDemoStyles />
      {phase === "intro" ? (
        <div className="bl-train-demo-intro" role="dialog" aria-label="New train mode">
          <span className="bl-train-demo-stamp bl-train-demo-stamp--intro">{INTRO.stamp}</span>
          <p className="bl-train-demo-intro-body">{INTRO.body}</p>
          <button
            type="button"
            className="bl-train-demo-ok"
            onClick={e => {
              e.stopPropagation()
              advance()
            }}
          >
            OK
          </button>
        </div>
      ) : (
        <>
          {STEPS[stepIndex].zone === "tapout" && (
            <div className="bl-train-demo-slap">
              <span className="bl-train-demo-stamp">Tapped out</span>
            </div>
          )}
          <div className={`bl-train-demo-zone bl-train-demo-zone--${STEPS[stepIndex].zone}`} />
          <div className={`bl-train-demo-finger bl-train-demo-finger--${STEPS[stepIndex].zone}`}>
            <FingerIcon />
            <span className="bl-train-demo-label">{STEPS[stepIndex].label}</span>
            <span className="bl-train-demo-body">{STEPS[stepIndex].body}</span>
          </div>
        </>
      )}
    </div>
  )
}

function FingerIcon() {
  return (
    <svg className="bl-train-demo-finger-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"
      />
    </svg>
  )
}

function TrainingZonesDemoStyles() {
  return (
    <style>{`
      .bl-train-demo {
        position: absolute;
        inset: 0;
        z-index: 45;
        pointer-events: auto;
      }

      .bl-train-demo-intro {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 24px 20px;
        text-align: center;
        background: rgba(4, 4, 6, 0.82);
        animation: bl-train-demo-zone-in 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .bl-train-demo-intro-body {
        margin: 0;
        max-width: 34ch;
        font-family: var(--font-family-body);
        font-size: 16px;
        line-height: 1.45;
        color: rgba(232, 232, 232, 0.92);
      }

      .bl-train-demo-ok {
        margin-top: 4px;
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 1rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-on-accent);
        background: var(--color-accent);
        border: 1px solid var(--color-accent);
        padding: 12px 32px;
        line-height: 1;
      }

      .bl-train-demo-ok:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }

      .bl-train-demo--locked {
        pointer-events: auto;
        cursor: pointer;
      }

      .bl-train-demo-zone {
        position: absolute;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
        animation: bl-train-demo-zone-in 220ms ease-out forwards;
      }

      .bl-train-demo-zone--buttons {
        left: 0;
        right: 0;
        bottom: 0;
        height: 42%;
      }

      .bl-train-demo-zone--timer {
        left: 0;
        right: 0;
        top: 28%;
        height: 32%;
      }

      .bl-train-demo-zone--tapout {
        inset: 0;
        background: rgba(192, 57, 43, 0.18);
        box-shadow: inset 0 0 0 2px rgba(192, 57, 43, 0.55);
      }

      .bl-train-demo-slap {
        position: absolute;
        inset: 0;
        z-index: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(4, 4, 6, 0.72);
      }

      .bl-train-demo-stamp {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 2.4rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #fff;
        border: 3px solid var(--color-accent);
        padding: 8px 16px;
        transform: rotate(-4deg);
      }

      .bl-train-demo-stamp--intro {
        font-size: clamp(2.4rem, 10vw, 3rem);
        border-color: #fff;
        transform: rotate(-3deg);
        animation: bl-train-demo-stamp-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .bl-train-demo-finger {
        position: absolute;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        color: #fff;
        filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.65));
        animation: bl-train-demo-tap 680ms ease-out infinite;
      }

      .bl-train-demo-finger--buttons {
        left: 50%;
        bottom: 22%;
        transform: translate(-50%, 0);
        animation-name: bl-train-demo-tap-up;
      }

      .bl-train-demo-finger--timer {
        left: 50%;
        top: 42%;
        transform: translate(-50%, -50%);
      }

      .bl-train-demo-finger--tapout {
        left: 50%;
        top: 58%;
        transform: translate(-50%, -50%);
      }

      .bl-train-demo-finger-icon {
        width: 52px;
        height: 52px;
      }

      .bl-train-demo-label {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.9rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.92);
        white-space: nowrap;
        background: rgba(0, 0, 0, 0.55);
        padding: 5px 10px;
        border: 1px solid rgba(255, 255, 255, 0.25);
      }

      .bl-train-demo-body {
        max-width: 30ch;
        text-align: center;
        font-family: var(--font-family-body);
        font-size: 14px;
        line-height: 1.4;
        color: rgba(232, 232, 232, 0.9);
        background: rgba(0, 0, 0, 0.7);
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.18);
      }

      @keyframes bl-train-demo-zone-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes bl-train-demo-stamp-in {
        from { opacity: 0; transform: translateY(8px) rotate(-3deg); }
        to { opacity: 1; transform: rotate(-3deg); }
      }

      @keyframes bl-train-demo-tap {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        45% { transform: translate(-50%, -58%) scale(0.9); }
      }

      @keyframes bl-train-demo-tap-up {
        0%, 100% { transform: translate(-50%, 0) scale(1); }
        45% { transform: translate(-50%, -8%) scale(0.9); }
      }

      @media (prefers-reduced-motion: reduce) {
        .bl-train-demo-zone,
        .bl-train-demo-intro,
        .bl-train-demo-stamp--intro { animation: none; }
        .bl-train-demo-finger { animation: none; }
      }
    `}</style>
  )
}
