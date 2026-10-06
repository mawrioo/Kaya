"use client"

import { useEffect, useState } from "react"

import { HideableMoney, ShowWhenVisible } from "@/components/balance-visibility"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { HistoryChart } from "@/components/wallets/history-chart"
import { errorMessage, loadWalletHistory } from "@/lib/api"
import { formatDate } from "@/lib/format"
import type { BalanceChange, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet?: Wallet
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Every balance the owner set by hand for one wallet: a small chart, then the list. */
export function HistoryDialog({ open, onOpenChange, wallet, onCloseAutoFocus }: HistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        {/* Mounted only while open, so the list is fetched fresh every time. */}
        {wallet ? <HistoryBody wallet={wallet} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: BalanceChange[] }

function HistoryBody({ wallet, onClose }: { wallet: Wallet; onClose: () => void }) {
  const [state, setState] = useState<Loaded>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    loadWalletHistory(wallet.id).then(
      (rows) => {
        if (!cancelled) setState({ status: "ready", rows })
      },
      (error) => {
        if (!cancelled) setState({ status: "error", message: errorMessage(error) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [wallet.id])

  const isInvestment = wallet.kind === "investment"

  return (
    <>
      <DialogHeader>
        <DialogTitle className="type-title">{wallet.name} history</DialogTitle>
        <DialogDescription>
          {isInvestment ? "Each time you updated its value." : "Each time you corrected its balance."} These never count
          as income or spending.
        </DialogDescription>
      </DialogHeader>

      {state.status === "loading" ? <p className="py-6 text-center text-muted-foreground">Loading...</p> : null}
      {state.status === "error" ? (
        <p role="alert" className="py-6 text-center text-negative">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" && state.rows.length === 0 ? (
        <p className="rounded-lg bg-muted px-4 py-6 text-center text-muted-foreground">
          {isInvestment
            ? "No value updates yet. Use Update value on the card when the market moves."
            : "No corrections yet. Use Correct balance when this wallet drifts from your real account."}
        </p>
      ) : null}

      {state.status === "ready" && state.rows.length > 0 ? (
        <>
          {/* The line would give the amounts away, so it goes when the balance is hidden. */}
          {state.rows.length >= 2 ? (
            <ShowWhenVisible id={wallet.id}>
              <HistoryChart rows={state.rows} />
            </ShowWhenVisible>
          ) : null}
          <ul aria-label="Changes, newest first" className="max-h-72 divide-y overflow-y-auto">
            {state.rows.map((row) => (
              <HistoryRow key={row.id} walletId={wallet.id} row={row} />
            ))}
          </ul>
        </>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="secondary" size="lg" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  )
}

function HistoryRow({ walletId, row }: { walletId: string; row: BalanceChange }) {
  const change = row.newBalance - row.oldBalance

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{formatDate(row.at)}</p>
        <p className="text-sm text-muted-foreground">{row.kind === "value" ? "Value update" : "Balance correction"}</p>
      </div>
      <div className="text-right">
        <p>
          <HideableMoney id={walletId} amount={row.newBalance} className="font-serif text-lg font-medium" />
        </p>
        <p className="text-sm font-medium">
          <HideableMoney
            id={walletId}
            amount={change}
            sign="always"
            className={cn(change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground")}
          />
        </p>
      </div>
    </li>
  )
}
