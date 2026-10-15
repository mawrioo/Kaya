import { addDays, fromDateInput } from "./dates.ts"
import type { Goal, Wallet } from "./types"

export interface Reminder { id: string; title: string; detail: string; href: string }

/** Quiet, actionable notices. No balances, overdue warnings or notification permissions. */
const reminderDate = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(fromDateInput(date))

export function remindersFor(wallets: Wallet[], goals: Goal[], today: string): Reminder[] {
  return [
    ...wallets.filter((wallet) => wallet.deposito?.status === "matured").map((wallet) => ({
      id: `deposito:${wallet.id}:${wallet.deposito!.endDate}`,
      title: `${wallet.name} has matured`,
      detail: "Review it when you're ready to move the money.",
      href: `/wallets#wallet-card-${encodeURIComponent(wallet.id)}`,
    })),
    ...goals.filter((goal) => goal.savedAmount < goal.targetAmount && goal.targetDate >= today && goal.targetDate <= addDays(today, 7)).map((goal) => ({
      id: `goal:${goal.id}:${goal.targetDate}`,
      title: `${goal.name}: ${goal.targetDate === today ? "target date is today" : "target date is coming up"}`,
      detail: `Planned for ${reminderDate(goal.targetDate)}. You can review your plan any time.`,
      href: `/goals#goal-card-${encodeURIComponent(goal.id)}`,
    })),
  ]
}
