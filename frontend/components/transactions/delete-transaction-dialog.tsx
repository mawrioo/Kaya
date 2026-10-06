"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDate, formatRupiah } from "@/lib/format"
import type { Category, Transaction, Wallet } from "@/lib/types"
import { describeTransaction } from "@/lib/stats"

interface DeleteTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction that will be deleted. */
  transaction?: Transaction
  wallets: Wallet[]
  categories: Category[]
  onConfirm: () => void
  /** Called as the dialog closes, to put keyboard focus somewhere sensible. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Asks before deleting, and says what will happen to the wallet balance. */
export function DeleteTransactionDialog({
  open,
  onOpenChange,
  transaction,
  wallets,
  categories,
  onConfirm,
  onCloseAutoFocus,
}: DeleteTransactionDialogProps) {
  const details = transaction ? describeTransaction(transaction, wallets, categories) : undefined

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction && details ? (
              <>
                <span className="font-medium text-foreground">{details.title}</span> ·{" "}
                {formatRupiah(transaction.amount)} on {formatDate(transaction.date)}. Your{" "}
                {transaction.type === "transfer" ? "wallet balances" : "wallet balance"} will be adjusted.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
