const FLAME_SRC = {
  blaze: "/fire-emojis/fire-emoji-blaze-flicker.svg",
  inferno: "/fire-emojis/fire-emoji-inferno-flicker.svg",
  wild: "/fire-emojis/fire-emoji-wild-flicker.svg",
} as const

type FlameTier = keyof typeof FLAME_SRC

function flameTier(percent: number): FlameTier {
  if (percent >= 95) return "wild"
  if (percent >= 80) return "inferno"
  return "blaze"
}

function flameImgHeight(size: number, tier: FlameTier) {
  if (tier === "wild") return size * 1.28
  if (tier === "inferno") return size * 1.18
  return size * 1.1
}

function flameGlow(tier: FlameTier, percent: number) {
  const r = 3 + percent * 0.1
  if (tier === "wild") {
    return [
      `drop-shadow(0 0 ${r * 1.2}px rgba(255, 240, 180, 0.95))`,
      `drop-shadow(0 0 ${r * 2.2}px rgba(255, 180, 50, 0.9))`,
      `drop-shadow(0 0 ${r * 3.8}px rgba(255, 100, 0, 0.7))`,
    ].join(" ")
  }
  if (tier === "inferno") {
    return [
      `drop-shadow(0 0 ${r}px rgba(255, 200, 80, 0.85))`,
      `drop-shadow(0 0 ${r * 2}px rgba(255, 120, 20, 0.65))`,
      `drop-shadow(0 0 ${r * 3.5}px rgba(255, 60, 0, 0.4))`,
    ].join(" ")
  }
  return [
    `drop-shadow(0 0 ${r * 0.8}px rgba(255, 180, 60, 0.75))`,
    `drop-shadow(0 0 ${r * 1.6}px rgba(255, 120, 0, 0.5))`,
  ].join(" ")
}

interface StreakFlameBadgeProps {
  value: number
  max: number
}

export default function StreakFlameBadge({ value, max }: StreakFlameBadgeProps) {
  const percent = max > 0 ? (value / max) * 100 : 0
  const tier = flameTier(percent)
  const size = 20

  return (
    <div
      className="flex items-center gap-1 font-disp font-bold text-lg tracking-wide text-accent"
      aria-label={`Streak: ${value}`}
    >
      <img
        src={FLAME_SRC[tier]}
        alt=""
        aria-hidden
        className="block"
        style={{
          width: size,
          height: flameImgHeight(size, tier),
          filter: flameGlow(tier, percent),
        }}
      />
      <span>{value}</span>
    </div>
  )
}
