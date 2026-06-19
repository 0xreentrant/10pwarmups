export type HeatGradientAnimation = "none" | "pulse-edge" | "lava"

const GLOW = {
  spreadBase: 3,
  spreadPerPercent: 0.22,
  alphaBase: 0.12,
  alphaPerPercent: 1 / 110,
  alphaMax: 0.9,
  midLayer: 1.7,
  outerLayer: 2.8,
}

const HEAT_GRADIENT =
  "linear-gradient(90deg, #5c1a0e 0%, #c0392b 45%, #f39c12 85%, #ffe08a 100%)"

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

interface HeatGradientFillProps {
  percent: number
  animation: HeatGradientAnimation
}

function HeatGradientFill({ percent, animation }: HeatGradientFillProps) {
  const animClass =
    percent > 0 && animation !== "none" ? ` hgc-fill--anim-${animation}` : ""

  return (
    <div
      className={`hgc-fill${animClass}`}
      style={{
        width: `${percent}%`,
        boxShadow: fillGlow(percent),
      }}
    />
  )
}

function HeatGradientStyles() {
  return (
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
        background: ${HEAT_GRADIENT};
        transition: width 0.15s ease-out, box-shadow 0.15s ease-out;
      }

      .hgc-fill--anim-pulse-edge {
        position: relative;
      }

      .hgc-fill--anim-pulse-edge::after {
        content: "";
        position: absolute;
        top: 50%;
        right: -2px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        transform: translateY(-50%);
        background: radial-gradient(circle, #ffe08a 0%, #f39c12 45%, transparent 70%);
        animation: hgc-fill-pulse-edge 1.3s ease-out infinite;
      }

      @keyframes hgc-fill-pulse-edge {
        0% { opacity: 0.9; transform: translateY(-50%) scale(0.7); }
        70% { opacity: 0; transform: translateY(-50%) scale(2.6); }
        100% { opacity: 0; transform: translateY(-50%) scale(2.6); }
      }

      .hgc-fill--anim-lava {
        background: linear-gradient(
          90deg,
          #a83218 0%,
          #c0392b 12.5%,
          #f39c12 25%,
          #ffe08a 31%,
          #f39c12 37%,
          #c0392b 43%,
          #a83218 50%,
          #a83218 50%,
          #c0392b 62.5%,
          #f39c12 75%,
          #ffe08a 81%,
          #f39c12 87%,
          #c0392b 93%,
          #a83218 100%
        );
        background-size: 200% 100%;
        animation: hgc-fill-lava 5s linear infinite, hgc-fill-lava-glow 2.5s ease-in-out infinite;
      }

      @keyframes hgc-fill-lava {
        0% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      @keyframes hgc-fill-lava-glow {
        0%, 100% { filter: brightness(1) saturate(1.02); }
        50% { filter: brightness(1.12) saturate(1.1); }
      }

      @media (prefers-reduced-motion: reduce) {
        .hgc-fill[class*="hgc-fill--anim-"] {
          animation: none;
        }

        .hgc-fill--anim-pulse-edge::after {
          animation: none;
          opacity: 0;
        }
      }
    `}</style>
  )
}

interface HeatGradientCrownBarProps {
  value: number
  max: number
  animation?: HeatGradientAnimation
}

export default function HeatGradientCrownBar({
  value,
  max,
  animation = "none",
}: HeatGradientCrownBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div className="hgc-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <HeatGradientStyles />
      <HeatGradientFill percent={percent} animation={animation} />
    </div>
  )
}
