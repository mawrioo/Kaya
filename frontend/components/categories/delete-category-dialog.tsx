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
import type { Category } from "@/lib/types"

interface DeleteCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category that will be deleted. */
  category?: Category
  /** How many transactions are filed under it. They move to "Other". */
  transactionCount: number
  onConfirm: () => void
  /** Called as the dialog closes, to put keyboard focus somewhere sensible. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Asks before deleting, and says where the category's transactions go: nothing is lost. */
export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  transactionCount,
  onConfirm,
  onCloseAutoFocus,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this category?</AlertDialogTitle>
          <AlertDialogDescription>
            {category ? (
              <>
                <span className="font-medium text-foreground">{category.name}</span> will be removed.{" "}
                {transactionCount === 0
                  ? "It has no transactions."
                  : `Its ${transactionCount} ${transactionCount === 1 ? "transaction moves" : "transactions move"} to Other, so nothing is lost and no balance changes.`}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
