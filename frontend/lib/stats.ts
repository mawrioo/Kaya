/**
 * Small pure functions that turn the raw lists (wallets, transactions, ...)
 * into the numbers the screens show. Nothing here knows about React, so the
 * same functions keep working when the mock data is swapped for a database.
 */
import type { Category, Transaction, Wallet } from "@/lib/types"

/** "2026-09" for a Date (local time) or for an ISO date string as written. */
export function monthKey(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/** True when a transaction moves money in or out of this wallet. A transfer touches both of its wallets. */
export function involvesWallet(tx: Transaction, walletId: string): boolean {
  return tx.type === "transfer" ? tx.fromWalletId === walletId || tx.toWalletId === walletId : tx.walletId === walletId
}

/** What deleting a wallet would remove: every transaction that touches it, and how many of those are transfers to or from other wallets. */
export function walletDeleteImpact(transactions: Transaction[], walletId: string) {
  const touching = transactions.filter((tx) => involvesWallet(tx, walletId))
  return { transactions: touching.length, transfers: touching.filter((tx) => tx.type === "transfer").length }
}

export function totalBalance(wallets: Wallet[]): number {
  return wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
}

export interface WalletShare {
  wallet: Wallet
  /** 0 to 100. */
  percent: number
}

/**
 * Each wallet's slice of the money the wallets hold, biggest first. A wallet at zero or below has no slice, and a wallet
 * below zero doesn't make the others' slices bigger either, so the slices always add up to 100%.
 */
export function walletShares(wallets: Wallet[]): WalletShare[] {
  const held = wallets.filter((wallet) => wallet.balance > 0)
  const total = totalBalance(held)
  return held.map((wallet) => ({ wallet, percent: (wallet.balance / total) * 100 })).sort((a, b) => b.wallet.balance - a.wallet.balance)
}

/** The wallets that are below zero, the furthest below first. They are shown apart from the share bar. */
export function overdrawnWallets(wallets: Wallet[]): Wallet[] {
  return wallets.filter((wallet) => wallet.balance < 0).sort((a, b) => a.balance - b.balance)
}

/** A month moved by whole months: shiftMonth("2026-09", -1) is "2026-08", and shiftMonth("2026-12", 1) is "2027-01". */
export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split("-").map(Number)
  const index = year * 12 + (number - 1) + by
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

/**
 * The months a month switcher can reach: from the month of the first transaction up to this month
 * (or the month of the last transaction, if that is later). With no transactions, just this month.
 */
export function monthBounds(transactions: Transaction[], now: Date): { first: string; last: string } {
  const current = monthKey(now)
  const months = transactions.map((tx) => monthKey(tx.date)).sort()
  const latest = months.at(-1) ?? current
  return { first: months[0] ?? current, last: latest > current ? latest : current }
}

/**
 * The month to summarise: the current one, or the latest month that has any
 * transactions when the current one is still empty. That keeps the static mock
 * data (which ends 28 Sep 2026) from ever producing an empty screen.
 */
export function pickMonth(transactions: Transaction[], now: Date): string {
  const current = monthKey(now)
  if (transactions.some((tx) => monthKey(tx.date) === current)) return current
  return (
    transactions
      .map((tx) => monthKey(tx.date))
      .sort()
      .at(-1) ?? current
  )
}

export interface MonthTotals {
  income: number
  spending: number
  /** Income minus spending. Negative means overspent. Transfers never count. */
  net: number
}

export function monthTotals(transactions: Transaction[], month: string): MonthTotals {
  let income = 0
  let spending = 0
  for (const tx of transactions) {
    if (monthKey(tx.date) !== month) continue
    if (tx.type === "income") income += tx.amount
    else if (tx.type === "expense") spending += tx.amount
  }
  return { income, spending, net: income - spending }
}

export interface CategorySpend {
  category: Category
  amount: number
  /** 0 to 100, share of that month's total spending. */
  percent: number
}

/** Spending per category for one month, biggest first. */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
  month: string
): CategorySpend[] {
  const spent = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type !== "expense" || monthKey(tx.date) !== month) continue
    spent.set(tx.categoryId, (spent.get(tx.categoryId) ?? 0) + tx.amount)
  }

  const rows = categories
    .map((category) => ({ category, amount: spent.get(category.id) ?? 0 }))
    .filter((row) => row.amount > 0)
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  return rows
    .map((row) => ({ ...row, percent: (row.amount / total) * 100 }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * What was spent or earned in each category during one month, by category id.
 * Transfers have no category, and a category with nothing that month isn't in the map.
 */
export function categoryTotals(transactions: Transaction[], month: string): Map<string, number> {
  const totals = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type === "transfer" || monthKey(tx.date) !== month) continue
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount)
  }
  return totals
}

/** How many transactions were made in one month under each category, by category id. */
export function categoryCounts(transactions: Transaction[], month: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type === "transfer" || monthKey(tx.date) !== month) continue
    counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1)
  }
  return counts
}

/** How many transactions, from any month, are filed under this category. */
export function categoryTransactionCount(transactions: Transaction[], categoryId: string): number {
  return transactions.filter((tx) => tx.type !== "transfer" && tx.categoryId === categoryId).length
}

/** The newest transactions first. */
export function recentTransactions(transactions: Transaction[], count: number): Transaction[] {
  return [...transactions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, count)
}

export interface TransactionLabels {
  /** Null for transfers, and for a category that no longer exists. */
  category: Category | null
  /** The category's name, or "Transfer" for transfers. */
  categoryName: string
  /** "BCA" for income and spending, "BCA → Pluang" for transfers. */
  walletLabel: string
  /** What to call it in a list: its note, or the category name when there is no note. */
  title: string
}

/** Looks up the names a transaction row needs to show. */
export function describeTransaction(
  tx: Transaction,
  wallets: Wallet[],
  categories: Category[]
): TransactionLabels {
  const walletName = (id: string) => wallets.find((wallet) => wallet.id === id)?.name ?? "Unknown wallet"
  const note = tx.description.trim()

  if (tx.type === "transfer") {
    return {
      category: null,
      categoryName: "Transfer",
      walletLabel: `${walletName(tx.fromWalletId)} → ${walletName(tx.toWalletId)}`,
      title: note || "Transfer",
    }
  }
  const category = categories.find((entry) => entry.id === tx.categoryId) ?? null
  const categoryName = category?.name ?? "Uncategorized"
  return { category, categoryName, walletLabel: walletName(tx.walletId), title: note || categoryName }
}
