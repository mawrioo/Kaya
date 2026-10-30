"use client"

import { ArrowDownLeft, ArrowUpRight, CalendarDays, PiggyBank } from "lucide-react"

import { useData } from "@/components/data-provider"
import { BalancePanel } from "@/components/insights/balance-panel"
import { CategoryBreakdown } from "@/components/insights/category-breakdown"
import { MonthChart } from "@/components/insights/month-chart"
import { WeekdayBreakdown } from "@/components/insights/weekday-breakdown"
import { YearCoins } from "@/components/insights/year-coins"
import { Money } from "@/components/money"
import { Panel } from "@/components/panel"
import { StatCard } from "@/components/stat-card"
import { compareYearText } from "@/lib/category-summary"
import { yearDates } from "@/lib/dates"
import { formatMonth, formatMonthName, formatPercent, formatRupiah } from "@/lib/format"
import { breakdownOfMonths, monthsOfYear, savingsRate, weekdayAverages, yearTotals } from "@/lib/insights"
import { keptMonths } from "@/lib/recap"
import { monthKey, monthTotals } from "@/lib/stats"
import { cn } from "@/lib/utils"

const MINUS = String.fromCharCode(0x2212)

/** "60%" kept, "−50%" when more went out than came in, and a dash when nothing came in. */
function keptCell(income: number, spending: number): string {
  const rate = savingsRate(income, spending)
  if (rate === undefined) return "—"
  const whole = Math.round(rate)
  return `${whole < 0 ? MINUS : ""}${formatPercent(Math.abs(whole))}`
}

interface YearTabProps {
  year: string
  /** Today, "2026-10-01", from the server so the server and the browser agree. */
  today: string
  /** Picks a month: the page goes to the Month view on it. */
  onChooseMonth: (month: string) => void
}

/**
 * The Year view of Insights: what a whole year held (spent, earned, left over, and the average month), the twelve months
 * in a chart and in a table, the year's spending and income by category, each against the year before, and what a typical
 * day of the week cost.
 */
export function YearTab({ year, today, onChooseMonth }: YearTabProps) {
  const { categories, transactions } = useData()
  const previousYear = String(Number(year) - 1)
  const totals = yearTotals(transactions, year)
  const earlier = yearTotals(transactions, previousYear)
  const comparing = earlier.months > 0
  const months = monthsOfYear(year)
  const compare = (amount: number, before: number) => (comparing ? compareYearText(amount, before, previousYear) : undefined)
  const average = totals.months > 0 ? totals.spending / totals.months : 0
  const busy = new Set(transactions.filter((tx) => tx.type !== "transfer").map((tx) => monthKey(tx.date)))
  // What a typical Monday, Tuesday and so on cost over the months of the year that have transactions.
  const averages = weekdayAverages(transactions, year, today)
  const weekdays = averages
    ? averages.days.map(({ day, average }) => ({ day, amount: average }))
    : Array.from({ length: 7 }, (_, day) => ({ day, amount: 0 }))

  return (
    <>
      <div className="insight-stats grid grid-cols-1 gap-2 md:gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ArrowUpRight}
          label="Spent"
          value={<Money amount={-totals.spending} className={totals.spending === 0 ? "text-muted-foreground" : "text-negative"} />}
          helper={compare(totals.spending, earlier.spending)}
          helperTone="muted"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Earned"
          value={<Money amount={totals.income} sign="always" className={totals.income === 0 ? "text-muted-foreground" : "text-positive"} />}
          helper={compare(totals.income, earlier.income)}
          helperTone="muted"
        />
        <StatCard
          icon={PiggyBank}
          label="Left over"
          value={<Money amount={totals.net} className={totals.net === 0 ? "text-muted-foreground" : totals.net > 0 ? "text-positive" : "text-negative"} />}
          helper={compare(totals.net, earlier.net)}
          helperTone="muted"
        />
        <StatCard
          icon={CalendarDays}
          label="Average month"
          value={<Money amount={-average} className={average === 0 ? "text-muted-foreground" : "text-negative"} />}
          helper={totals.months > 0 ? `Spent, over ${totals.months} ${totals.months === 1 ? "month" : "months"} with transactions` : undefined}
          helperTone="muted"
        />
      </div>

      <YearCoins months={keptMonths(transactions, year)} />

      <MonthChart transactions={transactions} categories={categories} months={months} onSelect={onChooseMonth} />

      <BalancePanel {...yearDates(year)} today={today} caption={year} scale="months" />

      <Panel title="The year in numbers" caption={`${year}, one line for each month`}>
        <div className="@container" data-slot="year-table">
          <div role="table" aria-label={`Each month of ${year}`} className="divide-y">
            <div role="row" className="sr-only @xl:not-sr-only @xl:grid @xl:grid-cols-[minmax(0,1.2fr)_1fr_1fr_1fr_0.6fr] gap-x-4 pb-2 text-sm text-muted-foreground">
              <div role="columnheader">Month</div>
              <div role="columnheader" className="text-right">Spent</div>
              <div role="columnheader" className="text-right">Earned</div>
              <div role="columnheader" className="text-right">Left over</div>
              <div role="columnheader" className="text-right">Kept</div>
            </div>
            {months.map((month) => {
              const row = monthTotals(transactions, month)
              const has = busy.has(month)
              return (
                <YearLine
                  key={month}
                  name={
                    has ? (
                      <button
                        type="button"
                        onClick={() => onChooseMonth(month)}
                        aria-label={`Open ${formatMonth(month)}`}
                        className="tap-area rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        {formatMonthName(month)}
                      </button>
                    ) : (
                      <span className="font-medium text-muted-foreground">{formatMonthName(month)}</span>
                    )
                  }
                  id={month}
                  cells={has ? { spent: row.spending, earned: row.income, left: row.net, kept: keptCell(row.income, row.spending) } : undefined}
                />
              )
            })}
            <YearLine
              id="average"
              emphasis
              name={<span className="font-medium">Average month</span>}
              cells={
                totals.months > 0
                  ? {
                      spent: totals.spending / totals.months,
                      earned: totals.income / totals.months,
                      left: totals.net / totals.months,
                      kept: keptCell(totals.income, totals.spending),
                    }
                  : undefined
              }
            />
            <YearLine
              id="total"
              emphasis
              name={<span className="font-medium">Whole year</span>}
              cells={totals.months > 0 ? { spent: totals.spending, earned: totals.income, left: totals.net, kept: keptCell(totals.income, totals.spending) } : undefined}
            />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 md:gap-6 xl:grid-cols-2">
        <CategoryBreakdown
          title="Spending by category"
          emptyText="Nothing spent this year."
          type="expense"
          period={year}
          previousPeriod={comparing ? previousYear : undefined}
          rows={breakdownOfMonths(transactions, categories, "expense", months, comparing ? monthsOfYear(previousYear) : undefined)}
        />
        <div className="flex flex-col gap-6">
          <CategoryBreakdown
            title="Income by category"
            emptyText="Nothing earned this year."
            type="income"
            period={year}
            previousPeriod={comparing ? previousYear : undefined}
            rows={breakdownOfMonths(transactions, categories, "income", months, comparing ? monthsOfYear(previousYear) : undefined)}
          />
          <WeekdayBreakdown
            days={weekdays}
            title="Average spending by day of the week"
            period={year}
            note={averages ? `average over ${averages.months} ${averages.months === 1 ? "month" : "months"} with transactions` : undefined}
            emptyText="Nothing spent this year."
          />
        </div>
      </div>
    </>
  )
}

