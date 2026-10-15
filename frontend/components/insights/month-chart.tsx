"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Bar, BarChart, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Panel } from "@/components/panel"
import { SegmentedSwitch } from "@/components/segmented-switch"
import { formatMonth, formatMonthShort, formatPercent, formatRupiah } from "@/lib/format"
import { chartMonths, monthlyPoints, savingsRate, type MonthPoint } from "@/lib/insights"
import type { Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

type View = "totals" | "categories" | "savings"

const VIEWS: { value: View; label: string }[] = [
  { value: "totals", label: "Totals" },
  { value: "categories", label: "Categories" },
  { value: "savings", label: "Savings" },
]

// Income and spending stay neutral (moss and sand), like the bars on Home. The savings line is the app's own green.
const INCOME_FILL = "var(--chart-income)"
const SPENDING_FILL = "var(--chart-spending)"
const SAVINGS_STROKE = "var(--chart-balance)"

interface MonthChartProps {
  transactions: Transaction[]
  categories: Category[]
  /**
   * What to show. Give `months` for exactly those months (a whole year). Otherwise give `bounds` (the first and last month
   * that can be reached) and `selected`, and the chart shows as many recent months as fit, always including the chosen one.
   */
  months?: string[]
  bounds?: { first: string; last: string }
  /** The month the rest of the page is about, "2026-09". It is marked on the chart. Leave it out when no month is chosen. */
  selected?: string
  /** Clicking a month's bars (or its point on the savings line) picks it. */
  onSelect: (month: string) => void
  title?: string
}

interface Row {
  month: string
  income: number
  spending: number
  /** The share of the income that was kept, or null when nothing came in. */
  rate: number | null
  point: MonthPoint
}

/** A spending category that appears somewhere in the months shown, with what it came to in all of them. */
interface Segment {
  category: Category
  total: number
}

/** The least room a month's label and bars need, in pixels. A narrow screen shows fewer months so no label touches another. */
const ROOM_PER_MONTH = 38
const MOST_MONTHS = 12
const FEWEST_MONTHS = 3

/**
 * The months side by side, in three views. "Totals" puts income next to spending for each month; "Categories" stacks each
 * month's spending by category; "Savings" draws the share of each month's income that was kept as a line. It shows up
 * to 12 months, fewer on a narrow screen. The chosen month sits on a soft band (or a faint line on the savings view) and
 * clicking a month picks it. The chart is a picture only: it is hidden from screen readers (they get the same figures as
 * a table), it has no tab stop, and the arrows above the page already change the month.
 */
export function MonthChart({ transactions, categories, months, bounds, selected, onSelect, title = "Month by month" }: MonthChartProps) {
  const [view, setView] = useState<View>("totals")

  // How many months fit: measured before the first paint, and again whenever the room changes.
  const body = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(0)
  useLayoutEffect(() => {
    const element = body.current
    if (!element) return
    const measure = () => setRoom(element.clientWidth)
    measure()
    const watcher = new ResizeObserver(measure)
    watcher.observe(element)
    return () => watcher.disconnect()
  }, [])
  const size = room === 0 ? MOST_MONTHS : Math.min(MOST_MONTHS, Math.max(FEWEST_MONTHS, Math.floor(room / ROOM_PER_MONTH)))
  const shown = months ?? (bounds && selected ? chartMonths(bounds, selected, size) : [])
  const points = monthlyPoints(transactions, shown)
  // A whole year on a phone has no room for three letters under each month, so one letter stands for it.
  const compact = months !== undefined && room > 0 && room / months.length < ROOM_PER_MONTH

  const rows: Row[] = points.map((point) => ({
    month: point.month,
    income: point.income,
    spending: point.spending,
    rate: savingsRate(point.income, point.spending) ?? null,
    point,
  }))
  const first = points[0]?.month
  const last = points.at(-1)?.month
  const hasData = points.some((point) => point.income > 0 || point.spending > 0)

  // Biggest overall first, so the largest category sits at the bottom of every stack.
  const segments: Segment[] = categories
    .filter((category) => category.type === "expense")
    .map((category) => ({ category, total: points.reduce((sum, point) => sum + (point.spentBy[category.id] ?? 0), 0) }))
    .filter((segment) => segment.total > 0)
    .sort((a, b) => b.total - a.total)

  const pick = (state: { activeIndex?: number | string | null } | undefined) => {
    const index = Number(state?.activeIndex)
    if (Number.isInteger(index) && points[index]) onSelect(points[index].month)
  }
  const axis = (
    <XAxis
      dataKey="month"
      interval={0}
      tickLine={false}
      axisLine={view === "savings" ? false : { stroke: "var(--border)" }}
      height={44}
      tick={<MonthTick selected={selected} first={first} compact={compact} />}
      padding={view === "savings" ? { left: 14, right: 14 } : undefined}
    />
  )

  return (
    <Panel
      title={title}
      caption={first && last && first !== last ? `${formatMonth(first)} to ${formatMonth(last)}` : first ? formatMonth(first) : undefined}
    >
      <div ref={body}>
        {!hasData ? (
          <p className="text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <>
            <SegmentedSwitch name="chart-view" legend="What the chart shows" options={VIEWS} value={view} onChange={setView} />

            <div data-slot="month-chart" aria-hidden className="mt-5 h-60 w-full cursor-pointer md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                {view === "savings" ? (
                  <LineChart data={rows} margin={{ top: 12, right: 4, bottom: 0, left: 4 }} accessibilityLayer={false} onClick={pick}>
                    {axis}
                    <YAxis hide domain={savingsDomain(rows)} />
                    <Tooltip content={<MonthTooltip view={view} segments={segments} />} cursor={{ stroke: "var(--border)" }} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.45} />
                    {selected ? <ReferenceLine x={selected} stroke={SAVINGS_STROKE} strokeOpacity={0.3} strokeDasharray="4 4" /> : null}
                    <Line
                      dataKey="rate"
                      type="monotone"
                      stroke={SAVINGS_STROKE}
                      strokeWidth={2}
                      connectNulls={false}
                      dot={<SavingsDot selected={selected} />}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="16%" barGap={3} accessibilityLayer={false} onClick={pick}>
                    {axis}
                    {/* No numbers down the side: the tooltip, the cards above and the table for screen readers carry the amounts. */}
                    <YAxis hide />
                    <Tooltip content={<MonthTooltip view={view} segments={segments} />} cursor={{ fill: "var(--muted)", fillOpacity: 0.7 }} />
                    {selected ? <ReferenceArea x1={selected} x2={selected} fill="var(--sage)" fillOpacity={0.55} ifOverflow="visible" /> : null}
                    {view === "totals" ? (
                      <>
                        <Bar dataKey="income" fill={INCOME_FILL} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
                        <Bar dataKey="spending" fill={SPENDING_FILL} radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
                      </>
                    ) : (
                      segments.map(({ category }) => (
                        <Bar
                          key={category.id}
                          dataKey={(row: Row) => row.point.spentBy[category.id] ?? 0}
                          name={category.name}
                          stackId="spending"
                          fill={`var(--cat-${category.color})`}
                          stroke="var(--card)"
                          strokeWidth={1}
                          maxBarSize={48}
                          isAnimationActive={false}
                        />
                      ))
                    )}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <ul data-slot="chart-legend" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {(view === "totals"
                ? [
                    { id: "income", name: "Income", fill: INCOME_FILL },
                    { id: "spending", name: "Spending", fill: SPENDING_FILL },
                  ]
                : view === "savings"
                  ? [{ id: "kept", name: "Share of income kept", fill: SAVINGS_STROKE }]
                  : segments.map(({ category }) => ({ id: category.id, name: category.name, fill: `var(--cat-${category.color})` }))
              ).map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} aria-hidden />
                  <span className="break-words">{item.name}</span>
                </li>
              ))}
            </ul>
            {view === "savings" ? (
              <p data-slot="savings-hint" className="mt-2 text-sm text-muted-foreground">
                Each point is the share of that month&apos;s income that was kept. At 0% everything was spent, and below it more was spent than earned.
              </p>
            ) : null}

            <p className="mt-3 text-sm text-muted-foreground">Transfers between your wallets are excluded. Open the figures below to compare exact amounts or choose a month.</p>
            <MonthTable points={points} segments={segments} view={view} onSelect={onSelect} selected={selected} />
          </>
        )}
      </div>
    </Panel>
  )
}

