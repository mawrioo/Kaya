/**
 * The add/edit transaction form as plain data: its starting values, its
 * checks, and how it turns into a transaction. No React in here.
 */
import { toDateInput, toIsoDateTime } from "@/lib/dates"
import type { NewTransaction, Transaction, TransactionType, Wallet } from "@/lib/types"

export interface TransactionForm {
  type: TransactionType
  /** Digits only, e.g. "1250000". Empty until the owner types. */
  amount: string
  categoryId: string
  /** The wallet money is in. For a transfer, the wallet it leaves. */
  walletId: string
  /** Transfers only: the wallet it arrives in. */
  toWalletId: string
  /** "2026-09-30" */
  date: string
  note: string
}

export type FormField = "amount" | "categoryId" | "walletId" | "toWalletId" | "date"
export type FormErrors = Partial<Record<FormField, string>>

/** A fresh form: an expense today, in the wallet used last. Spending is by far the most common entry. */
export function emptyForm(walletId: string, today: Date): TransactionForm {
  return { type: "expense", amount: "", categoryId: "", walletId, toWalletId: "", date: toDateInput(today), note: "" }
}

/** The form filled in from an existing transaction, for editing. */
export function transactionToForm(tx: Transaction): TransactionForm {
  const base = { amount: String(tx.amount), date: tx.date.slice(0, 10), note: tx.description }
  if (tx.type === "transfer") {
    return { ...base, type: "transfer", categoryId: "", walletId: tx.fromWalletId, toWalletId: tx.toWalletId }
  }
  return { ...base, type: tx.type, categoryId: tx.categoryId, walletId: tx.walletId, toWalletId: "" }
}

/** What a saved transaction did to one wallet's balance: money in is plus, money out is minus. */
function effectOnWallet(tx: Transaction, walletId: string): number {
  if (tx.type === "transfer") return (tx.toWalletId === walletId ? tx.amount : 0) - (tx.fromWalletId === walletId ? tx.amount : 0)
  if (tx.walletId !== walletId) return 0
  return tx.type === "income" ? tx.amount : -tx.amount
}

/**
 * The wallet this form would take below zero, for the quiet "you can still save it" line: an expense, or a transfer
 * out, that leaves the wallet under zero and lower than it is now. When editing, the old version of the transaction is
 * taken out of the picture first, so an edit that changes nothing about the money says nothing. Income, and the wallet
 * a transfer arrives in, never count. Nothing until an amount has been typed.
 */
export function walletGoingBelowZero(form: TransactionForm, wallets: Wallet[], editing?: Transaction): Wallet | undefined {
  if (form.type === "income") return undefined
  const amount = Number(form.amount)
  const wallet = wallets.find((entry) => entry.id === form.walletId)
  if (!wallet || !Number.isFinite(amount) || amount <= 0) return undefined
  const without = wallet.balance - (editing ? effectOnWallet(editing, wallet.id) : 0)
  const after = without - amount
  return after < 0 && after < wallet.balance ? wallet : undefined
}

/** Plain-English problems with the form. An empty object means it is ready to save. */
export function validateForm(form: TransactionForm): FormErrors {
  const errors: FormErrors = {}
  const isTransfer = form.type === "transfer"

  if (!form.amount) errors.amount = "Enter an amount."
  else if (Number(form.amount) <= 0) errors.amount = "The amount must be more than zero."

  if (!isTransfer && !form.categoryId) errors.categoryId = "Choose a category."

  if (!form.walletId) errors.walletId = isTransfer ? "Choose the wallet the money leaves." : "Choose a wallet."
  if (isTransfer) {
    if (!form.toWalletId) errors.toWalletId = "Choose the wallet the money goes to."
    else if (form.toWalletId === form.walletId) errors.toWalletId = "Choose two different wallets."
  }

  if (!form.date) errors.date = "Pick a date."
  return errors
}

/**
 * The transaction to save. A brand-new one is stamped with the current time of
 * day; an edit that keeps its date keeps its original time, so it doesn't jump
 * around inside the day.
 */
export function formToTransaction(form: TransactionForm, now: Date, original?: Transaction): NewTransaction {
  const amount = Number(form.amount)
  const description = form.note.trim()
  const date = original && original.date.startsWith(form.date) ? original.date : toIsoDateTime(form.date, now)

  if (form.type === "transfer") {
    return { type: "transfer", amount, date, description, fromWalletId: form.walletId, toWalletId: form.toWalletId }
  }
  return { type: form.type, amount, date, description, walletId: form.walletId, categoryId: form.categoryId }
}
