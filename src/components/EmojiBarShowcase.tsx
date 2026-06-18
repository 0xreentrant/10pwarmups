import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { DECKS } from "../data/decks"
import EmojiHeatCrownBar from "./EmojiHeatCrownBar"
import HeatGradientCrownBar from "./HeatGradientCrownBar"

const DEMO_DECK = DECKS[0]
const DEMO_MAX = DEMO_DECK.moves.length

const FLAME_VARIANTS = [
  { label: "Blazing", src: "/fire-emojis/fire-emoji-blaze-flicker.svg", threshold: "45%", height: 72 },
  { label: "Inferno", src: "/fire-emojis/fire-emoji-inferno-flicker.svg", threshold: "75%", height: 80 },
  { label: "Wild", src: "/fire-emojis/fire-emoji-wild-flicker.svg", threshold: "100%", height: 88 },
] as const

const RESULT_SCENARIOS = [
  { id: "fizzle", label: "2 streak", finalStreak: 2, correct: 3 },
  { id: "solid", label: "4 streak", finalStreak: 4, correct: 4 },
  { id: "perfect", label: "Perfect", finalStreak: DEMO_MAX, correct: DEMO_MAX },
] as const

type ResultScenario = (typeof RESULT_SCENARIOS)[number]

const STAT_LABEL = "py-1 text-xs text-muted"
const STAT_VALUE = "py-1 pl-5 text-xs text-text font-semibold"

function useAnimatedStreak(target: number, playId: number) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) {
      setValue(target)
      return
    }

    setValue(0)
    const duration = 1400
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setValue(target * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else setValue(target)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, playId])

  return value
}

function ResultsRevealDemo() {
  const [scenario, setScenario] = useState<ResultScenario>(RESULT_SCENARIOS[1])
  const [playId, setPlayId] = useState(0)
  const animatedStreak = useAnimatedStreak(scenario.finalStreak, playId)

  const replay = () => setPlayId(id => id + 1)

  const pickScenario = (next: ResultScenario) => {
    setScenario(next)
    setPlayId(id => id + 1)
  }

  return (
    <fieldset className="rounded-lg border border-border bg-surface p-5 mb-8 overflow-visible">
      <legend>Test results reveal</legend>
      <p className="text-[11px] text-muted mt-0 mb-3 m-0">
        {DEMO_DECK.name} — bar animates to final streak like a completed run.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {RESULT_SCENARIOS.map(s => (
          <button
            key={s.id}
            type="button"
            className={`btn text-xs py-1.5 px-2.5${scenario.id === s.id ? " btn-primary" : ""}`}
            onClick={() => pickScenario(s)}
          >
            {s.label}
          </button>
        ))}
        <button type="button" className="btn btn-ghost text-xs py-1.5 px-2.5" onClick={replay}>
          Replay
        </button>
      </div>

      <div className="font-disp font-bold text-lg tracking-wide text-accent mb-3">
        🔥 {Math.round(animatedStreak)}
      </div>

      <div className="text-[11px] text-muted mb-0.5">
        {Math.round(animatedStreak)}/{DEMO_MAX} · final streak
      </div>
      <EmojiHeatCrownBar
        value={animatedStreak}
        max={DEMO_MAX}
        smooth={false}
        flameFromStart
      />

      <table className="w-full mt-4">
        <tbody>
          <tr>
            <td className={STAT_LABEL}>Correct</td>
            <td className={STAT_VALUE}>{scenario.correct}/{DEMO_MAX}</td>
          </tr>
          <tr>
            <td className={STAT_LABEL}>Final streak</td>
            <td className={STAT_VALUE}>{Math.round(animatedStreak)}</td>
          </tr>
          <tr>
            <td className={STAT_LABEL}>Best streak</td>
            <td className={STAT_VALUE}>{scenario.finalStreak}/{DEMO_MAX}</td>
          </tr>
        </tbody>
      </table>
    </fieldset>
  )
}

export default function EmojiBarShowcase() {
  const [streak, setStreak] = useState(0)
  const percent = DEMO_MAX > 0 ? Math.round((streak / DEMO_MAX) * 100) : 0

  return (
    <div className="py-6">
      <Link to="/" className="text-muted no-underline text-xs tracking-wide uppercase font-disp">
        ← Home
      </Link>

      <h2 className="font-disp font-bold text-lg tracking-wide mt-4 mb-1">Fire emoji bar</h2>
      <p className="text-muted text-sm m-0 mb-6">
        Blazing at 45%, inferno at 75%, wild at 100%. Compare with the current bar.
      </p>

      <div className="rounded-lg border border-border bg-surface p-5 mb-8 overflow-visible">
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-disp text-xs tracking-widest uppercase text-muted">Streak</span>
          <span className="font-disp font-bold text-accent">{streak}/{DEMO_MAX}</span>
        </div>

        <div className="mb-5">
          <span className="block font-disp text-[0.6rem] tracking-widest uppercase text-muted mb-1">
            Current
          </span>
          <HeatGradientCrownBar value={streak} max={DEMO_MAX} />
        </div>

        <div>
          <span className="block font-disp text-[0.6rem] tracking-widest uppercase text-muted mb-1">
            SVG flames
          </span>
          <EmojiHeatCrownBar value={streak} max={DEMO_MAX} />
        </div>
        <label className="block mt-6">
          <span className="sr-only">Adjust streak</span>
          <input
            type="range"
            role="slider"
            min={0}
            max={DEMO_MAX}
            value={streak}
            onChange={e => setStreak(Number(e.target.value))}
            aria-valuemin={0}
            aria-valuemax={DEMO_MAX}
            aria-valuenow={streak}
            aria-valuetext={`${streak} of ${DEMO_MAX}, ${percent}%`}
            className="w-full accent-accent"
          />
        </label>
        <div className="flex justify-between text-[10px] text-muted mt-1 font-disp tracking-wide">
          <span>0</span>
          <span>{Math.round(DEMO_MAX * 0.45)}</span>
          <span>{Math.round(DEMO_MAX * 0.75)}</span>
          <span>{Math.round(DEMO_MAX * 0.9)}</span>
          <span>{DEMO_MAX}</span>
        </div>
      </div>

      <ResultsRevealDemo />

      <span className="block font-disp text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted mb-3">
        Flame variants
      </span>
      <div className="grid grid-cols-3 gap-3">
        {FLAME_VARIANTS.map(v => (
          <div
            key={v.label}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3"
          >
            <div className="rounded-lg bg-[rgba(255,120,0,0.04)] p-3 shadow-[0_0_40px_rgba(255,100,0,0.1)] overflow-visible">
              <img
                src={v.src}
                alt=""
                width={64}
                height={v.height}
                className="block object-contain object-bottom"
                aria-hidden
              />
            </div>
            <span className="font-disp text-[0.6rem] tracking-widest uppercase text-muted text-center">
              {v.label}
            </span>
            <span className="text-[10px] text-muted">{v.threshold}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