/** The savings line's vertical range: always includes 0, with a little room above and below. */
function savingsDomain(rows: Row[]): [number, number] {
  const rates = rows.flatMap((row) => (row.rate === null ? [] : [row.rate]))
  const low = Math.min(0, ...rates)
  const high = Math.max(0, ...rates)
  const room = (high - low || 20) * 0.12
  return [low - room, high + room]
}

/** One point on the savings line: a ring, and a filled dot for the chosen month. */
function SavingsDot({ cx, cy, payload, selected }: { cx?: number; cy?: number; payload?: Row; selected?: string }) {
  if (cx === undefined || cy === undefined || payload?.rate === null) return null
  const chosen = payload?.month === selected
  return <circle cx={cx} cy={cy} r={chosen ? 6 : 4} fill={chosen ? SAVINGS_STROKE : "var(--card)"} stroke={SAVINGS_STROKE} strokeWidth={2} />
}

/** A month's label under its bars: "Sep", with the year underneath it for the first month shown and for every January. */
function MonthTick({
  x,
  y,
  payload,
  selected,
  first,
  compact,
}: {
  x?: number
  y?: number
  payload?: { value: string }
  selected?: string
  first?: string
  compact?: boolean
}) {
  const month = payload?.value
  if (!month || x === undefined || y === undefined) return null
  const isSelected = month === selected
  const showYear = !compact && (month === first || month.endsWith("-01"))

  return (
    <text x={x} y={y} textAnchor="middle" fontSize={12} className={isSelected ? "fill-foreground font-semibold" : "fill-muted-foreground"}>
      <tspan x={x} dy={16}>
        {compact ? formatMonthShort(month).slice(0, 1) : formatMonthShort(month)}
      </tspan>
      {showYear ? (
        <tspan x={x} dy={14} fontSize={11}>
          {month.slice(0, 4)}
        </tspan>
      ) : null}
    </text>
  )
}

