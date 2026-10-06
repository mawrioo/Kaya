"use client"

import { useState } from "react"
import Link from "next/link"

import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { walletDeleteImpact } from "@/lib/stats"
import type { Wallet } from "@/lib/types"

/** What has to be typed to confirm, e.g. "Delete BCA". */
export const deletePhrase = (wallet: Wallet) => `Delete ${wallet.name}`

/** Capitals and spaces don't matter, so "delete bca" and "DeleteBCA" both count. */
const squash = (text: string) => text.toLowerCase().replace(/\s+/g, "")

interface DeleteWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The wallet that would be deleted. */
  wallet?: Wallet
  /** Deletes it. Throws if it couldn't be deleted, which keeps the dialog open. */
  onConfirm: (wallet: Wallet) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * Deleting a wallet also deletes its transactions, so the owner has to type
 * "Delete <name>" first (it can be undone for a few seconds afterwards, but that
 * is no reason to make it easy). A wallet that can't be deleted at all (the last
 * one, or one a goal is saved in) gets an explanation instead.
 */
export function DeleteWalletDialog({ open, onOpenChange, wallet, onConfirm, onCloseAutoFocus }: DeleteWalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-5 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {wallet ? (
          <DeleteBody
            wallet={wallet}
            onCancel={() => onOpenChange(false)}
            onConfirm={async () => {
              await onConfirm(wallet)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Why this wallet can't be deleted, or undefined when it can. The backend enforces the same rules. */
function blockedReason(walletCount: number, goalNames: string[]): string | undefined {
  if (walletCount <= 1) return "Keep at least one wallet. Add another before deleting this one."
  if (goalNames.length > 0) {
    const one = goalNames.length === 1
    return `${one ? "A goal is" : "Goals are"} saved in it: ${goalNames.map((name) => `"${name}"`).join(", ")}. Move ${one ? "it" : "them"} to another wallet on the Goals page first.`
  }
  return undefined
}

function DeleteBody({ wallet, onCancel, onConfirm }: { wallet: Wallet; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const { wallets, goals, transactions } = useData()
  const [typed, setTyped] = useState("")
  const [deleting, setDeleting] = useState(false)

  const goalNames = goals.filter((goal) => goal.walletId === wallet.id).map((goal) => goal.name)
  const blocked = blockedReason(wallets.length, goalNames)
  // When goals are what is in the way, the way out is on the Goals page.
  const canMoveGoals = wallets.length > 1 && goalNames.length > 0
  const impact = walletDeleteImpact(transactions, wallet.id)
  const phrase = deletePhrase(wallet)
  const confirmed = squash(typed) === squash(phrase)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!confirmed) return
    setDeleting(true)
    try {
      await onConfirm()
    } catch {
      // The page has already explained what went wrong. Stay open.
    } finally {
      setDeleting(false)
    }
  }

  if (blocked) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="type-title">{wallet.name} can&apos;t be deleted</DialogTitle>
          <DialogDescription>{blocked}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant={canMoveGoals ? "ghost" : "secondary"} size="lg" onClick={onCancel}>
            Close
          </Button>
          {canMoveGoals ? (
            <Button asChild size="lg">
              <Link href="/goals">Go to Goals</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">Delete {wallet.name}?</DialogTitle>
        <DialogDescription>You can undo it for 10 seconds afterwards.</DialogDescription>
      </DialogHeader>

      <ul className="grid list-disc grid-cols-1 gap-1.5 pl-5 text-sm marker:text-muted-foreground">
        <li>The wallet and its balance leave your total.</li>
        <li>
          {impact.transactions === 0
            ? "It has no transactions."
            : `Its ${impact.transactions} ${impact.transactions === 1 ? "transaction is" : "transactions are"} deleted too.`}
        </li>
        {impact.transfers > 0 ? (
          <li>
            {impact.transfers === 1 ? "One of them is a transfer" : `${impact.transfers} of them are transfers`} with
            another wallet. That wallet keeps its balance.
          </li>
        ) : null}
      </ul>

      <Field label={`To confirm, type "${phrase}"`} htmlFor="delete-wallet-confirm">
        <Input
          id="delete-wallet-confirm"
          value={typed}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(event) => setTyped(event.target.value)}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Keep it
        </Button>
        <Button type="submit" variant="destructive" size="lg" disabled={!confirmed || deleting}>
          {deleting ? "Deleting..." : "Delete wallet"}
        </Button>
      </DialogFooter>
    </form>
  )
}
