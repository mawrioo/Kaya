/**
 * What a list of transactions adds up to. Pure functions, no React. Only income and spending count: a transfer between the
 * owner's own wallets is neither, so it is counted apart and never added in.
 */
import type { Transaction } from "./types"

export interface Totals {
  /** Everything that came in. */
  income: number
  /** Everything that went out. */
  spending: number
  /** Income minus spending. Negative means more went out than came in. */
  net: number
  /** How many transfers there were. They are in none of the figures above. */
  transfers: number
}

export function totalsOf(transactions: readonly Transaction[]): Totals {
  let income = 0
  let spending = 0
  let transfers = 0
  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount
    else if (tx.type === "expense") spending += tx.amount
    else transfers += 1
  }
  return { income, spending, net: income - spending, transfers }
}

/**
 * What one day came to: income minus spending, for the heading of that day. Nothing (undefined) for a day that held only
 * transfers, which came to no money in or out.
 */
export function dayNet(transactions: readonly Transaction[]): number | undefined {
  if (transactions.every((tx) => tx.type === "transfer")) return undefined
  return totalsOf(transactions).net
}
