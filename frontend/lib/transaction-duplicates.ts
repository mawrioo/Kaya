import type { TransactionForm } from "./transaction-form.ts"
import type { Transaction } from "./types.ts"

export interface DuplicateMatch { transaction: Transaction; sameNote: boolean }
const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" })

/** Advisory matches, never permission to discard an entry or retry a save. */
export function findTransactionDuplicates(form: TransactionForm, transactions: Transaction[], excludeId?: string): DuplicateMatch[] {
  const amount = Number(form.amount)
  if (!Number.isSafeInteger(amount) || amount <= 0 || !form.date || !form.walletId || (form.type === "transfer" && (!form.toWalletId || form.toWalletId === form.walletId))) return []
  const note = normalize(form.note)
  return transactions.filter(tx => {
    if (tx.id === excludeId || tx.type !== form.type || tx.amount !== amount) return false
    const date = new Date(tx.date)
    if (Number.isNaN(date.getTime()) || day.format(date) !== form.date) return false
    return tx.type === "transfer" ? tx.fromWalletId === form.walletId && tx.toWalletId === form.toWalletId : tx.walletId === form.walletId
  }).map(transaction => ({ transaction, sameNote: !!note && normalize(transaction.description) === note }))
    .sort((a, b) => Number(b.sameNote) - Number(a.sameNote) || b.transaction.date.localeCompare(a.transaction.date) || a.transaction.id.localeCompare(b.transaction.id))
}

/** Includes record changes, so a newly observed match must be reviewed again. */
export function duplicateSignature(matches: DuplicateMatch[]): string {
  return JSON.stringify(matches.map(({ transaction: tx }) => [tx.id, tx.description, tx.amount, tx.date, tx.type === "transfer" ? [tx.fromWalletId, tx.toWalletId] : [tx.walletId, tx.categoryId]]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
}
