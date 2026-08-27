import { SERIES } from "../../data/decks"
import type { SeriesId } from "../../data/warmupSchedule"

const SERIES_NAV_LINK = "font-disp font-bold text-[0.85rem] tracking-widest uppercase text-muted no-underline transition-colors hover:text-accent bg-transparent border-0 p-0 cursor-pointer"
const SERIES_NAV_LINK_TODAY = "font-disp font-bold text-[0.85rem] tracking-widest uppercase text-accent no-underline bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)] px-1 border-0 cursor-pointer"
const SERIES_NAV_LINK_ACTIVE = "font-disp font-bold text-[0.85rem] tracking-widest uppercase text-accent no-underline border border-accent px-1 bg-transparent cursor-pointer"

interface SeriesIndexNavProps {
  todayGroup: SeriesId | null
  activeLetter?: SeriesId | null
  allActive?: boolean
  onSeriesSelect: (letter: SeriesId) => void
  onAllSelect: () => void
}

export default function SeriesIndexNav({
  todayGroup,
  activeLetter,
  allActive = false,
  onSeriesSelect,
  onAllSelect,
}: SeriesIndexNavProps) {
  return (
    <nav className="flex items-center gap-2 mb-7 border-y border-border py-2">
      <span className="text-[0.65rem] tracking-[0.14em] uppercase text-muted shrink-0">jump to:</span>
      <div className="flex flex-1 justify-between items-center gap-1 min-w-0">
        {SERIES.map(series => {
          const isToday = series.id === todayGroup
          const isActive = series.id === activeLetter
          const className = isToday
            ? SERIES_NAV_LINK_TODAY
            : isActive
            ? SERIES_NAV_LINK_ACTIVE
            : SERIES_NAV_LINK

          return (
            <button
              key={series.id}
              type="button"
              className={className}
              onClick={() => onSeriesSelect(series.id as SeriesId)}
            >
              {series.id}
            </button>
          )
        })}
        <button
          type="button"
          className={allActive ? SERIES_NAV_LINK_ACTIVE : SERIES_NAV_LINK}
          onClick={onAllSelect}
        >
          All
        </button>
      </div>
    </nav>
  )
}
