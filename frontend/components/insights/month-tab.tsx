"use client"

import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react"

import { useData } from "@/components/data-provider"
import { BalancePanel } from "@/components/insights/balance-panel"
import { BiggestExpenses } from "@/components/insights/biggest-expenses"
import { BudgetsPanel } from "@/components/insights/budgets-panel"
import { CategoryBreakdown } from "@/components/insights/category-breakdown"
import { MonthChart } from "@/components/insights/month-chart"
import { MonthRecap } from "@/components/insights/month-recap"
import { WalletBreakdown } from "@/components/insights/wallet-breakdown"
import { WeekdayBreakdown } from "@/components/insights/weekday-breakdown"
import { Money } from "@/components/money"
import { StatCard } from "@/components/stat-card"
import { compareText } from "@/lib/category-summary"
import { monthDates } from "@/lib/dates"
import { formatMonth } from "@/lib/format"
import { biggestExpenses, breakdown, spendingByWallet, spendingByWeekday } from "@/lib/insights"
import { monthTotals, shiftMonth } from "@/lib/stats"

/**
 * The Month view of Insights: what one month held (three cards, each against the month before), the months side by side
 * in a chart, and the month broken down: by category, its budgets, income, the biggest expenses, the wallets and the days
 * of the week.
 */
export function MonthTab({
  month,
  bounds,
  today,
  onChooseMonth,
}: {
  month: string
  bounds: { first: string; last: string }
  /** Today, "2026-10-01", from the server so the server and the browser agree. */
  today: string
  onChooseMonth: (month: string) => void
}) {
  const { categories, transactions, wallets, monthlyBudget } = useData()

  // The month before, to compare with. There is nothing to compare with before the first transaction.
  const previousMonth = shiftMonth(month, -1)
  const comparing = previousMonth >= bounds.first
  const before = comparing ? previousMonth : undefined
  const totals = monthTotals(transactions, month)
  const previous = comparing ? monthTotals(transactions, previousMonth) : undefined
  const compare = (amount: number, earlier?: number) => compareText(amount, earlier, previousMonth, month)

  return (
    <>
      <MonthRecap month={month} today={today} />

      {/* Three across only where each card has room for a long amount: from 1024px, since the sidebar takes 256px of a tablet. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          icon={ArrowUpRight}
          label="Spent"
          value={<Money amount={-totals.spending} className={totals.spending === 0 ? "text-muted-foreground" : "text-negative"} />}
          helper={compare(totals.spending, previous?.spending)}
          helperTone="muted"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Earned"
          value={<Money amount={totals.income} sign="always" className={totals.income === 0 ? "text-muted-foreground" : "text-positive"} />}
          helper={compare(totals.income, previous?.income)}
          helperTone="muted"
        />
        <StatCard
          icon={PiggyBank}
          label="Left over"
          value={
            <Money
              amount={totals.net}
              className={totals.net === 0 ? "text-muted-foreground" : totals.net > 0 ? "text-positive" : "text-negative"}
            />
          }
          helper={compare(totals.net, previous?.net)}
          helperTone="muted"
        />
      </div>

      <MonthChart transactions={transactions} categories={categories} bounds={bounds} selected={month} onSelect={onChooseMonth} />

      <BalancePanel {...monthDates(month)} today={today} caption={formatMonth(month)} scale="weeks" />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          <CategoryBreakdown
            title="Spending by category"
            emptyText="Nothing spent this month."
            type="expense"
            period={month}
            previousPeriod={before}
            rows={breakdown(transactions, categories, "expense", month, before)}
          />
          <BiggestExpenses transactions={biggestExpenses(transactions, month)} wallets={wallets} categories={categories} month={month} />
        </div>
        <div className="flex flex-col gap-6">
          <BudgetsPanel categories={categories} transactions={transactions} monthlyBudget={monthlyBudget} month={month} />
          <CategoryBreakdown
            title="Income by category"
            emptyText="Nothing earned this month."
            type="income"
            period={month}
            previousPeriod={before}
            rows={breakdown(transactions, categories, "income", month, before)}
          />
          <WalletBreakdown rows={spendingByWallet(transactions, wallets, month)} month={month} />
          <WeekdayBreakdown
            days={spendingByWeekday(transactions, month)}
            title="Spending by day of the week"
            period={formatMonth(month)}
            emptyText="Nothing spent this month."
          />
        </div>
      </div>
    </>
  )
}
