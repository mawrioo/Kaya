/**
 * Turns transactions into a CSV file that opens in a spreadsheet. Pure functions, no React; the one thing that
 * touches the browser is in `lib/download.ts`.
 *
 * The columns are Date (2026-09-29), Type (Income, Expense or Transfer), Category, Wallet, To wallet (only for a
 * transfer), Note and Amount. The amount is a plain whole number so a spreadsheet can add it up: income is positive,
 * spending is negative, and a transfer shows its amount as it is (filter on Type to leave transfers out).
 */
import { monthKey } from "@/lib/stats"
import type { Category, Transaction, Wallet } from "@/lib/types"

const HEADER = ["Date", "Type", "Category", "Wallet", "To wallet", "Note", "Amount"]

/** A spreadsheet runs a text that starts with = + - or @ as a formula, so such a text gets a quote mark in front. */
function plain(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

/** One CSV field: wrapped in quotes when it holds a comma, a quote or a line break, with any quote doubled. */
function field(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Oldest first, which is the natural order in a spreadsheet; the time of day settles two on the same day. */
function byDate(a: Transaction, b: Transaction): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
}

export function transactionsToCsv(transactions: Transaction[], wallets: Wallet[], categories: Category[]): string {
  const walletName = (id: string) => wallets.find((wallet) => wallet.id === id)?.name ?? "Unknown wallet"
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? "Uncategorized"

  const rows = [...transactions].sort(byDate).map((tx) => {
    const cells =
      tx.type === "transfer"
        ? [tx.date.slice(0, 10), "Transfer", "", walletName(tx.fromWalletId), walletName(tx.toWalletId), tx.description, String(tx.amount)]
        : [
            tx.date.slice(0, 10),
            tx.type === "income" ? "Income" : "Expense",
            categoryName(tx.categoryId),
            walletName(tx.walletId),
            "",
            tx.description,
            String(tx.type === "income" ? tx.amount : -tx.amount),
          ]
    // Only the texts are made safe: the amount may start with a minus sign and must stay a number.
    return cells.map((cell, i) => field(i === 2 || i === 3 || i === 4 || i === 5 ? plain(cell) : cell)).join(",")
  })
  return [HEADER.join(","), ...rows].join("\r\n") + "\r\n"
}

/** The transactions of one month ("2026-09") or one year ("2026"), by the date written on them. */
export function transactionsOfPeriod(transactions: Transaction[], period: string): Transaction[] {
  return period.length === 4
    ? transactions.filter((tx) => tx.date.slice(0, 4) === period)
    : transactions.filter((tx) => monthKey(tx.date) === period)
}

/** "nabungbego-2026-09.csv" for a month, "nabungbego-2026.csv" for a year. */
export const csvFileName = (period: string): string => `nabungbego-${period}.csv`
