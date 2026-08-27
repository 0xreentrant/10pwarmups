import { getSeriesName, type ScheduleState, type SeriesId } from "../../data/warmupSchedule"

const PILL_BASE = "px-2 py-1 text-[10px] tracking-wide uppercase border"

function TodayBanner({
  isTrainingDay,
  featuredGroup,
  weekSummary,
}: {
  isTrainingDay: boolean
  featuredGroup: SeriesId | null
  weekSummary: string
}) {
  if (isTrainingDay && featuredGroup) {
    return (
      <div className="mb-4 px-2 py-2 border border-accent text-[11px] tracking-wide uppercase">
        Today · <span className="text-accent font-disp font-bold">{featuredGroup}</span> · {getSeriesName(featuredGroup)}
      </div>
    )
  }

  return (
    <div className="mb-4 pb-4 border-b border-border">
      <p className="text-[0.65rem] tracking-[0.18em] uppercase text-muted mb-2">Today</p>
      <p className="font-disp font-bold text-[0.95rem] uppercase tracking-wide mb-1">No scheduled warmup</p>
      <p className="text-muted text-[11px]">This week&apos;s warmups were {weekSummary}.</p>
    </div>
  )
}

function WeekPills({
  weekDays,
  onGroupSelect,
}: {
  weekDays: ScheduleState["weekDays"]
  onGroupSelect: (group: SeriesId) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 mb-4">
      {weekDays.map(day => {
        const className = [
          PILL_BASE,
          day.isToday ? "border-accent text-accent" : "border-border text-muted",
          day.group ? "hover:text-accent transition-colors cursor-pointer" : "",
        ].join(" ")
        const label = `${day.label}${day.group ? ` ${day.group}` : " rest"}`

        if (day.group) {
          return (
            <button key={day.label} type="button" className={className} onClick={() => onGroupSelect(day.group!)}>
              {label}
            </button>
          )
        }

        return (
          <div key={day.label} className={className}>
            {label}
          </div>
        )
      })}
    </div>
  )
}

interface WarmupScheduleTrackerProps {
  state: ScheduleState
  weekSummary: string
  onGroupSelect: (group: SeriesId) => void
  demo?: boolean
}

export default function WarmupScheduleTracker({
  state,
  weekSummary,
  onGroupSelect,
  demo = false,
}: WarmupScheduleTrackerProps) {
  return (
    <div data-beta-demo={demo ? "tracker" : undefined}>
      <p className="text-[0.65rem] tracking-[0.18em] uppercase text-muted mb-2">This week&apos;s schedule</p>
      <WeekPills weekDays={state.weekDays} onGroupSelect={onGroupSelect} />
      <TodayBanner
        isTrainingDay={state.isTrainingDay}
        featuredGroup={state.featuredGroup}
        weekSummary={weekSummary}
      />
    </div>
  )
}
