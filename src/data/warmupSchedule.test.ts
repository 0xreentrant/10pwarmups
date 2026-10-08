import { describe, it, expect } from "vitest"
import {
  deckIdForSeriesInWeek,
  formatWeekGroupsSummary,
  getScheduleState,
  getWeekNumber,
} from "./warmupSchedule"

describe("warmupSchedule", () => {
  it("maps week 6 wednesday to group F", () => {
    const state = getScheduleState(new Date(2026, 7, 26))
    expect(getWeekNumber(new Date(2026, 7, 26))).toBe(6)
    expect(state.featuredGroup).toBe("F")
    expect(state.featuredDeckId).toBe("F3")
    expect(state.isTrainingDay).toBe(true)
  })

  it("shows no featured group Fri-Sun but keeps the week schedule", () => {
    const fri = getScheduleState(new Date(2026, 7, 28))
    expect(fri.featuredGroup).toBe(null)
    expect(fri.featuredDeckId).toBe(null)
    expect(fri.isTrainingDay).toBe(false)
    expect(fri.weekDays.filter(d => d.group).map(d => d.group)).toEqual(["H", "G", "F", "E"])
    expect(fri.weekDays.filter(d => d.deckId).map(d => d.deckId)).toEqual(["H3", "G3", "F3", "E3"])

    const sat = getScheduleState(new Date(2026, 7, 29))
    expect(sat.featuredGroup).toBe(null)
    expect(sat.weekDays.find(d => d.label === "Mon")?.group).toBe("H")
    expect(sat.weekDays.find(d => d.label === "Mon")?.deckId).toBe("H3")
  })

  it("cycles after week 8", () => {
    expect(getWeekNumber(new Date(2026, 8, 14))).toBe(1)
  })

  it("formats week group summary with deck numbers", () => {
    const state = getScheduleState(new Date(2026, 7, 28))
    expect(formatWeekGroupsSummary(state.weekDays)).toBe("Mon H3 · Tue G3 · Wed F3 · Thu E3")
  })

  it("overrides weekNumber while keeping the calendar weekday", () => {
    const wed = new Date(2026, 7, 26)
    expect(getWeekNumber(wed)).toBe(6)
    const week1 = getScheduleState(wed, 1)
    expect(week1.weekNumber).toBe(1)
    expect(week1.featuredGroup).toBe("C")
    expect(week1.featuredDeckId).toBe("C1")
    expect(formatWeekGroupsSummary(week1.weekDays)).toBe("Mon A1 · Tue B1 · Wed C1 · Thu D1")
  })

  it("advances deck numbers by appearance in the 8-week cycle", () => {
    expect(deckIdForSeriesInWeek(1, "A")).toBe("A1")
    expect(deckIdForSeriesInWeek(7, "A")).toBe("A4")
    expect(deckIdForSeriesInWeek(7, "C")).toBe("C4")
    expect(deckIdForSeriesInWeek(8, "F")).toBe("F4")
    expect(formatWeekGroupsSummary(getScheduleState(new Date(), 7).weekDays)).toBe(
      "Mon C4 · Tue D4 · Wed A4 · Thu B4",
    )
  })
})
