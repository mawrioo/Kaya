/**
 * What the month recap card and the row of coins on the Year view need. Pure functions: nothing here knows about React.
 */
import { biggestExpenses } from "@/lib/insights"
import { monthTotals } from "@/lib/stats"
import type { Category, Transaction } from "@/lib/types"

export interface MonthRecap {
  /** What came in. */
  came: number
  /** What went out. */
  went: number
  /** What was left: what came in minus what went out. Below zero when more went out. */
  left: number
  /** The biggest treat of the month. Missing when there wasn't one. */
  treat?: Transaction
}

/** The spending presets that aren't treats: you pay them whether you want to or not. */
const MUST_PAYS = new Set(["Bills", "Transport", "Health", "Other"])

/**
 * The biggest treat of a month: the biggest single expense that isn't Bills, Transport, Health or Other, so the rent is
 * never called a treat. A category the owner made counts as a treat. Missing when there wasn't one.
 */
export function biggestTreat(transactions: Transaction[], categories: Category[], month: string): Transaction | undefined {
  const mustPay = new Set(categories.filter((category) => category.preset && MUST_PAYS.has(category.name)).map((category) => category.id))
  // Every expense of the month, biggest first (the same order as "Biggest expenses"), and the first that isn't a must-pay.
  return biggestExpenses(transactions, month, Infinity).find((tx) => tx.type === "expense" && !mustPay.has(tx.categoryId))
}

/**
 * The month in one look. Missing when no money came in or went out (a month of transfers only has nothing to recap),
 * so the card can say so instead.
 */
export function monthRecap(transactions: Transaction[], categories: Category[], month: string): MonthRecap | undefined {
  const { income, spending, net } = monthTotals(transactions, month)
  if (income === 0 && spending === 0) return undefined
  return { came: income, went: spending, left: net, treat: biggestTreat(transactions, categories, month) }
}

export interface KeptMonth {
  /** "2026-03" */
  month: string
  /** True when more came in than went out in that month. */
  kept: boolean
}

/**
 * The twelve months of a year, each with whether it kept money: more came in than went out. A month with nothing in it,
 * one that broke even, one that went over and one that hasn't come yet all read the same: not kept.
 */
export function keptMonths(transactions: Transaction[], year: string): KeptMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`
    return { month, kept: monthTotals(transactions, month).net > 0 }
  })
}
