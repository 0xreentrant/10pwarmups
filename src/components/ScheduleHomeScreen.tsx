import { useEffect, useState } from "react"
import BetaProgressIntro from "./BetaProgressIntro"
import BetaScheduleDemo from "./beta/BetaScheduleDemo"
import AllDeckSections from "./schedule/AllDeckSections"
import SeriesDeckSection from "./schedule/SeriesDeckSection"
import SeriesIndexNav from "./schedule/SeriesIndexNav"
import WarmupScheduleTracker from "./schedule/WarmupScheduleTracker"
import { useScheduleOnboarding } from "../hooks/useScheduleOnboarding"
import { SERIES } from "../data/decks"
import { formatWeekGroupsSummary, getScheduleState, type SeriesId } from "../data/warmupSchedule"
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
  const onboarding = useScheduleOnboarding()
  const schedule = getScheduleState()
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
      <p className="text-[11px] text-muted mt-0.5 mb-8 tracking-widest uppercase">
        {SERIES.length} series · Week {schedule.weekNumber} of 8
      </p>

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
