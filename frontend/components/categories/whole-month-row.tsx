"use client"

import { useRef } from "react"
import Link from "next/link"
import { Ellipsis, Gauge } from "lucide-react"

import { MonthBudgetBadge } from "@/components/budget-row"
import { BudgetBar } from "@/components/categories/budget-bar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatRupiah } from "@/lib/format"
import { MONTH_BUDGET_NAME, monthSpendingHref } from "@/lib/month-budget"
import { cn } from "@/lib/utils"

/** The id of the row's "more" button, so a dialog opened from its menu can hand keyboard focus back to it. */
export const WHOLE_MONTH_MENU_ID = "whole-month-menu"

interface WholeMonthRowProps {
  /** The month being shown, "2026-09". The row is a link to that month's spending in Transactions. */
  month: string
  /** Everything spent in that month. */
  spent: number
  /** The budget for the whole month, or undefined when there isn't one. */
  budget?: number
  /** Opens the box where the budget is set, changed or removed. */
  onBudget: () => void
}

/**
 * The first row of the Expense categories card: everything spent in the month together, with the budget for the whole
 * month under it as the same calm bar. It isn't a category, so it has a sage badge. Without a budget it offers a quiet way
 * to set one. Its menu is the only place to change it.
 */
export function WholeMonthRow({ month, spent, budget, onBudget }: WholeMonthRowProps) {
  return (
    <li data-slot="month-budget-row" className="group @container relative flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
      <MonthBudgetBadge />

      <div className="min-w-0 flex-1 pt-2">
        {/* The amount sits at the right of the name when the row is wide enough for both, and under it when it isn't. */}
        <div className="flex flex-col @md:flex-row @md:items-baseline @md:justify-between @md:gap-4">
          <p className="min-w-0 font-medium break-words">
            <Link
              href={monthSpendingHref(month)}
              className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
            >
              {MONTH_BUDGET_NAME}
            </Link>
          </p>
          <p
            data-slot="month-budget-amount"
            className={cn("shrink-0 whitespace-nowrap tabular-nums", spent === 0 ? "text-muted-foreground" : "font-medium text-negative")}
          >
            {formatRupiah(-spent)}
          </p>
        </div>

        {budget === undefined ? (
          <button
            type="button"
            onClick={onBudget}
            className="tap-area relative z-10 mt-0.5 -mb-1 rounded-sm py-1 text-left text-sm text-balance text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Set a budget for the whole month
          </button>
        ) : (
          <BudgetBar name={MONTH_BUDGET_NAME} spent={spent} budget={budget} />
        )}
      </div>

      {/* The slot is 40px wide, like every category row's, so the amounts line up. */}
      <div className="relative z-10 -mr-2 size-10 shrink-0">
        <WholeMonthMenu hasBudget={budget !== undefined} onBudget={onBudget} />
      </div>
    </li>
  )
}

function WholeMonthMenu({ hasBudget, onBudget }: { hasBudget: boolean; onBudget: () => void }) {
  // When the item opens a dialog, the dialog takes the keyboard focus instead of the menu handing it back to its button.
  const chose = useRef(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={WHOLE_MONTH_MENU_ID}
          variant="ghost"
          size="icon-lg"
          className="rounded-full text-muted-foreground hover:bg-foreground/[0.07] aria-expanded:bg-foreground/[0.07]"
          aria-label={`More options for ${MONTH_BUDGET_NAME}`}
        >
          <Ellipsis className="size-[1.125rem]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => {
          if (!chose.current) return
          event.preventDefault()
          chose.current = false
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            chose.current = true
            onBudget()
          }}
        >
          <Gauge aria-hidden />
          {hasBudget ? "Change monthly budget" : "Set monthly budget"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
