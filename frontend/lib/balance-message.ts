/**
 * The line in a message that says which balance changed: "BCA is now Rp 8.527.300." Pure functions, so they can be
 * tried out on their own.
 */
import { formatRupiah } from "@/lib/format"
import type { Transaction, Wallet } from "@/lib/types"

/** The wallets a transaction moves money in or out of: one, or both for a transfer. */
export function walletIdsOf(tx: Transaction): string[] {
  return tx.type === "transfer" ? [tx.fromWalletId, tx.toWalletId] : [tx.walletId]
}

/**
 * "BCA is now Rp 8.527.300." for each wallet named, once each and in the order given. A wallet whose eye is closed is
 * named without its balance ("BCA's balance is updated."), because the number would give it away. A wallet that no
 * longer exists is left out. Empty when there is nothing to say.
 */
export function balanceLine(walletIds: string[], wallets: Wallet[], isHidden: (walletId: string) => boolean): string {
  return [...new Set(walletIds)]
    .flatMap((id) => {
      const wallet = wallets.find((entry) => entry.id === id)
      if (!wallet) return []
      return [isHidden(id) ? `${wallet.name}'s balance is updated.` : `${wallet.name} is now ${formatRupiah(wallet.balance)}.`]
    })
    .join(" ")
}
