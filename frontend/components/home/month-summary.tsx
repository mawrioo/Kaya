import { Money } from "@/components/money"
import { Panel } from "@/components/panel"
import { formatMonth, formatPercent, formatRupiah } from "@/lib/format"
import type { MonthTotals } from "@/lib/stats"
import { cn } from "@/lib/utils"

interface MonthSummaryProps {
  totals: MonthTotals
  /** "2026-09" */
  month: string
  /** False when the current month is empty and an earlier one is shown instead. */
  isCurrentMonth: boolean
  className?: string
}

/** Income against spending for one month, and what was left over. */
export function MonthSummary({ totals, month, isCurrentMonth, className }: MonthSummaryProps) {
  const { income, spending, net } = totals
  const saved = net >= 0
  const biggest = Math.max(income, spending)

  const rows = [
    { label: "Income", amount: income, bar: "bg-cat-moss" },
    { label: "Spending", amount: spending, bar: "bg-cat-sand" },
  ]

  return (
    <Panel
      title={isCurrentMonth ? "This month" : formatMonth(month)}
      caption={isCurrentMonth ? formatMonth(month) : "Latest month with activity"}
      className={className}
    >
      {biggest === 0 ? (
        <p className="text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <div className="flex h-full flex-col justify-between gap-8">
          <div>
            <p className="text-sm text-muted-foreground">{saved ? "You saved" : "You overspent by"}</p>
            <p className={cn("mt-1", saved ? "text-positive" : "text-negative")}>
              <Money amount={Math.abs(net)} className="type-amount" />
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {saved
                ? income > 0
                  ? `${formatPercent((net / income) * 100)} of your income`
                  : "Nothing left over yet"
                : "Spending went past income"}
            </p>
          </div>

          <div className="space-y-5">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">{formatRupiah(row.amount)}</span>
                </div>
                <div className="mt-2.5 h-2.5" aria-hidden>
                  <div
                    className={cn("h-full rounded-full", row.bar)}
                    style={{ width: `${(row.amount / biggest) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}
