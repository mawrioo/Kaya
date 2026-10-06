import { Progress } from "@/components/ui/progress"
import { budgetProgress } from "@/lib/category-summary"
import { formatPercent, formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

interface BudgetBarProps {
  /** The category's name, for the bar's spoken name ("Food budget"). */
  name: string
  /** What was spent in the month shown, and the monthly budget. */
  spent: number
  budget: number
  className?: string
}

/**
 * How far through a month's budget the spending has come: a thin bar, then the percentage and the budget
 * on the left and what is left on the right. Past the budget the bar is simply full and the right side says
 * how far over it went, in the same muted clay as any spending. Shown on the Categories page and on Insights.
 */
export function BudgetBar({ name, spent, budget, className }: BudgetBarProps) {
  const progress = budgetProgress(spent, budget)

  return (
    <div data-slot="category-budget" className={cn("mt-2.5", className)}>
      <Progress
        value={progress.fill}
        aria-label={`${name} budget`}
        aria-valuetext={`${formatPercent(progress.percent)} of the budget used`}
      />
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
        <span>
          {formatPercent(progress.percent)} of {formatRupiah(budget)}
        </span>
        {progress.over > 0 ? (
          <span className="font-medium text-negative">{formatRupiah(progress.over)} over</span>
        ) : (
          <span>{progress.left === 0 ? "Nothing left" : `${formatRupiah(progress.left)} left`}</span>
        )}
      </p>
    </div>
  )
}
