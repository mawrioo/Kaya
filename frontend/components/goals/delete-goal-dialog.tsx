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
import { formatRupiah } from "@/lib/format"
import type { Goal } from "@/lib/types"

interface DeleteGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The goal that will be deleted. */
  goal?: Goal
  /** The name of the wallet its money is kept in. */
  walletName: string
  onConfirm: () => void
  /** Called as the dialog closes, to put keyboard focus somewhere sensible. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Asks before deleting, and says the money it stood for stays where it is. */
export function DeleteGoalDialog({ open, onOpenChange, goal, walletName, onConfirm, onCloseAutoFocus }: DeleteGoalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
          <AlertDialogDescription>
            {goal ? (
              <>
                <span className="font-medium text-foreground">{goal.name}</span> will be removed.
                {goal.savedAmount > 0
                  ? ` The ${formatRupiah(goal.savedAmount)} you saved for it stays in ${walletName}.`
                  : null}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete goal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
