/**
 * How a deposito (time deposit) works out its interest and its dates. Pure logic, no database and no clock: the
 * store hands in today's date. The interest is never saved; it is worked out from the dates every time it is needed.
 *
 * Simple interest by the day: principal x yearly rate x days / 365, rounded down to a whole rupiah, and before tax.
 * The rate is kept in basis points (500 = 5.00%), so no floating point is involved.
 */
import type { DepositoStatus } from "./types.ts"

/** What the database holds about a deposito. */
export interface DepositoTerms {
  /** The money put in, whole rupiah. It becomes 0 when the deposito is settled. */
  principal: number
  /** Yearly rate in basis points: 500 is 5%. */
  rateBp: number
  /** "YYYY-MM-DD", the day the first term began. */
  startDate: string
  /** How many months one term lasts. */
  tenorMonths: number
  /** True when the bank renews it by itself at the end of a term. */
  rollover: boolean
  /** When the money was moved out ("YYYY-MM-DD..." as written by the store), or undefined while it is still in. */
  settledAt?: string
}

export interface DepositoState {
  /** The interest earned so far, whole rupiah. 0 once settled. */
  interest: number
  /** When the current term ends ("YYYY-MM-DD"). For a matured one, the day it matured. */
  endDate: string
  status: DepositoStatus
}

/** Days from one "YYYY-MM-DD" to another (negative when the second is earlier). Whole days, in UTC so daylight saving never shifts them. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * A date some whole months later. When the day doesn't exist in that month, it is the month's last day: one month
 * after 31 Jan is 28 Feb (29 in a leap year), not 3 March.
 */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number)
  const index = year * 12 + (month - 1) + months
  const newYear = Math.floor(index / 12)
  const newMonth = index % 12
  const last = new Date(Date.UTC(newYear, newMonth + 1, 0)).getUTCDate()
  const pad = (n: number, width = 2) => String(n).padStart(width, "0")
  return `${pad(newYear, 4)}-${pad(newMonth + 1)}-${pad(Math.min(day, last))}`
}

/** Interest for a number of days: principal x rate x days / 365, rounded down. A negative number of days earns nothing. */
export function interestFor(principal: number, rateBp: number, days: number): number {
  if (days <= 0) return 0
  // BigInt keeps even a very large amount exact.
  return Number((BigInt(principal) * BigInt(rateBp) * BigInt(days)) / (10_000n * 365n))
}

/**
 * Where a deposito stands on `today`:
 * - Not renewing: it earns until the end of its one term, then it is "matured" and waits for the owner to move the money.
 * - Renewing: every term ends and the next begins by itself on the same day, with the same rate and the same amount.
 *   Interest keeps adding up from the start date (simple interest, never on interest), so it is never "matured".
 * - Settled: the money has been moved out. Nothing more is earned.
 */
export function depositoState(terms: DepositoTerms, today: string): DepositoState {
  if (terms.settledAt !== undefined) {
    return { interest: 0, endDate: addMonths(terms.startDate, terms.tenorMonths), status: "settled" }
  }
  if (!terms.rollover) {
    const endDate = addMonths(terms.startDate, terms.tenorMonths)
    const matured = today >= endDate
    const days = daysBetween(terms.startDate, matured ? endDate : today)
    return { interest: interestFor(terms.principal, terms.rateBp, days), endDate, status: matured ? "matured" : "running" }
  }
  // The end of the term that is running today: the first one that is still ahead.
  let term = 1
  while (addMonths(terms.startDate, term * terms.tenorMonths) <= today) term += 1
  return {
    interest: interestFor(terms.principal, terms.rateBp, daysBetween(terms.startDate, today)),
    endDate: addMonths(terms.startDate, term * terms.tenorMonths),
    status: "running",
  }
}
