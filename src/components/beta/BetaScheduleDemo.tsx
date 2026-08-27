import { useEffect, useState } from "react"

const STEP_MS = import.meta.env.VITEST ? 50 : 4000

const SERIES_STEPS = [
  { zone: "tracker", label: "schedule", body: "This week at a glance. Tap a day to jump to that group." },
  { zone: "review", label: "review", body: "Watch the warmup first. Learn the moves before you train." },
  { zone: "train", label: "train", body: "Test yourself move by move in cinematic train mode." },
] as const

const DECK_STEPS = [
  { zone: "review", label: "review", body: "Watch the warmup first. Learn the moves before you train." },
  { zone: "train", label: "train", body: "Test yourself move by move in cinematic train mode." },
] as const

type DemoZone = (typeof SERIES_STEPS)[number]["zone"]

interface ZoneRect {
  top: number
  left: number
  width: number
  height: number
}

interface BetaScheduleDemoProps {
  mode: "series" | "deck"
  onComplete: () => void
}

function zoneSelector(zone: DemoZone): string {
  return `[data-beta-demo="${zone}"]`
}

function readZoneRect(zone: DemoZone): ZoneRect | null {
  const el = document.querySelector(zoneSelector(zone))
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

export default function BetaScheduleDemo({ mode, onComplete }: BetaScheduleDemoProps) {
  const steps = mode === "series" ? SERIES_STEPS : DECK_STEPS
  const [stepIndex, setStepIndex] = useState(0)
  const [zoneRect, setZoneRect] = useState<ZoneRect | null>(null)

  useEffect(() => {
    if (stepIndex >= steps.length) {
      onComplete()
      return
    }
    const timer = window.setTimeout(() => setStepIndex(i => i + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [stepIndex, steps.length, onComplete])

  useEffect(() => {
    if (stepIndex >= steps.length) return

    const update = () => {
      setZoneRect(readZoneRect(steps[stepIndex].zone))
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [stepIndex, steps])

  if (stepIndex >= steps.length) return null

  const step = steps[stepIndex]
  const fingerStyle = zoneRect
    ? {
        top: zoneRect.top + zoneRect.height / 2,
        left: zoneRect.left + zoneRect.width / 2,
      }
    : null

  return (
    <div className="bt-sched-demo bt-sched-demo--locked" aria-hidden>
      <BetaScheduleDemoStyles />
      {zoneRect && (
        <div
          className="bt-sched-demo-zone"
          style={{
            top: zoneRect.top,
            left: zoneRect.left,
            width: zoneRect.width,
            height: zoneRect.height,
          }}
        />
      )}
      {fingerStyle && (
        <div
          className="bt-sched-demo-finger"
          style={{ top: fingerStyle.top, left: fingerStyle.left }}
        >
          <FingerIcon />
          <span className="bt-sched-demo-label">{step.label}</span>
          <span className="bt-sched-demo-body">{step.body}</span>
        </div>
      )}
    </div>
  )
}

function FingerIcon() {
  return (
    <svg className="bt-sched-demo-finger-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"
      />
    </svg>
  )
}

function BetaScheduleDemoStyles() {
  return (
    <style>{`
      .bt-sched-demo {
        position: fixed;
        inset: 0;
        z-index: 45;
        pointer-events: auto;
      }

      .bt-sched-demo--locked {
        cursor: default;
      }

      .bt-sched-demo-zone {
        position: fixed;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
        animation: bt-sched-demo-zone-in 220ms ease-out forwards;
      }

      .bt-sched-demo-finger {
        position: fixed;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        color: #fff;
        transform: translate(-50%, -50%);
        filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.65));
        animation: bt-sched-demo-tap 680ms ease-out infinite;
      }

      .bt-sched-demo-finger-icon {
        width: 52px;
        height: 52px;
      }

      .bt-sched-demo-label {
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

      .bt-sched-demo-body {
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

      @keyframes bt-sched-demo-zone-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes bt-sched-demo-tap {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        45% { transform: translate(-50%, -58%) scale(0.9); }
      }

      @media (prefers-reduced-motion: reduce) {
        .bt-sched-demo-zone { animation: none; }
        .bt-sched-demo-finger { animation: none; }
      }
    `}</style>
  )
}
