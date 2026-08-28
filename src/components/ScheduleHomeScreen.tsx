import { useEffect, useRef, useState } from "react"
import BetaProgressIntro from "./BetaProgressIntro"
import BetaScheduleDemo from "./beta/BetaScheduleDemo"
import AllDeckSections from "./schedule/AllDeckSections"
import SeriesDeckSection from "./schedule/SeriesDeckSection"
import SeriesIndexNav from "./schedule/SeriesIndexNav"
import WarmupScheduleTracker from "./schedule/WarmupScheduleTracker"
import { useScheduleOnboarding } from "../hooks/useScheduleOnboarding"
import { SERIES } from "../data/decks"
import {
  formatWeekGroupsSummary,
  getScheduleState,
  getWeekNumber,
  ROTATION_WEEKS,
  type SeriesId,
} from "../data/warmupSchedule"
import type { ProgressMap } from "../types/domain"
import * as analytics from "../utils/analytics"
import { seriesLetterForScheduleDemo } from "../utils/deckTimestamps"

const SCROLL_TOP_BTN = [
  "fixed z-50 bottom-6 w-11 h-11 rounded-full border-0 bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.4)]",
  "flex items-center justify-center origin-center",
  "right-[max(16px,calc(50%-260px+16px))]",
  "transition-[opacity,transform] duration-300 ease-in-out",
  "hover:bg-[color-mix(in_srgb,var(--color-surface),white_8%)]",
].join(" ")

interface ScheduleHomeScreenProps {
  view: "week" | "all"
  seriesLetter: SeriesId | null
  scrollToSectionId?: string
  progress: ProgressMap
  onDeckClick: (deckId: string) => void
  onReviewClick: (deckId: string) => void
  onSeriesSelect: (letter: SeriesId) => void
  onAllSelect: () => void
  onWeekSchedule: () => void
  onStats: () => void
}

export default function ScheduleHomeScreen({
  view,
  seriesLetter,
  scrollToSectionId,
  progress,
  onDeckClick,
  onReviewClick,
  onSeriesSelect,
  onAllSelect,
  onWeekSchedule,
  onStats,
}: ScheduleHomeScreenProps) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [viewWeek, setViewWeek] = useState(() => getWeekNumber(new Date()))
  const [weekMenuOpen, setWeekMenuOpen] = useState(false)
  const weekMenuRef = useRef<HTMLDivElement>(null)
  const onboarding = useScheduleOnboarding()
  const schedule = getScheduleState(new Date(), viewWeek)
  const weekSummary = formatWeekGroupsSummary(schedule.weekDays)
  const canRunDemo = view === "week" && !!seriesLetter
  const introOpen = onboarding.introOpen
  const showDemo = onboarding.showDemo && canRunDemo
  const demoSeriesLetter = showDemo ? seriesLetterForScheduleDemo(seriesLetter) : seriesLetter
  const dimmed = introOpen || showDemo

  useEffect(() => {
    analytics.pageview(view === "all" ? "/all" : seriesLetter ? `/series/${seriesLetter}` : "/")
  }, [view, seriesLetter])

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

  useEffect(() => {
    if (!weekMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!weekMenuRef.current?.contains(event.target as Node)) {
        setWeekMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWeekMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [weekMenuOpen])

  return (
    <div className="pt-7 pb-12">
      {introOpen && <BetaProgressIntro onComplete={onboarding.completeIntro} />}
      {showDemo && (
        <BetaScheduleDemo mode="series" onComplete={onboarding.completeDemo} />
      )}

      <div className={dimmed ? "pointer-events-none opacity-35 saturate-[0.6]" : undefined}>
        <h1 className="mb-1">10th Planet</h1>
      <h1 className="mb-1.5 text-accent">Warmup Trainer</h1>
      <p className="text-[11px] text-muted mt-0.5 mb-5 tracking-wide">openthesystem.app</p>
      <div ref={weekMenuRef} className="relative mb-8">
        <button
          type="button"
          className="text-[11px] text-muted mt-0.5 tracking-widest uppercase bg-transparent border-0 p-0 cursor-pointer hover:text-accent"
          aria-expanded={weekMenuOpen}
          aria-haspopup="listbox"
          aria-label={`Week ${schedule.weekNumber} of 8, choose week`}
          onClick={() => setWeekMenuOpen(open => !open)}
        >
          {SERIES.length} series · Week {schedule.weekNumber} of 8
          <span aria-hidden className="ml-1">▾</span>
        </button>
        {weekMenuOpen && (
          <ul
            role="listbox"
            aria-label="Schedule week"
            className="absolute z-20 left-0 mt-2 min-w-[220px] border border-border bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            {ROTATION_WEEKS.map(week => {
              const summary = formatWeekGroupsSummary(getScheduleState(new Date(), week).weekDays)
              const selected = week === viewWeek
              return (
                <li key={week} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={[
                      "w-full text-left px-3 py-2 border-0 bg-transparent cursor-pointer",
                      "text-[11px] tracking-wide uppercase group",
                      selected ? "text-accent" : "text-muted hover:text-accent",
                    ].join(" ")}
                    onClick={() => {
                      setViewWeek(week)
                      setWeekMenuOpen(false)
                    }}
                  >
                    <span
                      className={[
                        "font-disp font-bold tracking-widest",
                        selected ? "text-accent" : "text-text group-hover:text-accent",
                      ].join(" ")}
                    >
                      Week {week}
                    </span>
                    <span className={selected ? "text-accent" : "text-muted group-hover:text-accent"}>
                      {" "}· {summary}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {view === "week" ? (
        <>
          <WarmupScheduleTracker
            state={schedule}
            weekSummary={weekSummary}
            onGroupSelect={onSeriesSelect}
            demo={showDemo}
          />
          <SeriesIndexNav
            todayGroup={schedule.featuredGroup}
            activeLetter={demoSeriesLetter}
            onSeriesSelect={onSeriesSelect}
            onAllSelect={onAllSelect}
          />
          {demoSeriesLetter && (
            <SeriesDeckSection
              letter={demoSeriesLetter}
              progress={progress}
              onDeckClick={onDeckClick}
              onReviewClick={onReviewClick}
              demoFirstRow={showDemo}
            />
          )}
        </>
      ) : (
        <>
          <div className="mb-4">
            <button type="button" className="btn btn-ghost" onClick={onWeekSchedule}>
              ← Week schedule
            </button>
          </div>
          <SeriesIndexNav
            todayGroup={schedule.featuredGroup}
            allActive
            onSeriesSelect={onSeriesSelect}
            onAllSelect={onAllSelect}
          />
          <AllDeckSections
            progress={progress}
            onDeckClick={onDeckClick}
            onReviewClick={onReviewClick}
          />
        </>
      )}

      <hr />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="btn" onClick={onStats}>Stats</button>
      </div>
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
    </div>
  )
}
