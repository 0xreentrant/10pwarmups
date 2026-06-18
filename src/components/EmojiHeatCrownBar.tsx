import type { CSSProperties } from "react"

const MIN_FLAME_PERCENT = 45

const FLAME_SRC = {
  blaze: "/fire-emojis/fire-emoji-blaze-flicker.svg",
  inferno: "/fire-emojis/fire-emoji-inferno-flicker.svg",
  wild: "/fire-emojis/fire-emoji-wild-flicker.svg",
} as const

type FlameTier = keyof typeof FLAME_SRC

function flameTier(percent: number): FlameTier {
  if (percent >= 100) return "wild"
  if (percent >= 75) return "inferno"
  return "blaze"
}

function flameSize(percent: number, min = 10, max = 32) {
  return min + (percent / 100) * (max - min)
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

function fillGlow(tier: FlameTier, percent: number) {
  if (percent <= 8) return "none"
  const scale = tier === "wild" ? 3.2 : tier === "inferno" ? 2.1 : 1.35
  const spread = (8 + percent * 0.22) * scale
  const alpha = Math.min(1, (0.25 + percent / 140) * scale)
  const inner = `0 0 ${spread}px rgba(255, 160, 60, ${alpha})`
  const mid = `0 0 ${spread * 1.8}px rgba(255, 100, 20, ${alpha * 0.7})`
  const outer = `0 0 ${spread * 3}px rgba(255, 60, 0, ${alpha * 0.4})`
  const wash = tier === "wild"
    ? `, 0 0 ${spread * 4.5}px rgba(255, 40, 0, ${alpha * 0.22})`
    : tier === "inferno"
      ? `, 0 0 ${spread * 3.5}px rgba(220, 40, 0, ${alpha * 0.18})`
      : ""
  return `${inner}, ${mid}, ${outer}${wash}`
}

function flameImgHeight(size: number, tier: FlameTier) {
  if (tier === "wild") return size * 1.28
  if (tier === "inferno") return size * 1.18
  return size * 1.1
}

interface EmojiHeatCrownBarProps {
  value: number
  max: number
  /** When false, fill and flame track value instantly (e.g. scripted reveal). */
  smooth?: boolean
  /** Show flame from the first step of fill; otherwise from MIN_FLAME_PERCENT. */
  flameFromStart?: boolean
}

function HeatGradientFill({
  percent,
  tier,
  smooth,
}: {
  percent: number
  tier: FlameTier
  smooth: boolean
}) {
  return (
    <div
      className={`ehc-fill${smooth ? "" : " ehc-fill--instant"}`}
      style={{
        width: `${percent}%`,
        boxShadow: fillGlow(tier, percent),
      }}
    />
  )
}

function FlameImg({
  src,
  size,
  height,
  glow,
  className,
  style,
}: {
  src: string
  size: number
  height?: number
  glow: string
  className: string
  style?: CSSProperties
}) {
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{
        width: size,
        height: height ?? size,
        "--ehc-glow": glow,
        ...style,
      } as CSSProperties}
      aria-hidden
    />
  )
}

export default function EmojiHeatCrownBar({
  value,
  max,
  smooth = true,
  flameFromStart = false,
}: EmojiHeatCrownBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const tier = flameTier(percent)
  const crownSize = flameSize(percent, 12, 34)
  const glow = flameGlow(tier, percent)
  const showFlame = flameFromStart ? value > 0 : percent >= MIN_FLAME_PERCENT
  const isWild = tier === "wild"
  const instant = !smooth

  return (
    <div className="ehc-bar" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <style>{`
        .ehc-bar {
          position: relative;
          height: 5px;
          margin-top: 32px;
          margin-bottom: 6px;
          background: var(--color-border);
          border-radius: 1px;
          overflow: visible;
        }

        .ehc-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #5c1a0e 0%, #c0392b 45%, #f39c12 85%, #ffe08a 100%);
          transition: width 0.15s ease-out, box-shadow 0.15s ease-out;
        }

        .ehc-fill--instant {
          transition: none;
        }

        .ehc-flame {
          display: block;
          object-fit: contain;
          object-position: center bottom;
          user-select: none;
          filter: var(--ehc-glow);
          transition: width 0.15s ease-out, height 0.15s ease-out, left 0.15s ease-out, opacity 0.15s ease-out, filter 0.15s ease-out;
        }

        .ehc-flame--instant {
          transition: none;
        }

        .ehc-flame--alive {
          transform-origin: center bottom;
        }

        .ehc-flame--glow {
          position: absolute;
          top: 50%;
          pointer-events: none;
          animation:
            ehc-float-pos var(--ehc-float-dur, 2.2s) ease-in-out infinite,
            ehc-glow-pulse-blaze var(--ehc-duration, 1s) ease-in-out infinite;
        }

        .ehc-flame--inferno {
          animation:
            ehc-float-pos var(--ehc-float-dur, 2.2s) ease-in-out infinite,
            ehc-glow-pulse-inferno var(--ehc-duration, 0.85s) ease-in-out infinite;
        }

        .ehc-flame--wild {
          animation:
            ehc-float-wild var(--ehc-float-dur, 0.35s) ease-in-out infinite,
            ehc-glow-pulse-wild var(--ehc-duration, 0.4s) ease-in-out infinite;
        }

        @keyframes ehc-float-pos {
          0%, 100% { translate: -50% -50%; }
          50% { translate: -50% calc(-50% - 4px); }
        }

        @keyframes ehc-float-wild {
          0%, 100% { translate: -50% -50%; }
          25% { translate: calc(-50% - 3px) calc(-50% - 6px); }
          50% { translate: calc(-50% + 4px) calc(-50% - 2px); }
          75% { translate: calc(-50% - 2px) calc(-50% - 8px); }
        }

        @keyframes ehc-glow-pulse-blaze {
          0%, 100% { scale: 1; filter: var(--ehc-glow) brightness(1); }
          50% { scale: 1.1; filter: var(--ehc-glow) brightness(1.2); }
        }

        @keyframes ehc-glow-pulse-inferno {
          0%, 100% { scale: 1; filter: var(--ehc-glow) brightness(1.05); }
          50% { scale: 1.14; filter: var(--ehc-glow) brightness(1.35); }
        }

        @keyframes ehc-glow-pulse-wild {
          0%, 100% { scale: 1; filter: var(--ehc-glow) brightness(1.1); }
          50% { scale: 1.2; filter: var(--ehc-glow) brightness(1.5); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ehc-flame--alive {
            animation: none;
          }
          .ehc-flame--glow {
            translate: -50% -50%;
          }
        }
      `}</style>
      <HeatGradientFill percent={percent} tier={tier} smooth={smooth} />
      {showFlame && (
        <FlameImg
          src={FLAME_SRC[tier]}
          size={crownSize}
          height={flameImgHeight(crownSize, tier)}
          glow={glow}
          className={`ehc-flame ehc-flame--glow ehc-flame--alive${instant ? " ehc-flame--instant" : ""}${tier === "inferno" ? " ehc-flame--inferno" : ""}${isWild ? " ehc-flame--wild" : ""}`}
          style={{
            left: `${percent}%`,
            "--ehc-float-dur": isWild ? "0.35s" : "2.1s",
          } as CSSProperties}
        />
      )}
    </div>
  )
}
