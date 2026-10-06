"use client"

import { useEffect, useState } from "react"
import { ArrowRightLeft } from "lucide-react"

import { useData } from "@/components/data-provider"
import { GoalHistoryChart } from "@/components/goals/goal-history-chart"
import { Money } from "@/components/money"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { errorMessage, loadGoalHistory } from "@/lib/api"
import { formatDate, formatRupiah } from "@/lib/format"
import type { Goal, GoalMovement } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GoalHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Every time what is saved for a goal changed: a small chart, then the list. */
export function GoalHistoryDialog({ open, onOpenChange, goal, onCloseAutoFocus }: GoalHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* Mounted only while open, so the list is fetched fresh every time. */}
        {goal ? <HistoryBody goal={goal} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

type Loaded = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: GoalMovement[] }

function HistoryBody({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [state, setState] = useState<Loaded>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    loadGoalHistory(goal.id).then(
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
  }, [goal.id])

  return (
    <>
      <DialogHeader>
        <DialogTitle className="type-title">{goal.name} history</DialogTitle>
        <DialogDescription>
          Every time what you have saved for this goal changed. {formatRupiah(goal.savedAmount)} of{" "}
          {formatRupiah(goal.targetAmount)} so far.
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
          Nothing yet. Use Add money on the card, and every change will be listed here.
        </p>
      ) : null}

      {state.status === "ready" && state.rows.length > 0 ? (
        <>
          {state.rows.length >= 2 ? <GoalHistoryChart rows={state.rows} targetAmount={goal.targetAmount} /> : null}
          <ul aria-label="Changes, newest first" className="max-h-72 divide-y overflow-y-auto">
            {state.rows.map((row) => (
              <HistoryRow key={row.id} row={row} />
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

const WHAT_HAPPENED = {
  start: "Started with",
  add: "Added",
  "take-out": "Taken out",
  correction: "Corrected by hand",
}

function HistoryRow({ row }: { row: GoalMovement }) {
  const { wallets } = useData()
  const change = row.newSaved - row.oldSaved
  const from = row.fromWalletId ? wallets.find((wallet) => wallet.id === row.fromWalletId) : undefined

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{formatDate(row.at)}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          {WHAT_HAPPENED[row.kind]}
          {row.transferred ? (
            <span className="inline-flex items-center gap-1">
              <ArrowRightLeft className="size-3.5 shrink-0" aria-hidden />
              {from ? `moved from ${from.name}` : "moved from another wallet"}
            </span>
          ) : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p>
          <Money amount={row.newSaved} className="font-serif text-lg font-medium" />
        </p>
        <p
          className={cn(
            "text-sm font-medium tabular-nums",
            change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground"
          )}
        >
          {formatRupiah(change, { sign: "always" })}
        </p>
      </div>
    </li>
  )
}
