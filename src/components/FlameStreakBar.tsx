import { useId, type CSSProperties } from "react"

const MIN_FLAME_PERCENT = 45

const FLAME_SRC = {
  blaze: "/fire-emojis/fire-emoji-blaze-flicker.svg",
  inferno: "/fire-emojis/fire-emoji-inferno-flicker.svg",
  wild: "/fire-emojis/fire-emoji-wild-flicker.svg",
} as const

type FlameTier = keyof typeof FLAME_SRC

interface FlameStreakBarProps {
  value: number
  max: number
  /** Show crown flame from the first step; otherwise from MIN_FLAME_PERCENT. */
  flameFromStart?: boolean
}

function flameTier(percent: number): FlameTier {
  if (percent >= 94) return "wild"
  if (percent >= 75) return "inferno"
  return "blaze"
}

function crownFlameSize(percent: number) {
  return 12 + (percent / 100) * 22
}

function flameGlow(tier: FlameTier, percent: number) {
  const r = 3 + percent * 0.1
  if (tier === "wild") {
    return [
      `drop-shadow(0 0 ${r * 1.2}px rgba(255, 240, 180, 0.95))`,
      `drop-shadow(0 0 ${r * 2.2}px rgba(255, 180, 50, 0.9))`,
      `drop-shadow(0 0 ${r * 3.8}px rgba(255, 100, 0, 0.7))`,
      `drop-shadow(0 0 ${r * 6}px rgba(255, 40, 0, 0.45))`,
      `drop-shadow(0 0 ${r * 9}px rgba(180, 20, 0, 0.25))`,
    ].join(" ")
  }
  if (tier === "inferno") {
    return [
      `drop-shadow(0 0 ${r}px rgba(255, 200, 80, 0.85))`,
      `drop-shadow(0 0 ${r * 2}px rgba(255, 120, 20, 0.65))`,
      `drop-shadow(0 0 ${r * 3.5}px rgba(255, 60, 0, 0.4))`,
      `drop-shadow(0 0 ${r * 5.5}px rgba(200, 30, 0, 0.2))`,
    ].join(" ")
  }
  return [
    `drop-shadow(0 0 ${r * 0.8}px rgba(255, 180, 60, 0.75))`,
    `drop-shadow(0 0 ${r * 1.6}px rgba(255, 120, 0, 0.5))`,
    `drop-shadow(0 0 ${r * 2.8}px rgba(220, 60, 0, 0.25))`,
  ].join(" ")
}

function flameImgHeight(size: number, tier: FlameTier) {
  if (tier === "wild") return size * 1.28
  if (tier === "inferno") return size * 1.18
  return size * 1.1
}

function heatIntensity(percent: number) {
  return Math.min(1, 0.35 + percent / 115)
}

function glowShadow(percent: number) {
  if (percent <= 4) return "none"
  const spread = 4 + percent * 0.18
  const alpha = heatIntensity(percent) * 0.45
  return [
    `0 0 ${spread}px rgba(255, 140, 40, ${alpha})`,
    `0 0 ${spread * 2}px rgba(255, 80, 10, ${alpha * 0.45})`,
    `0 0 ${spread * 0.6}px rgba(255, 200, 80, ${alpha * 0.35})`,
  ].join(", ")
}

function CrownFlameTip({
  tier,
  percent,
  size,
}: {
  tier: FlameTier
  percent: number
  size: number
}) {
  const glow = flameGlow(tier, percent)
  const isWild = tier === "wild"

  return (
    <img
      src={FLAME_SRC[tier]}
      alt=""
      className={`fsb-crown-flame fsb-crown-flame--alive fsb-crown-flame--instant${tier === "inferno" ? " fsb-crown-flame--inferno" : ""}${isWild ? " fsb-crown-flame--wild" : ""}`}
      style={{
        left: `${percent}%`,
        width: size,
        height: flameImgHeight(size, tier),
        "--fsb-crown-glow": glow,
        "--fsb-float-dur": isWild ? "0.35s" : "2.1s",
      } as CSSProperties}
      aria-hidden
    />
  )
}

function FlameFill({
  percent,
  bodyGrad,
  tongueGrad,
}: {
  percent: number
  bodyGrad: string
  tongueGrad: string
}) {
  const hot = heatIntensity(percent)

  return (
    <div
      className="fsb-fill"
      style={{
        width: `${percent}%`,
        filter: `brightness(${0.9 + hot * 0.18})`,
        boxShadow: glowShadow(percent),
      }}
    >
      <svg className="fsb-svg" viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={bodyGrad} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3a0c06" />
            <stop offset="50%" stopColor="#c43810" />
            <stop offset="100%" stopColor="#ffc050" />
          </linearGradient>
          <linearGradient id={tongueGrad} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#a82808" />
            <stop offset="100%" stopColor="#ffe090" />
          </linearGradient>
        </defs>
        <rect x="0" y="3" width="120" height="5" fill={`url(#${bodyGrad})`} />
        <path
          className="fsb-tongue fsb-tongue--a"
          fill={`url(#${tongueGrad})`}
          d="M0,4 C5,1 10,5 15,2 C20,-1 25,4 30,1 C35,-2 40,3 45,0 C50,-3 55,2 60,-1 C65,-4 70,1 75,-2 C80,-5 85,0 90,-3 C95,-6 100,1 105,-2 C110,-5 115,0 120,-3 L120,4 L0,4 Z"
        />
      </svg>
    </div>
  )
}

