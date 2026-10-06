"use client"

import { useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { AmountInput } from "@/components/amount-input"
import { HideableMoney, ShowWhenVisible } from "@/components/balance-visibility"
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
import { formatChangePercent, formatRupiah } from "@/lib/format"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The two ways to set a balance by hand: an investment's market value, or a
 * fix for a wallet whose balance has drifted from the real account. Neither is
 * income or spending, so neither makes a transaction.
 */
export type BalanceMode = "value" | "correction"

const COPY = {
  value: {
    title: "Update value",
    intro: (name: string) =>
      `Enter what ${name} is worth right now. This only changes the balance. It isn't counted as income or spending.`,
    current: "Current value",
    label: "New value",
    empty: "Enter what it is worth now.",
    button: "Update value",
    against: "from the current value",
    same: "Same as the current value",
  },
  correction: {
    title: "Correct balance",
    intro: (name: string) =>
      `Enter the balance your real ${name} account shows. The difference is saved as a correction. It isn't counted as income or spending.`,
    current: "Current balance",
    label: "Real balance",
    empty: "Enter the balance your account shows.",
    button: "Correct balance",
    against: "from the current balance",
    same: "Same as the current balance",
  },
}

interface BalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: BalanceMode
  /** The wallet whose balance is being set. */
  wallet?: Wallet
  /** Saves the new balance. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (wallet: Wallet, value: number) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

export function BalanceDialog({ open, onOpenChange, mode, wallet, onSave, onCloseAutoFocus }: BalanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-5 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {wallet ? (
          <BalanceForm
            mode={mode}
            wallet={wallet}
            onCancel={() => onOpenChange(false)}
            onSave={async (value) => {
              await onSave(wallet, value)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface FormProps {
  mode: BalanceMode
  wallet: Wallet
  onCancel: () => void
  onSave: (value: number) => Promise<void>
}

function BalanceForm({ mode, wallet, onCancel, onSave }: FormProps) {
  const copy = COPY[mode]
  // Digits only, e.g. "7620000". Starts empty so pressing Enter by accident saves nothing.
  const [value, setValue] = useState("")
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!value) {
      setError(copy.empty)
      requestAnimationFrame(() => document.getElementById("wallet-value")?.focus())
      return
    }
    setSaving(true)
    try {
      await onSave(Number(value))
    } catch {
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">{copy.title}</DialogTitle>
        <DialogDescription>{copy.intro(wallet.name)}</DialogDescription>
      </DialogHeader>

      <p className="flex items-baseline justify-between gap-4 rounded-lg bg-muted px-4 py-3">
        <span className="text-sm text-muted-foreground">{copy.current}</span>
        <HideableMoney id={wallet.id} amount={wallet.balance} className="font-serif text-xl font-medium" />
      </p>

      <div className="grid grid-cols-1 gap-2">
        <Field label={copy.label} htmlFor="wallet-value" error={error}>
          <AmountInput
            id="wallet-value"
            autoFocus
            value={value}
            onChange={(digits) => {
              setValue(digits)
              setError(undefined)
            }}
            invalid={!!error}
            describedBy={error ? "wallet-value-error" : undefined}
          />
        </Field>
        {value && !error ? <Difference wallet={wallet} value={Number(value)} copy={copy} /> : null}
      </div>

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : copy.button}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * How far the number being typed is from the current one, as it is typed, so a
 * slip like an extra zero is obvious before anything is saved. It is left out
 * while the wallet's balance is hidden, because it would give the balance away.
 */
function Difference({ wallet, value, copy }: { wallet: Wallet; value: number; copy: (typeof COPY)[BalanceMode] }) {
  const change = value - wallet.balance
  const percent = formatChangePercent(change, wallet.balance)

  return (
    <ShowWhenVisible id={wallet.id}>
      <p
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium",
          change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground"
        )}
      >
        {change > 0 ? <TrendingUp className="size-4 shrink-0" aria-hidden /> : null}
        {change < 0 ? <TrendingDown className="size-4 shrink-0" aria-hidden /> : null}
        {change === 0
          ? copy.same
          : `${formatRupiah(change, { sign: "always" })}${percent ? ` (${percent})` : ""} ${copy.against}`}
      </p>
    </ShowWhenVisible>
  )
}
