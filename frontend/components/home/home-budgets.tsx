import { BudgetRow, MonthBudgetRow } from "@/components/budget-row"
import { Panel } from "@/components/panel"
import { SeeAllLink } from "@/components/see-all-link"
import { formatMonth } from "@/lib/format"
import { categoryTotals, monthTotals } from "@/lib/stats"
import type { Category, Transaction } from "@/lib/types"

/**
 * The budgets, for the month Home shows, with the same calm bars as on Categories and Insights: the budget for the whole
 * month first, if there is one, then the spending categories that have one. It is only here when there is at least one
 * budget: without any, Home has nothing to say about them. Two columns from 1280px, one below.
 */
export function HomeBudgets({
  categories,
  transactions,
  monthlyBudget,
  month,
  className,
}: {
  categories: Category[]
  transactions: Transaction[]
  /** The budget for the whole month, or undefined when there isn't one. */
  monthlyBudget?: number
  /** "2026-09" */
  month: string
  className?: string
}) {
  const budgeted = categories.flatMap((category) =>
    category.type === "expense" && category.budget !== undefined ? [{ category, budget: category.budget }] : []
  )
  if (budgeted.length === 0 && monthlyBudget === undefined) return null
  const spent = categoryTotals(transactions, month)

  return (
    <Panel title="Budgets" caption={formatMonth(month)} action={<SeeAllLink href="/insights" />} className={className}>
      <ul className="grid grid-cols-1 gap-x-12 gap-y-5 xl:grid-cols-2">
        {monthlyBudget === undefined ? null : (
          <MonthBudgetRow budget={monthlyBudget} spent={monthTotals(transactions, month).spending} month={month} className="py-0" />
        )}
        {budgeted.map(({ category, budget }) => (
          <BudgetRow key={category.id} category={category} budget={budget} spent={spent.get(category.id) ?? 0} month={month} className="py-0" />
        ))}
      </ul>
    </Panel>
  )
}