export default function FlameStreakBar({
  value,
  max,
  flameFromStart = false,
}: FlameStreakBarProps) {
  const uid = useId().replace(/:/g, "")
  const bodyGrad = `fsb-body-${uid}`
  const tongueGrad = `fsb-tongue-${uid}`
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const tier = flameTier(percent)
  const crownSize = crownFlameSize(percent)
  const showCrown = flameFromStart ? value > 0 : percent >= MIN_FLAME_PERCENT

  return (
    <div
      className="fsb-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{
        "--fsb-hot": String(heatIntensity(percent)),
      } as CSSProperties}
    >
      <style>{`
        .fsb-bar {
          position: relative;
          height: 5px;
          margin-top: 12px;
          margin-bottom: 2px;
          overflow: visible;
        }

        .fsb-track {
          position: absolute;
          inset: auto 0 0;
          height: 5px;
          background: var(--color-border);
          border-radius: 1px;
          overflow: visible;
        }

        .fsb-fill {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 5px;
          min-width: 2px;
          overflow: visible;
          transition: none;
        }

        .fsb-svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .fsb-tongue {
          transform-origin: center bottom;
        }

        .fsb-tongue--a {
          animation: fsb-tongue-a calc(1.8s - var(--fsb-hot, 0.5) * 0.4s) ease-in-out infinite;
        }

        .fsb-crown-flame {
          position: absolute;
          top: 50%;
          display: block;
          object-fit: contain;
          object-position: center bottom;
          pointer-events: none;
          user-select: none;
          filter: var(--fsb-crown-glow);
          transform-origin: center bottom;
          transition: width 0.15s ease-out, height 0.15s ease-out, left 0.15s ease-out, opacity 0.15s ease-out, filter 0.15s ease-out;
          animation:
            fsb-crown-float var(--fsb-float-dur, 2.2s) ease-in-out infinite,
            fsb-crown-pulse-blaze 1s ease-in-out infinite;
        }

        .fsb-crown-flame--instant {
          transition: none;
          animation: none;
          translate: -50% -50%;
        }

        .fsb-crown-flame--inferno {
          animation:
            fsb-crown-float var(--fsb-float-dur, 2.2s) ease-in-out infinite,
            fsb-crown-pulse-inferno 0.85s ease-in-out infinite;
        }

        .fsb-crown-flame--wild {
          animation:
            fsb-crown-float-wild var(--fsb-float-dur, 0.35s) ease-in-out infinite,
            fsb-crown-pulse-wild 0.4s ease-in-out infinite;
        }

        @keyframes fsb-crown-float {
          0%, 100% { translate: -50% -50%; }
          50% { translate: -50% calc(-50% - 4px); }
        }

        @keyframes fsb-crown-float-wild {
          0%, 100% { translate: -50% -50%; }
          25% { translate: calc(-50% - 3px) calc(-50% - 6px); }
          50% { translate: calc(-50% + 4px) calc(-50% - 2px); }
          75% { translate: calc(-50% - 2px) calc(-50% - 8px); }
        }

        @keyframes fsb-crown-pulse-blaze {
          0%, 100% { scale: 1; filter: var(--fsb-crown-glow) brightness(1); }
          50% { scale: 1.1; filter: var(--fsb-crown-glow) brightness(1.2); }
        }

        @keyframes fsb-crown-pulse-inferno {
          0%, 100% { scale: 1; filter: var(--fsb-crown-glow) brightness(1.05); }
          50% { scale: 1.14; filter: var(--fsb-crown-glow) brightness(1.35); }
        }

        @keyframes fsb-crown-pulse-wild {
          0%, 100% { scale: 1; filter: var(--fsb-crown-glow) brightness(1.1); }
          50% { scale: 1.2; filter: var(--fsb-crown-glow) brightness(1.5); }
        }

        @keyframes fsb-tongue-a {
          0%, 100% { transform: scaleY(1) translateY(0); }
          30% { transform: scaleY(1.08) translateY(-1px); }
          55% { transform: scaleY(0.94) translateY(1px); }
          80% { transform: scaleY(1.05) translateY(-0.5px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .fsb-tongue,
          .fsb-crown-flame--alive {
            animation: none;
          }
          .fsb-crown-flame {
            translate: -50% -50%;
          }
        }
      `}</style>

      <div className="fsb-track">
        {percent > 0 && (
          <FlameFill
            percent={percent}
            bodyGrad={bodyGrad}
            tongueGrad={tongueGrad}
          />
        )}
      </div>

      {showCrown && (
        <CrownFlameTip
          tier={tier}
          percent={percent}
          size={crownSize}
        />
      )}
    </div>
  )
}
