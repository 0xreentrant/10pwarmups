import { useEffect, useRef } from "react"

const FLAME_SRC = {
  blaze: "/fire-emojis/fire-emoji-blaze-flicker.svg",
  inferno: "/fire-emojis/fire-emoji-inferno-flicker.svg",
  wild: "/fire-emojis/fire-emoji-wild-flicker.svg",
} as const

type FlameTier = keyof typeof FLAME_SRC

type FlameParticle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  tier: FlameTier
  born: number
  life: number
  wobble: number
}

export interface FlameCelebrationEffectProps {
  durationSec: number
  multiplicationFactor: number
  /** Fraction of container height flames reach (1 = top). */
  reach: number
  playId: number
}

const TIER_HEIGHT: Record<FlameTier, number> = {
  blaze: 1.1,
  inferno: 1.18,
  wild: 1.28,
}

function tierForRoll(r: number): FlameTier {
  if (r < 0.12) return "wild"
  if (r < 0.38) return "inferno"
  return "blaze"
}

function spawnIntensity(progress: number, multiplicationFactor: number) {
  const envelope = Math.sin(Math.PI * progress)
  const growth = Math.pow(multiplicationFactor, progress)
  return envelope * growth
}

function spawnFlame(
  width: number,
  height: number,
  now: number,
  durationMs: number,
  reach: number,
  rng: () => number,
): FlameParticle {
  const tier = tierForRoll(rng())
  const size = 18 + rng() * 28 * (tier === "wild" ? 1.15 : tier === "inferno" ? 1 : 0.85)
  const clampedReach = Math.min(1, Math.max(0.05, reach))
  const travel = height * clampedReach * (0.78 + rng() * 0.22)
  const life = durationMs * (0.15 + rng() * 0.3)
  const vy = -travel / (life / 1000)

  return {
    x: rng() * width,
    y: height + size * TIER_HEIGHT[tier] * 0.4,
    vx: (rng() - 0.5) * 55,
    vy,
    size,
    tier,
    born: now,
    life,
    wobble: rng() * Math.PI * 2,
  }
}

export default function FlameCelebrationEffect({
  durationSec,
  multiplicationFactor,
  reach,
  playId,
}: FlameCelebrationEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<Partial<Record<FlameTier, HTMLImageElement>>>({})

  useEffect(() => {
    const tiers = Object.keys(FLAME_SRC) as FlameTier[]
    tiers.forEach(tier => {
      const img = new Image()
      img.src = FLAME_SRC[tier]
      imagesRef.current[tier] = img
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const runDurationSec = durationSec
    const runMult = multiplicationFactor
    const runReach = reach

    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const parent = canvas.parentElement
    if (!parent) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const durationMs = Math.max(100, runDurationSec * 1000)
    const mult = Math.max(1, runMult)
    const particles: FlameParticle[] = []
    let raf = 0
    let start = 0
    let last = 0
    let spawnCarry = 0
    let seed = playId * 9973 + 1
    const rng = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    const baseSpawnRate = reducedMotion ? 2 : 14

    const drawFlame = (p: FlameParticle, alpha: number) => {
      const img = imagesRef.current[p.tier]
      const w = p.size
      const h = p.size * TIER_HEIGHT[p.tier]
      const x = p.x - w / 2
      const y = p.y - h

      ctx.save()
      ctx.globalAlpha = alpha
      const sway = Math.sin(p.wobble + (performance.now() - p.born) * 0.006) * 4
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x + sway, y, w, h)
      } else {
        const grad = ctx.createLinearGradient(x, y + h, x, y)
        grad.addColorStop(0, `rgba(180, 40, 8, ${alpha})`)
        grad.addColorStop(0.5, `rgba(255, 120, 20, ${alpha})`)
        grad.addColorStop(1, `rgba(255, 220, 100, ${alpha})`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(x + w / 2 + sway, y + h * 0.55, w * 0.35, h * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const tick = (now: number) => {
      if (!start) {
        start = now
        last = now
      }

      const elapsed = now - start
      const progress = Math.min(1, elapsed / durationMs)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const rect = parent.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      if (progress < 1) {
        const intensity = spawnIntensity(progress, mult)
        const rate = baseSpawnRate * intensity
        spawnCarry += rate * dt
        while (spawnCarry >= 1) {
          particles.push(spawnFlame(width, height, now, durationMs, runReach, rng))
          spawnCarry -= 1
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        const age = now - p.born
        const t = age / p.life
        if (t >= 1) {
          particles.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.wobble += dt * 5
      }

      const wash = spawnIntensity(progress, mult) * 0.14
      ctx.clearRect(0, 0, width, height)
      if (wash > 0.01) {
        const glow = ctx.createRadialGradient(
          width * 0.5,
          height,
          height * 0.1,
          width * 0.5,
          height * 0.55,
          height * 0.95,
        )
        glow.addColorStop(0, `rgba(255, 90, 10, ${wash})`)
        glow.addColorStop(0.55, `rgba(255, 50, 0, ${wash * 0.35})`)
        glow.addColorStop(1, "rgba(255, 30, 0, 0)")
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, width, height)
      }

      particles.sort((a, b) => a.y - b.y)
      for (const p of particles) {
        const age = now - p.born
        const t = age / p.life
        const fadeIn = Math.min(1, t * 6)
        const fadeOut = Math.min(1, (1 - t) * 3)
        drawFlame(p, fadeIn * fadeOut)
      }

      if (progress < 1 || particles.length > 0) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [playId])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      aria-hidden
    />
  )
}
