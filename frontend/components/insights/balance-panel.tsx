"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { BalanceToggle, HideableMoney, useBalanceHidden } from "@/components/balance-visibility"
import { useData } from "@/components/data-provider"
import { Panel } from "@/components/panel"
import { balanceChangeText, balanceSeries, tightDate, type BalancePoint } from "@/lib/balance-history"
import { TOTAL_BALANCE_ID } from "@/lib/balance-visibility"
import { formatDate, formatMonthShort, formatRupiah } from "@/lib/format"
import { totalBalance } from "@/lib/stats"

interface BalancePanelProps {
  /** The first and last day of the period, "2026-09-01" and "2026-09-30". */
  from: string
  to: string
  /** Today, "2026-10-01": the line never goes past it. */
  today: string
  /** Names the period: "September 2026" or "2026". */
  caption: string
  /** Whether the days along the bottom are a week apart (a month) or are the months (a year). */
  scale: "weeks" | "months"
}

/**
 * The total of all the wallets over a month or a year, as one calm line: the total at the end, how it compares with the
 * first day in plain words (never coloured), and a line to hover over for any day. Earlier days are worked out backwards from
 * today's balances, so it is only as accurate as the records. It follows the eye of the total balance: while that is hidden,
 * so are the figure, the comparison and the line, because they would give it away.
 */
export function BalancePanel({ from, to, today, caption, scale }: BalancePanelProps) {
  const { wallets, transactions, balanceAdjustments } = useData()
  const hidden = useBalanceHidden(TOTAL_BALANCE_ID)
  const points = balanceSeries({ total: totalBalance(wallets), transactions, adjustments: balanceAdjustments, from, to, today })
  const last = points[points.length - 1]

  return (
    <Panel
      title="Total balance"
      caption={caption}
      // Negative margins let the round button bleed into the padding, so it sits level with the title.
      action={<BalanceToggle id={TOTAL_BALANCE_ID} label="total" className="-mt-2 -mr-2" />}
    >
      {!last ? (
        <p className="text-muted-foreground">There is nothing to draw for this period yet.</p>
      ) : (
        <>
          <p data-slot="balance-total">
            <HideableMoney id={TOTAL_BALANCE_ID} amount={last.total} className="type-amount" />
          </p>
          <p data-slot="balance-note" className="mt-1.5 text-sm text-muted-foreground">
            {hidden ? `On ${tightDate(last.date)}` : [`On ${tightDate(last.date)}`, balanceChangeText(points)].filter(Boolean).join(" · ")}
          </p>

          {hidden ? (
            <p className="mt-5 text-sm text-muted-foreground">The line is hidden while your total balance is.</p>
          ) : (
            <>
              <BalanceChart points={points} scale={scale} />
              <p className="mt-3 text-sm text-muted-foreground">
                Worked out from today&apos;s balances, your transactions and any balances you set by hand.
              </p>
              <BalanceTable points={points} scale={scale} />
            </>
          )}
        </>
      )}
    </Panel>
  )
}

/** Which days get a label along the bottom: every seventh day of a month, or the first day of each month of a year. */
function labelledDates(points: BalancePoint[], scale: BalancePanelProps["scale"]): string[] {
  if (scale === "weeks") return points.filter((_, index) => index % 7 === 0).map((point) => point.date)
  // A year: the first of each month, and the first day drawn when that isn't one.
  const firsts = points.filter((point) => point.date.endsWith("-01")).map((point) => point.date)
  return points[0] && !firsts.includes(points[0].date) ? [points[0].date, ...firsts] : firsts
}

function dayLabel(date: string, scale: BalancePanelProps["scale"]): string {
  return scale === "months" ? formatMonthShort(date.slice(0, 7)) : `${Number(date.slice(8))} ${formatMonthShort(date.slice(0, 7))}`
}

function BalanceTooltip({ active, payload }: { active?: boolean; payload?: { payload: BalancePoint }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{formatDate(point.date, { weekday: true })}</p>
      <p className="mt-0.5 tabular-nums">{formatRupiah(point.total)}</p>
    </div>
  )
}

/**
 * The line itself: no numbers down the side (the figure above and the tooltip carry the amounts), no dots, and the days
 * along the bottom. It is a picture only, so it is hidden from screen readers and has no tab stop.
 */
function BalanceChart({ points, scale }: { points: BalancePoint[]; scale: BalancePanelProps["scale"] }) {
  const totals = points.map((point) => point.total)
  const low = Math.min(...totals)
  const high = Math.max(...totals)
  // A little room above and below, and some even when the balance never moved.
  const room = (high - low || Math.abs(high) * 0.02 || 1) * 0.15

  return (
    <div data-slot="balance-chart" aria-hidden className="mt-5 h-44 w-full md:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} accessibilityLayer={false}>
          <XAxis
            dataKey="date"
            ticks={labelledDates(points, scale)}
            tickFormatter={(date: string) => dayLabel(date, scale)}
            interval="preserveStartEnd"
            minTickGap={8}
            padding={{ left: 16, right: 16 }}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis hide domain={[low - room, high + room]} />
          <Tooltip content={<BalanceTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Line
            dataKey="total"
            type="monotone"
            stroke="var(--chart-balance)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: "var(--chart-balance)", stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * The same figures as the line, in an expandable table: every day of a month, or the last day of each month of a
 * year. The scrolling region keeps long tables contained on a phone.
 */
function BalanceTable({ points, scale }: { points: BalancePoint[]; scale: BalancePanelProps["scale"] }) {
  const rows = scale === "weeks" ? points : points.filter((point, index) => index === points.length - 1 || points[index + 1].date.slice(0, 7) !== point.date.slice(0, 7))

  return (
    <details className="chart-figures mt-4 text-sm">
      <summary className="min-h-11 cursor-pointer rounded-md py-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">View balance figures</summary>
      <div className="max-h-80 overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="View balance figures">
      <table>
        <caption>{scale === "weeks" ? "Total balance at the end of each day" : "Total balance at the end of each month"}</caption>
        <thead>
          <tr>
            <th scope="col">{scale === "weeks" ? "Day" : "Month"}</th>
            <th scope="col">Total balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDate(point.date)}</th>
              <td>{formatRupiah(point.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </details>
  )
}
