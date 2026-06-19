import { useEffect, useState } from "react"
import DeckLink from "./DeckLink"
import HeatGradientCrownBar from "./HeatGradientCrownBar"
import ResetConfirmPopover from "./ResetConfirmPopover"
import { DECKS, SERIES } from "../data/decks"
import type { Deck, ProgressMap } from "../types/domain"
import * as analytics from "../utils/analytics"

const NAMED_FLOWS = DECKS.filter(d => !d.series)

const SERIES_NAV_LINK = "font-disp font-bold text-[0.85rem] tracking-widest uppercase text-muted no-underline transition-colors hover:text-accent"

const SCROLL_TOP_BTN = [
  "fixed z-50 bottom-6 w-11 h-11 rounded-full border-0 bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.4)]",
  "flex items-center justify-center origin-center",
  "right-[max(16px,calc(50%-240px+16px))]",
  "transition-[opacity,transform] duration-300 ease-in-out",
  "hover:bg-[color-mix(in_srgb,var(--color-surface),white_8%)]",
].join(" ")

interface DeckRowProps {
  deck: Deck
  progress: ProgressMap
  onDeckClick: (deckId: string) => void
  showId: boolean
}

function DeckRow({ deck, progress, onDeckClick, showId }: DeckRowProps) {
  const prog = progress[deck.id] || { currentStreak: 0, bestStreak: 0, attempts: [] }
  const total = deck.moves.length
  const label = prog.attempts.length === 0
    ? "untrained"
    : prog.bestStreak === total
    ? "complete"
    : "incomplete"

  return (
    <tr>
      {showId && (
        <td className="py-2 align-top w-9">
          <span className="font-disp font-extrabold text-base tracking-wide text-muted min-w-8">{deck.id}</span>
        </td>
      )}
      <td className="py-2 pr-2.5 align-top" colSpan={showId ? 1 : 2}>
        <div className="font-disp font-semibold text-base tracking-tight">{deck.name}</div>
        <DeckLink link={deck.link} />
        <div className="text-[11px] text-muted mt-0.5">{prog.bestStreak}/{total} moves · {label}</div>
        <HeatGradientCrownBar value={prog.bestStreak} max={total} />
      </td>
      <td className="py-2 align-middle whitespace-nowrap">
        <button className="btn btn-primary" onClick={() => {
          analytics.event({
            action: 'deck_selected',
            category: 'Training',
            label: `${deck.id} - ${deck.name}`
          })
          onDeckClick(deck.id)
        }}>Train</button>
      </td>
    </tr>
  )
}

interface HomeScreenProps {
  progress: ProgressMap
  scrollToSectionId?: string
  onDeckClick: (deckId: string) => void
  onStats: () => void
  onReset: () => void
  resetConfirm: boolean
  onCancelReset: () => void
}

export default function HomeScreen({ progress, scrollToSectionId, onDeckClick, onStats, onReset, resetConfirm, onCancelReset }: HomeScreenProps) {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    analytics.pageview('/home')
  }, [])

  useEffect(() => {
    if (!scrollToSectionId) return
    const section = document.getElementById(scrollToSectionId)
    if (section && typeof section.scrollIntoView === "function") {
      section.scrollIntoView()
    }
  }, [scrollToSectionId])

  useEffect(() => {
    const updateScrollTopVisibility = () => {
      setShowScrollTop(window.scrollY > 260)
    }

    updateScrollTopVisibility()
    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true })
    return () => window.removeEventListener("scroll", updateScrollTopVisibility)
  }, [])

  return (
    <div className="pt-7 pb-12">
      <h1 className="mb-1">10th Planet</h1>
      <h1 className="mb-1.5 text-accent">Warmup Trainer</h1>
      <p className="text-[11px] text-muted mt-0.5 mb-5 tracking-wide">openthesystem.app</p>
      <p className="text-[11px] text-muted mt-0.5 mb-8 tracking-widest uppercase">34 decks · 8 series</p>

      <nav className="flex justify-between items-center gap-1 mb-7 border-y border-border py-2">
        {SERIES.map(series => (
          <a key={series.id} href={`#series-${series.id}`} className={SERIES_NAV_LINK}>{series.id}</a>
        ))}
        {NAMED_FLOWS.length > 0 && <a href="#named-flows" className={SERIES_NAV_LINK}>Named Flows</a>}
      </nav>

      {SERIES.map(series => {
        const seriesDecks = DECKS.filter(d => d.series === series.id)
        return (
          <div key={series.id} id={`series-${series.id}`} className="scroll-mt-3 mb-7">
            <div className="font-disp font-bold text-[0.7rem] tracking-[0.18em] uppercase text-muted pt-1 pb-1.5 border-b border-border mb-1">
              Series {series.id} — {series.name}
            </div>
            <table className="w-full border-collapse">
              <tbody>
                {seriesDecks.map(d => (
                  <DeckRow key={d.id} deck={d} progress={progress} onDeckClick={onDeckClick} showId />
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {NAMED_FLOWS.length > 0 && (
        <div id="named-flows" className="scroll-mt-3 mb-7">
          <div className="font-disp font-bold text-[0.7rem] tracking-[0.18em] uppercase text-muted pt-1 pb-1.5 border-b border-border mb-1">
            Named Flows
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {NAMED_FLOWS.map(d => (
                <DeckRow key={d.id} deck={d} progress={progress} onDeckClick={onDeckClick} showId={false} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <hr />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn" onClick={onStats}>Stats</button>
        <button
          className="btn"
          onClick={() => { if (!resetConfirm) onReset() }}
        >Reset all</button>
      </div>
      <ResetConfirmPopover
        open={resetConfirm}
        onConfirm={onReset}
        onCancel={onCancelReset}
      />
      <button
        type="button"
        aria-label="Scroll to top"
        aria-hidden={!showScrollTop}
        tabIndex={showScrollTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0 })}
        className={[
          SCROLL_TOP_BTN,
          showScrollTop
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-90 pointer-events-none",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="block w-2.5 h-2.5 border-t-2 border-l-2 border-text translate-y-0.5 rotate-45"
        />
      </button>
    </div>
  )
}
