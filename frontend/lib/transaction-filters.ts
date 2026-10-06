/**
 * Searching, filtering and grouping the transaction list. Pure functions, so
 * they behave the same whatever the data comes from.
 */
import { isMonth, isYear, monthDates, yearDates } from "@/lib/dates"
import { formatMonth } from "@/lib/format"
import { describeTransaction, involvesWallet } from "@/lib/stats"
import type { Category, Transaction, TransactionType, Wallet } from "@/lib/types"

export interface TransactionFilters {
  search: string
  /** "2026-09-01", or "" for no lower limit. */
  from: string
  /** "2026-09-30", or "" for no upper limit. */
  to: string
  type: "all" | TransactionType
  categoryId: string
  walletId: string
}

export const NO_FILTERS: TransactionFilters = {
  search: "",
  from: "",
  to: "",
  type: "all",
  categoryId: "all",
  walletId: "all",
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    filters.type !== "all" ||
    filters.categoryId !== "all" ||
    filters.walletId !== "all"
  )
}

/** Keeps the transactions that match every filter. Search looks at the note and the category name. */
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  wallets: Wallet[],
  categories: Category[]
): Transaction[] {
  const query = filters.search.trim().toLowerCase()

  return transactions.filter((tx) => {
    const day = tx.date.slice(0, 10)
    if (filters.from && day < filters.from) return false
    if (filters.to && day > filters.to) return false
    if (filters.type !== "all" && tx.type !== filters.type) return false
    if (filters.categoryId !== "all" && (tx.type === "transfer" || tx.categoryId !== filters.categoryId)) return false
    if (filters.walletId !== "all" && !involvesWallet(tx, filters.walletId)) return false

    if (query) {
      const { categoryName } = describeTransaction(tx, wallets, categories)
      const found = tx.description.toLowerCase().includes(query) || categoryName.toLowerCase().includes(query)
      if (!found) return false
    }
    return true
  })
}

export interface DayGroup {
  /** "2026-09-30" */
  day: string
  items: Transaction[]
}

/** Newest first. */
export function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

/** Newest first, split into one group per calendar day. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const tx of sortNewestFirst(transactions)) {
    const day = tx.date.slice(0, 10)
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(tx)
    else groups.push({ day, items: [tx] })
  }
  return groups
}

/** What an empty list is about, when the owner arrived from a wallet or a category and nothing else is filtered. */
export type EmptyScope =
  | { kind: "wallet"; name: string }
  /** `period` is "September 2026" or "2026" when the list was limited to exactly one month or year. */
  | { kind: "category"; name: string; period?: string }

/**
 * Names what an empty list is about, so it can say "Nothing in BCA yet" instead of "Nothing matches these filters".
 * Only for a list narrowed to one wallet, or to one category (for no dates, or for exactly one month or one year);
 * a search, a kind of transaction or any other mix of filters gets the usual message, so nothing is read into it.
 */
export function emptyScope(filters: TransactionFilters, wallets: Wallet[], categories: Category[]): EmptyScope | undefined {
  if (filters.search.trim() !== "" || filters.type !== "all") return undefined
  const noDates = filters.from === "" && filters.to === ""

  if (filters.walletId !== "all" && filters.categoryId === "all" && noDates) {
    const wallet = wallets.find((entry) => entry.id === filters.walletId)
    return wallet ? { kind: "wallet", name: wallet.name } : undefined
  }

  if (filters.categoryId !== "all" && filters.walletId === "all") {
    const category = categories.find((entry) => entry.id === filters.categoryId)
    if (!category) return undefined
    if (noDates) return { kind: "category", name: category.name }
    const month = filters.from.slice(0, 7)
    const year = filters.from.slice(0, 4)
    if (isMonth(month) && filters.from === monthDates(month).from && filters.to === monthDates(month).to) {
      return { kind: "category", name: category.name, period: formatMonth(month) }
    }
    if (isYear(year) && filters.from === yearDates(year).from && filters.to === yearDates(year).to) {
      return { kind: "category", name: category.name, period: year }
    }
  }
  return undefined
}
