"use client"

import { useState } from "react"

import { AmountInput } from "@/components/amount-input"
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
import { validateBudget } from "@/lib/category-form"
import { formatRupiah } from "@/lib/format"
import type { Category } from "@/lib/types"

/** What a budget is for: one spending category, or everything spent in a month together. */
export type BudgetSubject = { kind: "category"; category: Category } | { kind: "month"; budget?: number }

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the budget is for. */
  subject?: BudgetSubject
  /** What was spent on it in the month being shown, and that month's name ("September"), as a reminder when choosing. */
  spent: number
  monthName: string
  /** Saves the budget, or takes it away when it is null. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (budget: number | null) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/** A monthly budget for one spending category, or for the whole month: one amount, and a way to take it away again. */
export function BudgetDialog({ open, onOpenChange, subject, spent, monthName, onSave, onCloseAutoFocus }: BudgetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-5 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {/* Mounted only while open, so it starts from the current budget every time. */}
        {subject ? (
          <BudgetBody
            subject={subject}
            spent={spent}
            monthName={monthName}
            onCancel={() => onOpenChange(false)}
            onSave={async (budget) => {
              await onSave(budget)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface BodyProps {
  subject: BudgetSubject
  spent: number
  monthName: string
  onCancel: () => void
  onSave: (budget: number | null) => Promise<void>
}

function BudgetBody({ subject, spent, monthName, onCancel, onSave }: BodyProps) {
  const wholeMonth = subject.kind === "month"
  const current = wholeMonth ? subject.budget : subject.category.budget
  const [amount, setAmount] = useState(current === undefined ? "" : String(current))
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function save(budget: number | null) {
    setSaving(true)
    try {
      await onSave(budget)
    } catch {
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validateBudget(amount)
    setError(problem)
    if (problem) {
      // Send the keyboard back to the box that needs attention.
      requestAnimationFrame(() => document.getElementById("budget-amount")?.focus())
      return
    }
    void save(Number(amount))
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">{wholeMonth ? "Budget for the whole month" : `Budget for ${subject.category.name}`}</DialogTitle>
        <DialogDescription>
          {wholeMonth
            ? "The most you want to spend in a month, on everything together. It is only a guide: nothing stops you going over."
            : "The most you want to spend on it in a month. It is only a guide: nothing stops you going over."}
        </DialogDescription>
      </DialogHeader>

      <Field
        label="Budget per month"
        htmlFor="budget-amount"
        error={error}
        hint={spent > 0 ? `You spent ${formatRupiah(spent)} ${wholeMonth ? "" : "on it "}in ${monthName}.` : undefined}
      >
        <AmountInput
          id="budget-amount"
          autoFocus
          value={amount}
          onChange={(digits) => {
            setAmount(digits)
            setError(undefined)
          }}
          invalid={!!error}
          describedBy={error ? "budget-amount-error" : undefined}
        />
      </Field>

      <DialogFooter className="mt-1">
        {current === undefined ? null : (
          <Button type="button" variant="ghost" size="lg" className="sm:mr-auto" disabled={saving} onClick={() => void save(null)}>
            Remove budget
          </Button>
        )}
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : "Save budget"}
        </Button>
      </DialogFooter>
    </form>
  )
}
