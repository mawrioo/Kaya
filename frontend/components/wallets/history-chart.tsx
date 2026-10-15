"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatDate, formatRupiah } from "@/lib/format"
import type { BalanceChange } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Point {
  /** Position along the chart: 0 for the first update, 1 for the next, and so on. */
  i: number
  /** "30 Sep" */
  label: string
  /** ISO date-time of the update. */
  at: string
  /** The balance right after the update. */
  value: number
  /** How much that update moved the balance. */
  change: number
}

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{formatDate(point.at)}</p>
      <p className="mt-0.5 tabular-nums">{formatRupiah(point.value)}</p>
      <p className={cn("tabular-nums", point.change >= 0 ? "text-positive" : "text-negative")}>
        {formatRupiah(point.change, { sign: "always" })}
      </p>
    </div>
  )
}

/**
 * A small line of the balance after each update, oldest on the left. The points
 * are evenly spaced (one per update) rather than spread by date, so a busy week
 * and a quiet month look the same. It is decorative: the list under it says
 * everything in text, so the chart is hidden from screen readers.
 */
export function HistoryChart({ rows }: { rows: BalanceChange[] }) {
  // The list is newest first; the chart reads left to right in time.
  const points: Point[] = [...rows].reverse().map((row, i) => ({
    i,
    label: formatDate(row.at).slice(0, -5),
    at: row.at,
    value: row.newBalance,
    change: row.newBalance - row.oldBalance,
  }))

  return (
    <div aria-hidden className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} accessibilityLayer={false}>
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, Math.max(points.length - 1, 1)]}
            ticks={points.map((point) => point.i)}
            tickFormatter={(i: number) => points[i]?.label ?? ""}
            interval="preserveStartEnd"
            padding={{ left: 20, right: 20 }}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          {/* No numbers down the side: the tooltip and the list carry the amounts. */}
          <YAxis
            hide
            domain={[(min: number) => Math.floor(min * 0.98), (max: number) => Math.ceil(max * 1.02)]}
          />
          <Tooltip content={<PointTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--chart-balance)"
            strokeWidth={2}
            dot={points.length <= 24 ? { r: 4, fill: "var(--card)", stroke: "var(--chart-balance)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: "var(--chart-balance)", stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
