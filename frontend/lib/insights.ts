/**
 * The numbers behind the Insights page: which months a chart shows, what each month held,
 * and how a month's spending (or income) splits across its categories. Pure functions,
 * no React, so they can be tried out on their own.
 */
import { addDays, monthDates } from "@/lib/dates"
import { categoryCounts, categoryTotals, monthKey, shiftMonth } from "@/lib/stats"
import type { Category, CategoryType, Transaction, Wallet } from "@/lib/types"

/**
 * The months a chart shows: every month from the first to the last that can be reached, or when
 * there are more than `size`, the last `size` of them. The chosen month is always among them, so
 * going back to an old month slides the window back instead of losing it.
 */
export function chartMonths(bounds: { first: string; last: string }, selected: string, size = 12): string[] {
  let end = bounds.last
  let start = shiftMonth(end, -(size - 1))
  if (start < bounds.first) start = bounds.first
  if (selected < start) {
    start = selected
    end = shiftMonth(selected, size - 1)
    if (end > bounds.last) end = bounds.last
  }
  const months: string[] = []
  for (let month = start; month <= end; month = shiftMonth(month, 1)) months.push(month)
  return months
}

export interface MonthPoint {
  /** "2026-09" */
  month: string
  income: number
  spending: number
  /** What was spent in each category that month, by category id. A category with nothing isn't in it. */
  spentBy: Record<string, number>
}

/** What each of the given months held: income, spending, and the spending split by category. Transfers never count. */
export function monthlyPoints(transactions: Transaction[], months: string[]): MonthPoint[] {
  const points = new Map<string, MonthPoint>(months.map((month) => [month, { month, income: 0, spending: 0, spentBy: {} }]))
  for (const tx of transactions) {
    const point = points.get(monthKey(tx.date))
    if (!point || tx.type === "transfer") continue
    if (tx.type === "income") {
      point.income += tx.amount
    } else {
      point.spending += tx.amount
      point.spentBy[tx.categoryId] = (point.spentBy[tx.categoryId] ?? 0) + tx.amount
    }
  }
  return months.map((month) => points.get(month)!)
}

export interface BreakdownRow {
  category: Category
  amount: number
  /** How many transactions that was. */
  count: number
  /** What the month before had, or undefined when there is no earlier month to compare with. */
  previous?: number
  /** 0 to 100: this category's share of the month's spending (or income). */
  share: number
}

/**
 * The categories of one kind that had something in the month, biggest first (a tie keeps the owner's
 * own order). Pass `previousMonth` as undefined when there is nothing to compare with.
 */
export function breakdown(
  transactions: Transaction[],
  categories: Category[],
  type: CategoryType,
  month: string,
  previousMonth?: string
): BreakdownRow[] {
  const totals = categoryTotals(transactions, month)
  const counts = categoryCounts(transactions, month)
  const before = previousMonth === undefined ? undefined : categoryTotals(transactions, previousMonth)

  const rows = categories
    .filter((category) => category.type === type)
    .map((category) => ({
      category,
      amount: totals.get(category.id) ?? 0,
      count: counts.get(category.id) ?? 0,
      previous: before ? (before.get(category.id) ?? 0) : undefined,
    }))
    .filter((row) => row.amount > 0)
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  return rows.map((row) => ({ ...row, share: (row.amount / total) * 100 })).sort((a, b) => b.amount - a.amount)
}

// ---- savings, biggest expenses, wallets and days of the week -------------------------------------

/** The share of the income that was kept, in percent: 60 when 60% of what came in was left over, below 0 when more went out than came in. Undefined when nothing came in, because the share of nothing means nothing. */
export function savingsRate(income: number, spending: number): number | undefined {
  return income > 0 ? ((income - spending) / income) * 100 : undefined
}

/** The biggest single expenses of a month, biggest first (the later day first when two are the same). */
export function biggestExpenses(transactions: Transaction[], month: string, count = 5): Transaction[] {
  return transactions
    .filter((tx) => tx.type === "expense" && monthKey(tx.date) === month)
    .sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, count)
}

export interface WalletSpend {
  wallet: Wallet
  amount: number
  count: number
  /** 0 to 100: this wallet's share of the month's spending. */
  share: number
}

/** What each wallet paid out in a month: the wallets that paid something, biggest first (a tie keeps the owner's order). Transfers never count. */
export function spendingByWallet(transactions: Transaction[], wallets: Wallet[], month: string): WalletSpend[] {
  const spent = new Map<string, { amount: number; count: number }>()
  for (const tx of transactions) {
    if (tx.type !== "expense" || monthKey(tx.date) !== month) continue
    const soFar = spent.get(tx.walletId) ?? { amount: 0, count: 0 }
    spent.set(tx.walletId, { amount: soFar.amount + tx.amount, count: soFar.count + 1 })
  }
  const rows = wallets.flatMap((wallet) => {
    const entry = spent.get(wallet.id)
    return entry ? [{ wallet, amount: entry.amount, count: entry.count }] : []
  })
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  return rows.map((row) => ({ ...row, share: (row.amount / total) * 100 })).sort((a, b) => b.amount - a.amount)
}

/** The day of the week of a calendar date written "2026-09-29" (or a transaction's date, which starts that way), with weeks starting on Monday: 0 is Monday and 6 is Sunday. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number)
  return (new Date(year, month - 1, day).getDay() + 6) % 7
}

export interface WeekdayTotal {
  /** 0 is Monday, 6 is Sunday. */
  day: number
  amount: number
  count: number
}

