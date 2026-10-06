import Link from "next/link"
import { Gauge } from "lucide-react"

import { BudgetBar } from "@/components/categories/budget-bar"
import { formatRupiah } from "@/lib/format"
import { icons } from "@/lib/icons"
import { MONTH_BUDGET_NAME, monthSpendingHref } from "@/lib/month-budget"
import { paletteClasses } from "@/lib/palette"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BudgetRowProps {
  category: Category
  /** The category's monthly budget. */
  budget: number
  /** What was spent on it in the month shown. */
  spent: number
  /** The month shown, "2026-09". The row is a link to that month's transactions in this category. */
  month: string
  className?: string
}

/**
 * One spending category with a budget: its badge, its name (a link to the month's transactions), what was spent that month
 * at the right, and the calm budget bar underneath. Used in the Budgets panels on Insights and on Home. The amount sits
 * under the name when the row is narrow, by a container query.
 */
export function BudgetRow({ category, budget, spent, month, className }: BudgetRowProps) {
  const Icon = icons[category.icon]
  const palette = paletteClasses[category.color]

  return (
    <BudgetLine
      badge={
        <span className={cn("coin-rim grid size-10 shrink-0 place-items-center rounded-full", palette.soft, palette.icon)}>
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
      }
      name={category.name}
      href={`/transactions?category=${encodeURIComponent(category.id)}&month=${month}`}
      budget={budget}
      spent={spent}
      className={className}
    />
  )
}

/** The round sage badge of the budget for the whole month. It is not a category, so it isn't in a category's colour. */
export function MonthBudgetBadge() {
  return (
    <span className="coin-rim grid size-10 shrink-0 place-items-center rounded-full bg-sage text-sage-foreground">
      <Gauge className="size-[1.125rem]" aria-hidden />
    </span>
  )
}

/**
 * The budget for the whole month, as a row of the same kind: a sage badge, "Whole month" (a link to all of that month's
 * spending), what was spent in all, and the same calm bar. It comes first in the Budgets panels.
 */
export function MonthBudgetRow({ budget, spent, month, className }: { budget: number; spent: number; month: string; className?: string }) {
  return (
    <BudgetLine
      badge={<MonthBudgetBadge />}
      name={MONTH_BUDGET_NAME}
      href={monthSpendingHref(month)}
      budget={budget}
      spent={spent}
      className={className}
    />
  )
}

interface BudgetLineProps {
  badge: React.ReactNode
  name: string
  href: string
  budget: number
  spent: number
  className?: string
}

/** What both kinds of row share: the badge, the name as a link over the whole row, the amount spent, and the bar. */
function BudgetLine({ badge, name, href, budget, spent, className }: BudgetLineProps) {
  return (
    <li data-slot="budget-row" className={cn("group @container relative flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4", className)}>
      {badge}
      <div className="min-w-0 flex-1 pt-2">
        <div className="flex flex-col @md:flex-row @md:items-baseline @md:justify-between @md:gap-4">
          <p data-slot="budget-name" className="min-w-0 font-medium break-words">
            <Link
              href={href}
              className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
            >
              {name}
            </Link>
          </p>
          <p
            data-slot="budget-spent"
            className={cn("shrink-0 whitespace-nowrap tabular-nums", spent === 0 ? "text-muted-foreground" : "font-medium text-negative")}
          >
            {formatRupiah(-spent)}
          </p>
        </div>
        <BudgetBar name={name} spent={spent} budget={budget} />
      </div>
    </li>
  )
}
