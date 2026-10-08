import { SERIES } from "./decks"

export type SeriesId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** Monday of week 1 in the 8-week rotation. */
export const SCHEDULE_EPOCH = new Date(2026, 6, 20)

const SCHEDULE: Record<number, readonly [SeriesId, SeriesId, SeriesId, SeriesId]> = {
  1: ["A", "B", "C", "D"],
  2: ["E", "F", "G", "H"],
  3: ["B", "A", "D", "C"],
  4: ["F", "E", "H", "G"],
  5: ["D", "C", "B", "A"],
  6: ["H", "G", "F", "E"],
  7: ["C", "D", "A", "B"],
  8: ["G", "H", "E", "F"],
}

export interface WeekdaySlot {
  label: (typeof WEEKDAY_LABELS)[number]
  dayIndex: number
  group: SeriesId | null
  /** Deck id for that day's series in this week's cycle (e.g. A1, B4). */
  deckId: string | null
  isToday: boolean
}

export interface ScheduleState {
  weekNumber: number
  isTrainingDay: boolean
  featuredGroup: SeriesId | null
  /** Deck for today’s featured series when it is a training day. */
  featuredDeckId: string | null
  weekDays: WeekdaySlot[]
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export function getWeekNumber(date: Date): number {
  const weeksFromEpoch = Math.floor(daysBetween(SCHEDULE_EPOCH, date) / 7)
  return ((((weeksFromEpoch % 8) + 8) % 8) + 1)
}

export function getSeriesName(id: SeriesId): string {
  return SERIES.find(s => s.id === id)?.name ?? id
}

/**
 * Which video in a series (1-4) plays in this week.
 * Each series appears four times in the 8-week cycle and advances A1-A2-A3-A4
 * (and the same for B-H) on each appearance.
 */
export function deckNumberForSeriesInWeek(weekNumber: number, series: SeriesId): number {
  let appearance = 0
  for (let week = 1; week <= weekNumber; week++) {
    if (SCHEDULE[week].includes(series)) appearance++
  }
  return appearance
}

export function deckIdForSeriesInWeek(weekNumber: number, series: SeriesId): string {
  return `${series}${deckNumberForSeriesInWeek(weekNumber, series)}`
}

export function formatWeekGroupsSummary(weekDays: WeekdaySlot[]): string {
  return weekDays
    .filter(d => d.deckId)
    .map(d => `${d.label} ${d.deckId}`)
    .join(" · ")
}

export const ROTATION_WEEKS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export function getScheduleState(date = new Date(), weekNumber = getWeekNumber(date)): ScheduleState {
  const weekGroups = SCHEDULE[weekNumber]
  const dayIndex = date.getDay()
  const isTrainingDay = dayIndex >= 1 && dayIndex <= 4
  const featuredGroup = isTrainingDay ? weekGroups[dayIndex - 1] : null
  const featuredDeckId = featuredGroup ? deckIdForSeriesInWeek(weekNumber, featuredGroup) : null

  const weekDays: WeekdaySlot[] = WEEKDAY_LABELS.map((label, index) => {
    const group = index >= 1 && index <= 4 ? weekGroups[index - 1] : null
    return {
      label,
      dayIndex: index,
      group,
      deckId: group ? deckIdForSeriesInWeek(weekNumber, group) : null,
      isToday: index === dayIndex,
    }
  })

  return { weekNumber, isTrainingDay, featuredGroup, featuredDeckId, weekDays }
}
