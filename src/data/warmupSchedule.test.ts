import { describe, it, expect } from "vitest"
import { formatWeekGroupsSummary, getScheduleState, getWeekNumber } from "./warmupSchedule"

describe("warmupSchedule", () => {
  it("maps week 6 wednesday to group F", () => {
    const state = getScheduleState(new Date(2026, 7, 26))
    expect(getWeekNumber(new Date(2026, 7, 26))).toBe(6)
    expect(state.featuredGroup).toBe("F")
    expect(state.isTrainingDay).toBe(true)
  })

  it("shows no featured group Fri-Sun but keeps the week schedule", () => {
    const fri = getScheduleState(new Date(2026, 7, 28))
    expect(fri.featuredGroup).toBe(null)
    expect(fri.isTrainingDay).toBe(false)
    expect(fri.weekDays.filter(d => d.group).map(d => d.group)).toEqual(["H", "G", "F", "E"])

    const sat = getScheduleState(new Date(2026, 7, 29))
    expect(sat.featuredGroup).toBe(null)
    expect(sat.weekDays.find(d => d.label === "Mon")?.group).toBe("H")
  })

  it("cycles after week 8", () => {
    expect(getWeekNumber(new Date(2026, 8, 14))).toBe(1)
  })

  it("formats week group summary", () => {
    const state = getScheduleState(new Date(2026, 7, 28))
    expect(formatWeekGroupsSummary(state.weekDays)).toBe("Mon H · Tue G · Wed F · Thu E")
  })

  it("overrides weekNumber while keeping the calendar weekday", () => {
    const wed = new Date(2026, 7, 26)
    expect(getWeekNumber(wed)).toBe(6)
    const week1 = getScheduleState(wed, 1)
    expect(week1.weekNumber).toBe(1)
    expect(week1.featuredGroup).toBe("C")
    expect(formatWeekGroupsSummary(week1.weekDays)).toBe("Mon A · Tue B · Wed C · Thu D")
  })
})
