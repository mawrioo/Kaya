/**
 * What a category row says about a month, in words: how many transactions, how it
 * compares with the month before, what share of the spending it is, and how far
 * through its budget it is. Pure functions, so they can be tried out on their own.
 */
import { formatMonth, formatMonthName, formatRupiah } from "@/lib/format"

/** A no-break space, so a number stays with its unit ("4 transactions") when a line wraps. */
const NBSP = String.fromCharCode(160)

/** "4 transactions", "1 transaction", or "No transactions". */
export function countText(count: number): string {
  if (count === 0) return "No transactions"
  return `${count}${NBSP}${count === 1 ? "transaction" : "transactions"}`
}

/**
 * How a month compares with the one before it: "Rp 120.000 more than in August". It says nothing
 * when there is no earlier month to compare with (`previous` is undefined), or when neither month
 * had anything. The earlier month's year is added only when it is another year.
 */
export function compareText(amount: number, previous: number | undefined, previousMonth: string, month: string): string | undefined {
  if (previous === undefined || (amount === 0 && previous === 0)) return undefined
  const label = previousMonth.slice(0, 4) === month.slice(0, 4) ? formatMonthName(previousMonth) : formatMonth(previousMonth)
  if (amount === previous) return `Same as in ${label}`
  return `${formatRupiah(Math.abs(amount - previous))} ${amount > previous ? "more" : "less"} than in ${label}`
}

/** The same as `compareText`, for a year against the year before: "Rp 1.200.000 more than in 2025". */
export function compareYearText(amount: number, previous: number | undefined, previousYear: string): string | undefined {
  if (previous === undefined || (amount === 0 && previous === 0)) return undefined
  if (amount === previous) return `Same as in ${previousYear}`
  return `${formatRupiah(Math.abs(amount - previous))} ${amount > previous ? "more" : "less"} than in ${previousYear}`
}

/** How one amount differs from another, short: "Rp 162.000 more", "Rp 154.000 less" or "Same". Nothing when both are zero. */
export function changeText(amount: number, other: number): string | undefined {
  if (amount === 0 && other === 0) return undefined
  if (amount === other) return "Same"
  return `${formatRupiah(Math.abs(amount - other))} ${amount > other ? "more" : "less"}`
}

/** A category's share of a month's spending, 0 to 100. Zero when nothing was spent. */
export function shareOf(amount: number, total: number): number {
  return total > 0 ? (amount / total) * 100 : 0
}

export interface BudgetProgress {
  /** How full the bar is, 0 to 100. A budget that has been used up or passed is a full bar. */
  fill: number
  /** The percentage to print. It never says 100 until the budget is really used up, so 99.6% reads "99%". */
  percent: number
  /** What is left to spend. Zero once the budget is used up. */
  left: number
  /** How far past the budget it went. Zero while within it. */
  over: number
}

/** How far through a month's budget the spending has come. */
export function budgetProgress(spent: number, budget: number): BudgetProgress {
  const share = (spent / budget) * 100
  return {
    fill: Math.min(100, share),
    // A sliver above zero is kept as it is, so it can read "<1%" instead of "0%".
    percent: spent >= budget ? Math.round(share) : share > 0 && share < 1 ? share : Math.min(99, Math.round(share)),
    left: Math.max(0, budget - spent),
    over: Math.max(0, spent - budget),
  }
}
