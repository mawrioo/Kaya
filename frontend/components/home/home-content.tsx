"use client"

import { useLiveDate } from "@/components/use-live-date"
import { useData } from "@/components/data-provider"
import { QuietReminders } from "@/components/home/quiet-reminders"
import { HomeBudgets } from "@/components/home/home-budgets"
import { MonthSummary } from "@/components/home/month-summary"
import { RecentTransactions } from "@/components/home/recent-transactions"
import { SavingsGoals } from "@/components/home/savings-goals"
import { SpendingByCategory } from "@/components/home/spending-by-category"
import { TotalBalanceCard } from "@/components/home/total-balance-card"
import { WalletCards } from "@/components/home/wallet-cards"
import { MonthlyNote } from "@/components/monthly-note"
import { toDateInput } from "@/lib/dates"
import {
  monthKey,
  monthTotals,
  pickMonth,
  recentTransactions,
  spendingByCategory,
} from "@/lib/stats"

/**
 * Everything under the greeting on Home. It reads the shared data, so adding,
 * editing or deleting a transaction on the Transactions page shows up here.
 * `nowIso` comes from the server so the server and the browser agree on the month.
 */
export function HomeContent({ nowIso }: { nowIso: string }) {
  const liveDate = useLiveDate(nowIso)
  const { wallets, categories, goals, transactions, monthlyBudget } = useData()
  const now = new Date(liveDate)
  const month = pickMonth(transactions, now)

  return (
    <div className="mt-8 flex flex-col gap-6 md:mt-10">
      <TotalBalanceCard wallets={wallets} />
      <WalletCards wallets={wallets} />
      <QuietReminders today={toDateInput(now)} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <MonthSummary
          className="xl:col-span-2"
          totals={monthTotals(transactions, month)}
          month={month}
          isCurrentMonth={month === monthKey(now)}
        />
        <SpendingByCategory
          className="xl:col-span-3"
          rows={spendingByCategory(transactions, categories, month)}
          month={month}
        />
      </div>

      <MonthlyNote month={month} today={toDateInput(now)} />

      <HomeBudgets categories={categories} transactions={transactions} monthlyBudget={monthlyBudget} month={month} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SavingsGoals goals={goals} />
        <RecentTransactions
          transactions={recentTransactions(transactions, 5)}
          wallets={wallets}
          categories={categories}
        />
      </div>
    </div>
  )
}
