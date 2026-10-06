/**
 * How a transaction moves money between wallets. Pure logic, no database:
 * the store applies these changes to the wallet balances.
 */
import type { NewTransaction, Transaction } from "./types.ts"

export interface BalanceChange {
  walletId: string
  /** Positive adds to the wallet, negative takes away. */
  change: number
}

/** Income adds to a wallet, spending takes away, and a transfer does both to two wallets. */
export function balanceChanges(tx: Transaction | NewTransaction): BalanceChange[] {
  if (tx.type === "income") return [{ walletId: tx.walletId, change: tx.amount }]
  if (tx.type === "expense") return [{ walletId: tx.walletId, change: -tx.amount }]
  return [
    { walletId: tx.fromWalletId, change: -tx.amount },
    { walletId: tx.toWalletId, change: tx.amount },
  ]
}
