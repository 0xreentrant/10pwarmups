import type { CSSProperties } from "react"

const GLOW = {
  spreadBase: 3,
  spreadPerPercent: 0.22,
  alphaBase: 0.12,
  alphaPerPercent: 1 / 110,
  alphaMax: 0.9,
  midLayer: 1.7,
  outerLayer: 2.8,
  waverDurationSec: 15,
  peakSpreadMult: 1.1,
  troughSpreadMult: 0.92,
  peakBrightness: 1.05,
  troughBrightness: 0.97,
  peakAlphaMult: 1.08,
  troughAlphaMult: 0.92,
}

function glowSpread(percent: number) {
  return GLOW.spreadBase + percent * GLOW.spreadPerPercent
}

function glowAlpha(percent: number) {
  return Math.min(GLOW.alphaMax, GLOW.alphaBase + percent * GLOW.alphaPerPercent)
}

function fillGlow(percent: number) {
  if (percent <= 0) return "none"
  const spread = glowSpread(percent)
  const alpha = glowAlpha(percent)
  return [
    `0 0 ${spread}px rgba(255, 170, 70, ${alpha})`,
    `0 0 ${spread * GLOW.midLayer}px rgba(255, 110, 30, ${alpha * 0.65})`,
    `0 0 ${spread * GLOW.outerLayer}px rgba(255, 60, 0, ${alpha * 0.35})`,
  ].join(", ")
}

interface HeatGradientCrownBarProps {
  value: number
  max: number
}

function HeatGradientFill({ percent }: { percent: number }) {
  const spread = glowSpread(percent)
  const alpha = glowAlpha(percent)

  return (
    <div
      className={`hgc-fill${percent > 0 ? " hgc-fill--waver" : ""}`}
      style={{
        width: `${percent}%`,
        boxShadow: fillGlow(percent),
        ...(percent > 0 ? {
          "--hgc-spread": String(spread),
          "--hgc-alpha": String(alpha),
          "--hgc-mid": String(GLOW.midLayer),
          "--hgc-outer": String(GLOW.outerLayer),
          "--hgc-waver-dur": `${GLOW.waverDurationSec}s`,
          "--hgc-peak-spread": String(GLOW.peakSpreadMult),
          "--hgc-trough-spread": String(GLOW.troughSpreadMult),
          "--hgc-peak-brightness": String(GLOW.peakBrightness),
          "--hgc-trough-brightness": String(GLOW.troughBrightness),
          "--hgc-peak-alpha": String(GLOW.peakAlphaMult),
          "--hgc-trough-alpha": String(GLOW.troughAlphaMult),
        } : {}),
      } as CSSProperties}
    />
  )
}

export default function HeatGradientCrownBar({ value, max }: HeatGradientCrownBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div className="hgc-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <style>{`
        .hgc-bar {
          position: relative;
          height: 5px;
          margin-top: 12px;
          margin-bottom: 2px;
          background: var(--color-border);
          border-radius: 1px;
          overflow: visible;
        }

        .hgc-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #5c1a0e 0%, #c0392b 45%, #f39c12 85%, #ffe08a 100%);
          transition: width 0.15s ease-out, box-shadow 0.15s ease-out;
        }

        .hgc-fill--waver {
          animation: hgc-fill-glow-waver var(--hgc-waver-dur, 2.6s) ease-in-out infinite;
        }

        @keyframes hgc-fill-glow-waver {
          0%, 100% {
            filter: brightness(1) saturate(1);
            box-shadow:
              0 0 calc(var(--hgc-spread) * 1px) rgba(255, 170, 70, calc(var(--hgc-alpha) * 1)),
              0 0 calc(var(--hgc-spread) * var(--hgc-mid) * 1px) rgba(255, 110, 30, calc(var(--hgc-alpha) * 0.65)),
              0 0 calc(var(--hgc-spread) * var(--hgc-outer) * 1px) rgba(255, 60, 0, calc(var(--hgc-alpha) * 0.35));
          }
          35% {
            filter: brightness(var(--hgc-peak-brightness, 1.05)) saturate(1.04);
            box-shadow:
              0 0 calc(var(--hgc-spread) * var(--hgc-peak-spread, 1.1) * 1px) rgba(255, 180, 80, calc(var(--hgc-alpha) * var(--hgc-peak-alpha, 1.08))),
              0 0 calc(var(--hgc-spread) * var(--hgc-mid) * 1.09 * 1px) rgba(255, 120, 35, calc(var(--hgc-alpha) * 0.72)),
              0 0 calc(var(--hgc-spread) * var(--hgc-outer) * 1.07 * 1px) rgba(255, 70, 5, calc(var(--hgc-alpha) * 0.4));
          }
          70% {
            filter: brightness(var(--hgc-trough-brightness, 0.97)) saturate(0.98);
            box-shadow:
              0 0 calc(var(--hgc-spread) * var(--hgc-trough-spread, 0.92) * 1px) rgba(255, 155, 60, calc(var(--hgc-alpha) * var(--hgc-trough-alpha, 0.92))),
              0 0 calc(var(--hgc-spread) * var(--hgc-mid) * 0.91 * 1px) rgba(255, 95, 18, calc(var(--hgc-alpha) * 0.58)),
              0 0 calc(var(--hgc-spread) * var(--hgc-outer) * 0.89 * 1px) rgba(255, 50, 0, calc(var(--hgc-alpha) * 0.3));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hgc-fill--waver {
            animation: none;
          }
        }
      `}</style>
      <HeatGradientFill percent={percent} />
    </div>
  )
}
