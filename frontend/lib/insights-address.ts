/**
 * What the Insights page keeps in its address, so a refresh or the Back button lands on the same view:
 *   /insights                                  the Month view, on the usual month
 *   /insights?month=2026-08                    the Month view on August 2026
 *   /insights?view=compare&month=2026-09&with=2026-08
 *   /insights?view=compare&month=2026-09&with=year      (with the same month last year; "before" is the default)
 *   /insights?view=year&year=2026
 * Anything that doesn't make sense is ignored. Pure functions, no React.
 */
import { isMonth, isYear } from "@/lib/dates"

export type InsightsView = "month" | "compare" | "year"

/** What the second month of a comparison is: the month before, the same month a year earlier, or a month of its own choosing ("2026-08"). */
export type CompareWith = "before" | "year" | string

export interface InsightsAddress {
  view: InsightsView
  month?: string
  compareWith: CompareWith
  year?: string
}

/** Reads the address. `get` is `searchParams.get`. */
export function parseAddress(get: (name: string) => string | null): InsightsAddress {
  const view = get("view")
  const month = get("month")
  const compareWith = get("with")
  const year = get("year")
  return {
    view: view === "compare" || view === "year" ? view : "month",
    month: month !== null && isMonth(month) ? month : undefined,
    compareWith: compareWith === "year" ? "year" : compareWith !== null && isMonth(compareWith) ? compareWith : "before",
    year: year !== null && isYear(year) ? year : undefined,
  }
}

/** Writes the address for a view, leaving out whatever is the usual choice. It always starts with "?". */
export function buildQuery({ view, month, compareWith, year }: InsightsAddress): string {
  const params = new URLSearchParams()
  if (view !== "month") params.set("view", view)
  if (view === "year") {
    if (year) params.set("year", year)
  } else {
    if (month) params.set("month", month)
    if (view === "compare" && compareWith !== "before") params.set("with", compareWith)
  }
  return `?${params.toString()}`
}
