"use client"

import Link from "next/link"

import { BudgetRow, MonthBudgetRow } from "@/components/budget-row"
import { Panel } from "@/components/panel"
import { formatMonth } from "@/lib/format"
import { categoryTotals, monthTotals } from "@/lib/stats"
import type { Category, Transaction } from "@/lib/types"

interface BudgetsPanelProps {
  categories: Category[]
  transactions: Transaction[]
  /** The budget for the whole month, or undefined when there isn't one. */
  monthlyBudget?: number
  /** The month being shown, "2026-09". */
  month: string
}

/**
 * The budgets, each with the same calm bar as on the Categories page: the budget for the whole month first, if there is
 * one, then the spending categories that have one. It is a guide, never a limit, so going over is said plainly and without
 * an alarm. With no budgets it says where to set one.
 */
export function BudgetsPanel({ categories, transactions, monthlyBudget, month }: BudgetsPanelProps) {
  const budgeted = categories.flatMap((category) =>
    category.type === "expense" && category.budget !== undefined ? [{ category, budget: category.budget }] : []
  )
  const spent = categoryTotals(transactions, month)

  return (
    <Panel title="Budgets" caption={formatMonth(month)}>
      {budgeted.length === 0 && monthlyBudget === undefined ? (
        <p className="text-muted-foreground">
          No budgets yet. Choose &ldquo;Set monthly budget&rdquo; in a spending category&apos;s menu on the{" "}
          <Link href="/categories" className="font-medium text-primary underline underline-offset-4">
            Categories page
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y">
          {monthlyBudget === undefined ? null : (
            <MonthBudgetRow budget={monthlyBudget} spent={monthTotals(transactions, month).spending} month={month} />
          )}
          {budgeted.map(({ category, budget }) => (
            <BudgetRow key={category.id} category={category} budget={budget} spent={spent.get(category.id) ?? 0} month={month} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
