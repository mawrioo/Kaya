import { DonutChart, type DonutSlice } from "@/components/home/donut-chart"
import { Money } from "@/components/money"
import { Panel } from "@/components/panel"
import { SeeAllLink } from "@/components/see-all-link"
import { formatMonth, formatPercent, formatRupiah } from "@/lib/format"
import { paletteClasses } from "@/lib/palette"
import type { CategorySpend } from "@/lib/stats"
import { cn } from "@/lib/utils"

interface SpendingByCategoryProps {
  rows: CategorySpend[]
  /** "2026-09" */
  month: string
  className?: string
}

/** Where the month's money went: a donut, and a legend with rupiah and percent. */
export function SpendingByCategory({ rows, month, className }: SpendingByCategoryProps) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  const slices: DonutSlice[] = rows.map(({ category, amount, percent }) => ({
    id: category.id,
    name: category.name,
    amount,
    percent,
    fill: `var(--cat-${category.color})`,
  }))

  return (
    <Panel title="Spending by category" caption={formatMonth(month)} action={<SeeAllLink href="/insights" />} className={className}>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No spending recorded yet.</p>
      ) : (
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-center">
          <DonutChart slices={slices}>
            <p className="text-xs text-muted-foreground">Total spent</p>
            <Money amount={total} className="font-serif text-base font-medium tracking-[-0.01em]" />
          </DonutChart>

          <ul className="w-full min-w-0 flex-1 text-sm lg:max-w-[22rem]">
            {rows.map(({ category, amount, percent }) => (
              <li key={category.id} className="flex items-center gap-3 py-1">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", paletteClasses[category.color].fill)}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 break-words">{category.name}</span>
                <span className="font-medium whitespace-nowrap tabular-nums">{formatRupiah(amount)}</span>
                <span className="w-10 text-right text-muted-foreground tabular-nums">
                  {formatPercent(percent)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
