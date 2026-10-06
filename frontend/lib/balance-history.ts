/**
 * The numbers behind the line of the total balance on Insights. Pure functions, no React, so they can be tried
 * out on their own.
 *
 * The app only knows what the wallets hold now, so an earlier day is worked out backwards: the total at the end of
 * a day is today's total minus everything that changed it after that day. Income and spending change it, a transfer
 * between two wallets doesn't, and a balance the owner set by hand (an investment's value, or a correction) does.
 */
import { changeText } from "@/lib/category-summary"
import { addDays } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import type { BalanceAdjustment, Transaction } from "@/lib/types"

/** A no-break space, so a date stays in one piece when a line wraps. */
const NBSP = String.fromCharCode(160)

/** A date as "29 Sep 2026", kept in one piece when the line it is in wraps. */
export const tightDate = (date: string): string => formatDate(date).split(" ").join(NBSP)

export interface BalancePoint {
  /** "2026-09-30" */
  date: string
  /** What all the wallets together held at the end of that day. */
  total: number
}

interface BalanceSeriesInput {
  /** What all the wallets hold now. */
  total: number
  transactions: Transaction[]
  adjustments: BalanceAdjustment[]
  /** The first and last day wanted, "2026-09-01" and "2026-09-30". */
  from: string
  to: string
  /** Today, "2026-10-01". Something dated after it hasn't happened yet, so the line never goes past it. */
  today: string
}

/**
 * What the wallets held in total at the end of each day from `from` to `to`, one point per day. It starts on the day
 * of the first recorded change (before that nothing is known) and stops at today. Nothing to draw gives an empty list.
 */
export function balanceSeries({ total, transactions, adjustments, from, to, today }: BalanceSeriesInput): BalancePoint[] {
  // How much each day changed the total. A transfer changes nothing, but its day still counts as a recorded one.
  const change = new Map<string, number>()
  const add = (day: string, amount: number) => change.set(day, (change.get(day) ?? 0) + amount)
  for (const tx of transactions) {
    add(tx.date.slice(0, 10), tx.type === "income" ? tx.amount : tx.type === "expense" ? -tx.amount : 0)
  }
  for (const adjustment of adjustments) add(adjustment.at.slice(0, 10), adjustment.change)
  if (change.size === 0) return []

  const days = [...change.keys()].sort()
  const latest = days[days.length - 1]
  const last = latest > today ? latest : today
  const start = from > days[0] ? from : days[0]
  const end = to < today ? to : today
  if (start > end) return []

  // Start from the latest day, where the wallets hold what they hold now, and take off what each day changed.
  const totals = new Map<string, number>()
  let balance = total
  for (let day = last; day >= start; ) {
    totals.set(day, balance)
    balance -= change.get(day) ?? 0
    const before = addDays(day, -1)
    if (before === day) break
    day = before
  }

  const points: BalancePoint[] = []
  for (let day = start; day <= end; ) {
    points.push({ date: day, total: totals.get(day) ?? total })
    const next = addDays(day, 1)
    if (next === day) break
    day = next
  }
  return points
}

/**
 * How the balance at the end compares with the first day shown, in plain words and never coloured:
 * "Rp 250.000 more than on 1 Sep". Nothing to say for a single day.
 */
export function balanceChangeText(points: BalancePoint[]): string | undefined {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last || first === last) return undefined
  const day = formatDate(first.date).slice(0, -5).replace(" ", NBSP)
  if (first.total === last.total) return `Same as on${NBSP}${day}`
  return `${changeText(last.total, first.total)} than on${NBSP}${day}`
}