/** What was spent on each day of the week during a month: always seven entries, Monday first, with zeros for the days with nothing. */
export function spendingByWeekday(transactions: Transaction[], month: string): WeekdayTotal[] {
  const days: WeekdayTotal[] = Array.from({ length: 7 }, (_, day) => ({ day, amount: 0, count: 0 }))
  for (const tx of transactions) {
    if (tx.type !== "expense" || monthKey(tx.date) !== month) continue
    const entry = days[weekdayOf(tx.date)]
    entry.amount += tx.amount
    entry.count += 1
  }
  return days
}

/** Everything filed under one of the two "Other" categories (spending and income), the newest first. These are what still need a proper category. */
export function inOther(transactions: Transaction[], categories: Category[]): Transaction[] {
  const others = new Set(categories.filter((category) => category.preset && category.name === "Other").map((category) => category.id))
  return transactions
    .filter((tx) => tx.type !== "transfer" && others.has(tx.categoryId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

// ---- years ---------------------------------------------------------------------------------------

/** "2026" for "2026-09". */
export const yearOf = (month: string): string => month.slice(0, 4)

/** The twelve months of a year: "2026-01" to "2026-12". */
export function monthsOfYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
}

export interface YearTotals {
  income: number
  spending: number
  /** Income minus spending. */
  net: number
  /** How many of its months have any transactions in them. */
  months: number
}

/** What a whole year held. Transfers never count. */
export function yearTotals(transactions: Transaction[], year: string): YearTotals {
  let income = 0
  let spending = 0
  const busy = new Set<string>()
  for (const tx of transactions) {
    if (tx.type === "transfer" || yearOf(monthKey(tx.date)) !== year) continue
    busy.add(monthKey(tx.date))
    if (tx.type === "income") income += tx.amount
    else spending += tx.amount
  }
  return { income, spending, net: income - spending, months: busy.size }
}

export interface WeekdayAverage {
  /** 0 is Monday, 6 is Sunday. */
  day: number
  /** What a typical such day cost: what was spent on those days, divided by how many of them there were. */
  average: number
  /** What was spent on those days in all. */
  total: number
  /** How many of that day of the week there were in the months counted. */
  occurrences: number
}

/**
 * What a typical Monday, Tuesday and so on cost over a year: always seven entries, Monday first. Like the average month,
 * it only counts the months of the year that have transactions, and a month that is still going only counts up to today,
 * so spending dated after today (and days that haven't come) leave the average alone. Undefined when no month counts.
 */
export function weekdayAverages(
  transactions: Transaction[],
  year: string,
  today: string
): { days: WeekdayAverage[]; months: number } | undefined {
  const busy = new Set<string>()
  for (const tx of transactions) {
    if (tx.type !== "transfer" && yearOf(monthKey(tx.date)) === year) busy.add(monthKey(tx.date))
  }

  const days = Array.from({ length: 7 }, (_, day) => ({ day, total: 0, occurrences: 0 }))
  const counted = new Set<string>()
  for (const month of [...busy].sort()) {
    const { from, to } = monthDates(month)
    const last = to < today ? to : today
    if (last < from) continue // this month hasn't begun yet
    counted.add(month)
    for (let day = from; day <= last; day = addDays(day, 1)) days[weekdayOf(day)].occurrences += 1
  }
  if (counted.size === 0) return undefined

  for (const tx of transactions) {
    const day = tx.date.slice(0, 10)
    if (tx.type === "expense" && day <= today && counted.has(day.slice(0, 7))) days[weekdayOf(day)].total += tx.amount
  }
  return {
    days: days.map((entry) => ({ ...entry, average: entry.occurrences > 0 ? entry.total / entry.occurrences : 0 })),
    months: counted.size,
  }
}

/**
 * Like `breakdown`, but for several months added together (a year): the categories of one kind that had something in them,
 * biggest first, with how many transactions that was and what the months before (for a comparison) had.
 */
export function breakdownOfMonths(
  transactions: Transaction[],
  categories: Category[],
  type: CategoryType,
  months: string[],
  previousMonths?: string[]
): BreakdownRow[] {
  const inside = new Set(months)
  const before = previousMonths === undefined ? undefined : new Set(previousMonths)
  const now = new Map<string, { amount: number; count: number }>()
  const earlier = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type === "transfer") continue
    const month = monthKey(tx.date)
    if (inside.has(month)) {
      const entry = now.get(tx.categoryId) ?? { amount: 0, count: 0 }
      now.set(tx.categoryId, { amount: entry.amount + tx.amount, count: entry.count + 1 })
    } else if (before?.has(month)) {
      earlier.set(tx.categoryId, (earlier.get(tx.categoryId) ?? 0) + tx.amount)
    }
  }
  const rows = categories
    .filter((category) => category.type === type)
    .map((category) => ({
      category,
      amount: now.get(category.id)?.amount ?? 0,
      count: now.get(category.id)?.count ?? 0,
      previous: before ? (earlier.get(category.id) ?? 0) : undefined,
    }))
    .filter((row) => row.amount > 0)
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  return rows.map((row) => ({ ...row, share: (row.amount / total) * 100 })).sort((a, b) => b.amount - a.amount)
}

// ---- two months side by side ---------------------------------------------------------------------

export interface CompareRow {
  category: Category
  /** What the first month had, and what the second had. */
  a: number
  b: number
}

/** The categories of one kind that had something in either of two months, with both amounts, the bigger ones first (a tie keeps the owner's order). */
export function compareCategories(transactions: Transaction[], categories: Category[], type: CategoryType, monthA: string, monthB: string): CompareRow[] {
  const first = categoryTotals(transactions, monthA)
  const second = categoryTotals(transactions, monthB)
  return categories
    .filter((category) => category.type === type)
    .map((category) => ({ category, a: first.get(category.id) ?? 0, b: second.get(category.id) ?? 0 }))
    .filter((row) => row.a > 0 || row.b > 0)
    .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b))
}
