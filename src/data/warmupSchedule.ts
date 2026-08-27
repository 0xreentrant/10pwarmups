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
  isToday: boolean
}

export interface ScheduleState {
  weekNumber: number
  isTrainingDay: boolean
  featuredGroup: SeriesId | null
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

export function formatWeekGroupsSummary(weekDays: WeekdaySlot[]): string {
  return weekDays
    .filter(d => d.group)
    .map(d => `${d.label} ${d.group}`)
    .join(" · ")
}

export function getScheduleState(date = new Date()): ScheduleState {
  const weekNumber = getWeekNumber(date)
  const weekGroups = SCHEDULE[weekNumber]
  const dayIndex = date.getDay()
  const isTrainingDay = dayIndex >= 1 && dayIndex <= 4
  const featuredGroup = isTrainingDay ? weekGroups[dayIndex - 1] : null

  const weekDays: WeekdaySlot[] = WEEKDAY_LABELS.map((label, index) => ({
    label,
    dayIndex: index,
    group: index >= 1 && index <= 4 ? weekGroups[index - 1] : null,
    isToday: index === dayIndex,
  }))

  return { weekNumber, isTrainingDay, featuredGroup, weekDays }
}
