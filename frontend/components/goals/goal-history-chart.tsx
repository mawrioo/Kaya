"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatDate, formatRupiah } from "@/lib/format"
import type { GoalMovement } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Point {
  /** Position along the chart: 0 for the first change, 1 for the next, and so on. */
  i: number
  /** "30 Sep" */
  label: string
  /** ISO date-time of the change. */
  at: string
  /** What was saved right after it. */
  value: number
  /** How much that change moved it. */
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
 * How the goal filled up, oldest on the left. The points are evenly spaced (one
 * per change) rather than spread by date, so a busy week and a quiet month look
 * the same. It is decorative: the list under it says everything in text, so the
 * chart is hidden from screen readers.
 */
export function GoalHistoryChart({ rows, targetAmount }: { rows: GoalMovement[]; targetAmount: number }) {
  // The list is newest first; the chart reads left to right in time.
  const points: Point[] = [...rows].reverse().map((row, i) => ({
    i,
    label: formatDate(row.at).slice(0, -5),
    at: row.at,
    value: row.newSaved,
    change: row.newSaved - row.oldSaved,
  }))
  const highest = Math.max(...points.map((point) => point.value))

  return (
    <div aria-hidden className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} accessibilityLayer={false}>
          <defs>
            <linearGradient id="goal-history-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cat-ochre)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--cat-ochre)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
          {/* No numbers down the side: the tooltip and the list carry the amounts. The target
              sets the top, so the gap left to fill is part of the picture, unless it is already past. */}
          <YAxis hide domain={[0, Math.max(targetAmount, highest)]} />
          <Tooltip content={<PointTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--cat-ochre)"
            strokeWidth={2}
            fill="url(#goal-history-fill)"
            dot={points.length <= 24 ? { r: 4, fill: "var(--card)", stroke: "var(--cat-ochre)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: "var(--cat-ochre)", stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
