import type { CSSProperties } from "react"

const MILESTONES = [ 75, 90, 100]
const TRAIL_GAP = 5

function flameSize(percent: number, min = 7, max = 22) {
  return min + (percent / 100) * (max - min)
}

function heatGlow(percent: number) {
  return `drop-shadow(0 0 ${2 + percent * 0.08}px rgba(255, 140, 0, ${0.35 + percent / 250}))`
}

interface HeatGradientCrownBarProps {
  value: number
  max: number
}

function HeatGradientFill({ percent }: { percent: number }) {
  return (
    <div
      className="hgc-fill"
      style={{
        width: `${percent}%`,
        boxShadow: percent > 20 ? `0 0 ${4 + percent * 0.12}px rgba(255, 120, 40, ${percent / 250})` : "none",
      }}
    />
  )
}

function HeatMilestoneFlames({
  percent,
  glow,
  crownSize,
}: {
  percent: number
  glow: string
  crownSize: number
}) {
  const active = MILESTONES.filter(m => percent >= m)

  return active.map((m, i) => {
    const isTip = percent >= 100 && i === active.length - 1
    const slotsFromTip = active.length - i
    const left = isTip ? 100 : Math.max(0, percent - slotsFromTip * TRAIL_GAP)
    const size = isTip ? crownSize : flameSize(m, 6, 14) * (0.85 + ((i + 1) / active.length) * 0.4)

    return (
      <span
        key={m}
        className={`hgc-flame hgc-flame--alive ${isTip ? "hgc-flame--glow hgc-flame--glow-pulse" : "hgc-flame--trail"}`}
        style={{
          left: `${left}%`,
          fontSize: size,
          filter: glow,
          "--hgc-delay": `${i * 0.15}s`,
          "--hgc-drift": i % 2 === 0 ? 1 : -1,
          "--hgc-float-dur": `${1.8 + (i % 3) * 0.25}s`,
        } as CSSProperties}
        aria-hidden
      >
        🔥
      </span>
    )
  })
}

export default function HeatGradientCrownBar({ value, max }: HeatGradientCrownBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const crownSize = flameSize(percent, 8, 24)
  const glow = heatGlow(percent)
  const showLeading = percent > 0 && percent < 100

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

        .hgc-flame {
          line-height: 1;
          user-select: none;
          transition: font-size 0.15s ease-out, opacity 0.15s ease-out, filter 0.15s ease-out;
        }

        .hgc-flame--alive {
          display: inline-block;
          transform-origin: center bottom;
        }

        .hgc-flame--glow,
        .hgc-flame--trail {
          position: absolute;
          top: 50%;
          pointer-events: none;
        }

        .hgc-flame--glow {
          animation:
            hgc-float-pos var(--hgc-float-dur, 2.2s) ease-in-out infinite,
            hgc-glow-pulse var(--hgc-duration, 1s) ease-in-out infinite;
          animation-delay: var(--hgc-delay, 0s), var(--hgc-delay, 0s);
        }

        .hgc-flame--trail {
          opacity: 0.55;
          animation:
            hgc-float-trail var(--hgc-float-dur, 2.8s) ease-in-out infinite,
            hgc-pulse-trail var(--hgc-duration, 1.1s) ease-in-out infinite;
          animation-delay: var(--hgc-delay, 0s), var(--hgc-delay, 0s);
        }

        @keyframes hgc-float-pos {
          0%, 100% { translate: -50% -50%; }
          20% { translate: calc(-50% + 2px) calc(-50% - 3px); }
          45% { translate: calc(-50% - 3px) calc(-50% - 5px); }
          70% { translate: calc(-50% + 2px) calc(-50% - 2px); }
          85% { translate: calc(-50% - 1px) calc(-50% - 4px); }
        }

        @keyframes hgc-glow-pulse {
          0%, 100% { scale: 1; filter: brightness(1); }
          50% { scale: 1.12; filter: brightness(1.25); }
        }

        @keyframes hgc-float-trail {
          0%, 100% { translate: -50% -42%; }
          33% { translate: calc(-50% + 3px) calc(-42% - 4px); }
          66% { translate: calc(-50% - 2px) calc(-42% - 6px); }
        }

        @keyframes hgc-pulse-trail {
          0%, 100% { scale: 1; }
          50% { scale: 1.12; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hgc-flame--alive {
            animation: none;
          }
          .hgc-flame--glow {
            translate: -50% -50%;
          }
          .hgc-flame--trail {
            translate: -50% -42%;
          }
        }
      `}</style>
      <HeatGradientFill percent={percent} />
      <HeatMilestoneFlames percent={percent} glow={glow} crownSize={crownSize} />
      {showLeading && (
        <span
          className="hgc-flame hgc-flame--glow hgc-flame--alive hgc-flame--glow-pulse"
          style={{
            left: `${percent}%`,
            fontSize: crownSize,
            filter: glow,
            "--hgc-float-dur": "2.1s",
          } as CSSProperties}
          aria-hidden
        >
          🔥
        </span>
      )}
    </div>
  )
}
