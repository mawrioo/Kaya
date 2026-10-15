"use client"

import { useState } from "react"

import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { selectTriggerClasses, WalletOption } from "@/components/transactions/options"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatRupiah } from "@/lib/format"
import type { Wallet } from "@/lib/types"

interface SettleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The matured deposito whose money is being moved. */
  wallet?: Wallet
  /**
   * Moves the money. `toWalletId` is only given for a deposito that doesn't know where its money came from; otherwise it
   * goes back to the wallet it came from. Throws if it couldn't be moved, which keeps the dialog open.
   */
  onConfirm: (wallet: Wallet, toWalletId?: string) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * A deposito that has matured and doesn't renew waits for the owner to confirm. The money goes back to the wallet it came
 * from (an older deposito, or one whose wallet was deleted, asks for a wallet instead). Nothing moves until "Move money" is
 * pressed. It becomes one transfer for everything the deposito holds (the money put in and the interest), so it is not
 * income. The message after saving offers Undo.
 */
export function SettleDialog({ open, onOpenChange, wallet, onConfirm, onCloseAutoFocus }: SettleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-5 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {wallet ? (
          <SettleBody
            wallet={wallet}
            onCancel={() => onOpenChange(false)}
            onConfirm={async (toWalletId) => {
              await onConfirm(wallet, toWalletId)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SettleBody({
  wallet,
  onCancel,
  onConfirm,
}: {
  wallet: Wallet
  onCancel: () => void
  onConfirm: (toWalletId?: string) => Promise<void>
}) {
  const { wallets } = useData()
  const sourceId = wallet.deposito?.sourceWalletId
  // The wallet it came from, if it is still there.
  const source = sourceId ? wallets.find((entry) => entry.id === sourceId) : undefined
  const targets = wallets.filter((entry) => entry.kind !== "deposito")
  const [toWalletId, setToWalletId] = useState(targets[0]?.id ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!source && !toWalletId) return
    setSaving(true)
    try {
      await onConfirm(source ? undefined : toWalletId)
    } catch {
      // The page has already explained what went wrong. Stay open so nothing is lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title wrap-anywhere">
          {source ? `Move the money back to ${source.name}` : `Move the money from ${wallet.name}`}
        </DialogTitle>
        <DialogDescription>
          It matured, so you can take out everything it holds: {formatRupiah(wallet.balance)}, the money you put in and the
          interest.
        </DialogDescription>
      </DialogHeader>

      {source ? (
        <p className="text-sm">
          It goes back to <span className="font-medium">{source.name}</span>, the wallet it came from.
        </p>
      ) : (
        <Field
          label="Move it into"
          htmlFor="settle-wallet"
          hint={sourceId ? "The wallet it came from is gone, so choose another." : "It didn't record which wallet it came from, so choose one."}
        >
          <Select value={toWalletId} onValueChange={setToWalletId}>
            <SelectTrigger id="settle-wallet" className={selectTriggerClasses}>
              <SelectValue placeholder="Choose a wallet" />
            </SelectTrigger>
            <SelectContent position="popper">
              {targets.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  <WalletOption wallet={entry} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <p className="text-sm text-muted-foreground">
        It is saved as one transfer, so it isn&apos;t counted as income. The deposito then shows Rp 0.
        The message afterwards has Undo for ten seconds to move it back and reopen the deposito.
      </p>

      <DialogFooter>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving || (!source && !toWalletId)}>
          {saving ? "Moving..." : "Move money"}
        </Button>
      </DialogFooter>
    </form>
  )
}