interface YearLineProps {
  id: string
  name: React.ReactNode
  /** Undefined for a month with nothing in it: its cells are dashes. */
  cells?: { spent: number; earned: number; left: number; kept: string }
  /** The average and the total lines are set a little apart. */
  emphasis?: boolean
}

/** One line of the year table: a month (or the average, or the whole year) and its four figures. */
function YearLine({ id, name, cells, emphasis }: YearLineProps) {
  const dash = "—"
  const money = (kind: "expense" | "income" | "net", value: number | undefined) => {
    if (value === undefined) return <span className="text-muted-foreground">{dash}</span>
    if (value === 0) return <span className="text-muted-foreground">{formatRupiah(0)}</span>
    if (kind === "expense") return <span className="text-negative">{formatRupiah(-value)}</span>
    if (kind === "income") return <span className="text-positive">{formatRupiah(value, { sign: "always" })}</span>
    return <span className={value > 0 ? "text-positive" : "text-negative"}>{formatRupiah(value)}</span>
  }

  const cell = (label: string, content: React.ReactNode, slot: string) => (
    <div role="cell" data-slot={slot} className={cn("@xl:text-right", !cells && "hidden @xl:block")}>
      <span className="block text-xs text-muted-foreground @xl:hidden">{label}</span>
      <span className="whitespace-nowrap tabular-nums">{content}</span>
    </div>
  )

  return (
    <div
      role="row"
      data-slot="year-row"
      data-row={id}
      className={cn("grid grid-cols-2 gap-x-4 gap-y-1.5 py-3 @xl:grid-cols-[minmax(0,1.2fr)_1fr_1fr_1fr_0.6fr] @xl:items-baseline", emphasis && "bg-muted/40")}
    >
      <div role="rowheader" data-slot="year-name" className="col-span-2 min-w-0 @xl:col-span-1">
        {name}
        {/* On a narrow screen the four dashes would take three lines, so one quiet phrase says it instead. */}
        {cells ? null : <span className="ml-3 text-sm text-muted-foreground @xl:hidden">No transactions</span>}
      </div>
      {cell("Spent", money("expense", cells?.spent), "year-spent")}
      {cell("Earned", money("income", cells?.earned), "year-earned")}
      {cell("Left over", money("net", cells?.left), "year-left")}
      {cell("Kept", <span className={cells ? "" : "text-muted-foreground"}>{cells?.kept ?? dash}</span>, "year-kept")}
    </div>
  )
}
