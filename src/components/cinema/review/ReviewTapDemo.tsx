import { useEffect, useState } from "react"

const STEP_MS = 1200

const STEPS = [
  { zone: "left" as const, label: "prev move" },
  { zone: "center" as const, label: "pause vid" },
  { zone: "right" as const, label: "next move" },
]

interface ReviewTapDemoProps {
  onComplete: () => void
}

export default function ReviewTapDemo({ onComplete }: ReviewTapDemoProps) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (stepIndex >= STEPS.length) {
      onComplete()
      return
    }
    const timer = window.setTimeout(() => setStepIndex(i => i + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [stepIndex, onComplete])

  if (stepIndex >= STEPS.length) return null

  const step = STEPS[stepIndex]

  return (
    <div className="ct-tap-demo" aria-hidden>
      <ReviewTapDemoStyles />
      <div className={`ct-tap-demo-zone ct-tap-demo-zone--${step.zone}`} />
      <div className={`ct-tap-demo-finger ct-tap-demo-finger--${step.zone}`}>
        <FingerIcon />
        <span className="ct-tap-demo-label">{step.label}</span>
      </div>
    </div>
  )
}

function FingerIcon() {
  return (
    <svg className="ct-tap-demo-finger-icon" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"
      />
    </svg>
  )
}

function ReviewTapDemoStyles() {
  return (
    <style>{`
      .ct-tap-demo {
        position: absolute;
        inset: 0;
        z-index: 40;
        pointer-events: auto;
      }

      .ct-tap-demo-zone {
        position: absolute;
        top: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
        animation: ct-tap-demo-zone-in 220ms ease-out forwards;
      }

      .ct-tap-demo-zone--left {
        left: 0;
        width: 50%;
      }

      .ct-tap-demo-zone--center {
        left: 33.333%;
        width: 33.333%;
      }

      .ct-tap-demo-zone--right {
        right: 0;
        width: 50%;
      }

      .ct-tap-demo-finger {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        color: #fff;
        filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.65));
        animation: ct-tap-demo-tap 680ms ease-out infinite;
      }

      .ct-tap-demo-finger--left {
        left: 25%;
        top: 42%;
        transform: translate(-50%, -50%);
      }

      .ct-tap-demo-finger--center {
        left: 50%;
        top: 42%;
        transform: translate(-50%, -50%);
      }

      .ct-tap-demo-finger--right {
        left: 75%;
        top: 42%;
        transform: translate(-50%, -50%);
      }

      .ct-tap-demo-finger-icon {
        width: 44px;
        height: 44px;
      }

      .ct-tap-demo-label {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.92);
        white-space: nowrap;
      }

      @keyframes ct-tap-demo-zone-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes ct-tap-demo-tap {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        45% { transform: translate(-50%, -58%) scale(0.9); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ct-tap-demo-zone { animation: none; }
        .ct-tap-demo-finger { animation: none; }
      }
    `}</style>
  )
}