function MonthTooltip({
  active,
  payload,
  view,
  segments,
}: {
  active?: boolean
  payload?: { payload: Row }[]
  view: View
  segments: Segment[]
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const { point } = row
  const net = point.income - point.spending

  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{formatMonth(point.month)}</p>
      {view === "totals" ? (
        <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: INCOME_FILL }} aria-hidden />
            Income
          </dt>
          <dd className="text-right text-positive">{formatRupiah(point.income, { sign: "always" })}</dd>
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: SPENDING_FILL }} aria-hidden />
            Spending
          </dt>
          <dd className="text-right text-negative">{formatRupiah(-point.spending)}</dd>
          <dt className="mt-1 border-t pt-1 text-muted-foreground">Left over</dt>
          <dd className={cn("mt-1 border-t pt-1 text-right", net < 0 ? "text-negative" : "text-positive")}>{formatRupiah(net)}</dd>
        </dl>
      ) : view === "savings" ? (
        row.rate === null ? (
          <p className="mt-1 text-muted-foreground">No income this month, so there is no share to show.</p>
        ) : (
          <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
            <dt className="text-muted-foreground">Kept</dt>
            <dd className={cn("text-right font-medium", row.rate < 0 ? "text-negative" : "text-positive")}>{keptText(row.rate)}</dd>
            <dt className="text-muted-foreground">Left over</dt>
            <dd className="text-right">{formatRupiah(net)}</dd>
            <dt className="text-muted-foreground">Income</dt>
            <dd className="text-right">{formatRupiah(point.income)}</dd>
          </dl>
        )
      ) : (
        <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
          {segments
            .filter(({ category }) => (point.spentBy[category.id] ?? 0) > 0)
            .sort((a, b) => (point.spentBy[b.category.id] ?? 0) - (point.spentBy[a.category.id] ?? 0))
            .map(({ category }) => (
              <div key={category.id} className="contents">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--cat-${category.color})` }} aria-hidden />
                  {category.name}
                </dt>
                <dd className="text-right">{formatRupiah(point.spentBy[category.id])}</dd>
              </div>
            ))}
          <dt className="mt-1 border-t pt-1 text-muted-foreground">Total spent</dt>
          <dd className="mt-1 border-t pt-1 text-right font-medium text-negative">{formatRupiah(-point.spending)}</dd>
        </dl>
      )}
    </div>
  )
}

/** "60% of income", or "−50% of income" when more went out than came in (a minus sign, not a hyphen). */
function keptText(rate: number): string {
  const whole = Math.round(rate)
  return `${whole < 0 ? String.fromCharCode(0x2212) : ""}${formatPercent(Math.abs(whole))} of income`
}

/**
 * Exact figures behind a native disclosure, usable with touch and keyboard. Wide category tables scroll
 * inside their own region; they never widen the page.
 */
function MonthTable({ points, segments, view, onSelect, selected }: { points: MonthPoint[]; segments: Segment[]; view: View; onSelect: (month: string) => void; selected?: string }) {
  return (
    <details className="chart-figures mt-4 text-sm">
      <summary className="min-h-11 cursor-pointer rounded-md py-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">View monthly figures</summary>
      <div className="max-h-80 overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="View monthly figures">
      <table>
        <caption>
          {view === "totals" ? "Income and spending, month by month" : view === "savings" ? "Share of income kept, month by month" : "Spending by category, month by month"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {view === "totals" ? (
              <>
                <th scope="col">Income</th>
                <th scope="col">Spending</th>
                <th scope="col">Left over</th>
              </>
            ) : view === "savings" ? (
              <>
                <th scope="col">Income</th>
                <th scope="col">Left over</th>
                <th scope="col">Share of income kept</th>
              </>
            ) : (
              <>
                {segments.map(({ category }) => (
                  <th key={category.id} scope="col">
                    {category.name}
                  </th>
                ))}
                <th scope="col">Total spent</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => {
            const rate = savingsRate(point.income, point.spending)
            return (
              <tr key={point.month}>
                <th scope="row"><button type="button" aria-current={selected === point.month ? "date" : undefined} onClick={() => onSelect(point.month)} className="min-h-11 cursor-pointer rounded-md text-left underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{formatMonth(point.month)}</button></th>
                {view === "totals" ? (
                  <>
                    <td>{formatRupiah(point.income)}</td>
                    <td>{formatRupiah(point.spending)}</td>
                    <td>{formatRupiah(point.income - point.spending)}</td>
                  </>
                ) : view === "savings" ? (
                  <>
                    <td>{formatRupiah(point.income)}</td>
                    <td>{formatRupiah(point.income - point.spending)}</td>
                    <td>{rate === undefined ? "No income" : keptText(rate)}</td>
                  </>
                ) : (
                  <>
                    {segments.map(({ category }) => (
                      <td key={category.id}>{formatRupiah(point.spentBy[category.id] ?? 0)}</td>
                    ))}
                    <td>{formatRupiah(point.spending)}</td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </details>
  )
}
