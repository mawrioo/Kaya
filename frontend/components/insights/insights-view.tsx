"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"

import { useLiveDate } from "@/components/use-live-date"
import { useData } from "@/components/data-provider"
import { CompareTab } from "@/components/insights/compare-tab"
import { ExportMenu } from "@/components/insights/export-menu"
import { MonthSwitcher } from "@/components/insights/month-switcher"
import { MonthTab } from "@/components/insights/month-tab"
import { YearSwitcher } from "@/components/insights/year-switcher"
import { YearTab } from "@/components/insights/year-tab"
import { SegmentedSwitch } from "@/components/segmented-switch"
import { Button } from "@/components/ui/button"
import { toDateInput } from "@/lib/dates"
import { yearOf } from "@/lib/insights"
import { buildQuery, parseAddress, type CompareWith, type InsightsView as View } from "@/lib/insights-address"
import { monthBounds, pickMonth } from "@/lib/stats"

const VIEWS: { value: View; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "compare", label: "Compare" },
  { value: "year", label: "Year" },
]

/**
 * Everything under the heading on the Insights page, in three views: **Month** (one month at a time, with its chart and
 * every breakdown), **Compare** (two months side by side) and **Year** (a whole year, month by month). What is chosen is
 * kept in the address and read from it when the page opens, so a refresh, or the Back button after a click through to
 * the transactions, lands on the same view and month. `nowIso` comes from the server so the server and the browser
 * agree on the month.
 */
export function InsightsView({ nowIso }: { nowIso: string }) {
  const liveDate = useLiveDate(nowIso)
  const { transactions } = useData()
  const now = new Date(liveDate)
  const bounds = monthBounds(transactions, now)
  const years = { first: yearOf(bounds.first), last: yearOf(bounds.last) }

  // Read from the address, not from what the server sent: Back restores an older copy of the page that doesn't know the choices made since.
  const params = useSearchParams()
  const opened = parseAddress((name) => params.get(name))
  const [view, setView] = useState<View>(opened.view)
  const [chosenMonth, setChosenMonth] = useState<string | undefined>(opened.month)
  const [compareWith, setCompareWith] = useState<CompareWith>(opened.compareWith)
  const [chosenYear, setChosenYear] = useState<string | undefined>(opened.year)

  // The month Home shows is where it starts: this one, or the latest with activity while this one is still empty.
  const fallback = pickMonth(transactions, now)
  const month = chosenMonth !== undefined && chosenMonth >= bounds.first && chosenMonth <= bounds.last ? chosenMonth : fallback
  const year = chosenYear !== undefined && chosenYear >= years.first && chosenYear <= years.last ? chosenYear : yearOf(month)

  /** Changes what is chosen, and keeps the address in step without adding a step to the back button's history. */
  function choose(change: { view?: View; month?: string; compareWith?: CompareWith; year?: string }) {
    const next = { view, month, compareWith, year, ...change }
    if (change.view !== undefined) setView(change.view)
    if (change.month !== undefined) setChosenMonth(change.month)
    if (change.compareWith !== undefined) setCompareWith(change.compareWith)
    if (change.year !== undefined) setChosenYear(change.year)
    window.history.replaceState(null, "", buildQuery(next))
  }

  return (
    <div className="mt-4 flex flex-col gap-4 md:mt-10 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <SegmentedSwitch name="insights-view" legend="View" options={VIEWS} value={view} onChange={(next) => choose({ view: next })} />
          {/* In a div of its own, so the pill keeps its natural width instead of stretching across the page. */}
          <div>
            {view === "year" ? (
              <YearSwitcher year={year} first={years.first} last={years.last} onChange={(next) => choose({ year: next })} />
            ) : (
              <MonthSwitcher month={month} first={bounds.first} last={bounds.last} onChange={(next) => choose({ month: next })} />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* A month laid out as a sheet of paper, to print or keep as a PDF. There isn't one for a whole year. */}
          {view === "year" ? null : (
            <Button asChild variant="outline" size="lg">
              <Link href={`/insights/report?month=${month}`}>
                <Printer aria-hidden />
                Report
              </Link>
            </Button>
          )}
          <ExportMenu month={view === "year" ? undefined : month} year={view === "year" ? year : yearOf(month)} />
        </div>
      </div>

      {view === "month" ? <MonthTab month={month} bounds={bounds} today={toDateInput(now)} onChooseMonth={(next) => choose({ month: next })} /> : null}
      {view === "compare" ? (
        <CompareTab month={month} bounds={bounds} mode={compareWith} onChooseMode={(next) => choose({ compareWith: next })} />
      ) : null}
      {view === "year" ? <YearTab year={year} today={toDateInput(now)} onChooseMonth={(next) => choose({ view: "month", month: next })} /> : null}
    </div>
  )
}
