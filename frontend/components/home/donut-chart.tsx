"use client"

import { Pie, PieChart, Tooltip } from "recharts"

import { formatPercent, formatRupiah } from "@/lib/format"

export interface DonutSlice {
  id: string
  name: string
  amount: number
  /** 0 to 100 */
  percent: number
  /** Any CSS color; we pass a theme variable such as "var(--cat-ochre)". */
  fill: string
}

const SIZE = 176

function SliceTooltip({ active, payload }: { active?: boolean; payload?: { payload: DonutSlice }[] }) {
  const slice = payload?.[0]?.payload
  if (!active || !slice) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="flex items-center gap-2 font-medium">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.fill }} aria-hidden />
        {slice.name}
      </p>
      <p className="mt-0.5 text-muted-foreground tabular-nums">
        {formatRupiah(slice.amount)} · {formatPercent(slice.percent)}
      </p>
    </div>
  )
}

/**
 * A donut with a label in the middle. It is decorative: the legend next to it
 * lists every slice in text, so the chart is hidden from screen readers.
 */
export function DonutChart({ slices, children }: { slices: DonutSlice[]; children?: React.ReactNode }) {
  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }} aria-hidden>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">{children}</div>
      <div className="donut-sweep size-full">
      <PieChart width={SIZE} height={SIZE} accessibilityLayer={false}>
        <Pie
          data={slices}
          dataKey="amount"
          nameKey="name"
          startAngle={90}
          endAngle={-270}
          innerRadius={58}
          outerRadius={86}
          paddingAngle={2}
          cornerRadius={4}
          minAngle={4}
          stroke="none"
          rootTabIndex={-1}
          isAnimationActive={false}
        />
        <Tooltip content={<SliceTooltip />} />
      </PieChart>
      </div>
    </div>
  )
}
