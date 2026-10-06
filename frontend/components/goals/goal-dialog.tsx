"use client"

import { useRef, useState } from "react"

import { AmountInput } from "@/components/amount-input"
import { useData } from "@/components/data-provider"
import { DatePicker } from "@/components/date-picker"
import { Field } from "@/components/form-field"
import { GoalIconPicker } from "@/components/goals/goal-icon-picker"
import { WalletOption, selectTriggerClasses } from "@/components/transactions/options"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MAX_GOAL_NAME_LENGTH,
  emptyGoalForm,
  goalToForm,
  validateGoalForm,
  type GoalForm,
  type GoalFormErrors,
  type GoalFormField,
} from "@/lib/goal-form"
import type { Goal } from "@/lib/types"

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The goal being edited. Leave out to add a new one. */
  editing?: Goal
  /** The wallet to pre-select when adding, so several goals in the same wallet are quicker. */
  defaultWalletId: string
  /** Today's date, "2026-09-30": a target date can't be earlier. */
  today: string
  /** Saves the goal. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (form: GoalForm) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

export function GoalDialog({ open, onOpenChange, editing, defaultWalletId, today, onSave, onCloseAutoFocus }: GoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* The form is mounted only while the dialog is open, so it starts fresh every time. */}
        <GoalFormBody
          editing={editing}
          defaultWalletId={defaultWalletId}
          today={today}
          onCancel={() => onOpenChange(false)}
          onSave={async (form) => {
            await onSave(form)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

interface BodyProps {
  editing?: Goal
  defaultWalletId: string
  today: string
  onCancel: () => void
  onSave: (form: GoalForm) => Promise<void>
}

function GoalFormBody({ editing, defaultWalletId, today, onCancel, onSave }: BodyProps) {
  const { wallets } = useData()
  const [form, setForm] = useState<GoalForm>(() => (editing ? goalToForm(editing) : emptyGoalForm(defaultWalletId)))
  const [errors, setErrors] = useState<GoalFormErrors>({})
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function update<K extends keyof GoalForm>(field: K, value: GoalForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    // Fixing a field clears its message straight away.
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field as GoalFormField]
        return next
      })
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const found = validateGoalForm(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Send the keyboard to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } catch {
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">{editing ? "Edit goal" : "Add goal"}</DialogTitle>
        <DialogDescription className="sr-only">
          {editing
            ? "Change this goal's name, target, date, icon or the wallet it is saved in."
            : "Something you are saving toward, with a target amount and, if you like, a date."}
        </DialogDescription>
      </DialogHeader>

      <Field label="Name" htmlFor="goal-name" error={errors.name}>
        <Input
          id="goal-name"
          value={form.name}
          maxLength={MAX_GOAL_NAME_LENGTH}
          autoComplete="off"
          placeholder="e.g. New laptop"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "goal-name-error" : undefined}
          onChange={(event) => update("name", event.target.value)}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>

      <Field label="Target amount" htmlFor="goal-target" error={errors.target}>
        <AmountInput
          id="goal-target"
          value={form.target}
          onChange={(digits) => update("target", digits)}
          invalid={!!errors.target}
          describedBy={errors.target ? "goal-target-error" : undefined}
        />
      </Field>

      <Field
        label="Saved so far (optional)"
        htmlFor="goal-saved"
        hint={editing ? "To add new savings, use Add money on the goal's card." : "What you have already set aside for it."}
      >
        <AmountInput id="goal-saved" value={form.saved} onChange={(digits) => update("saved", digits)} />
      </Field>

      <Field label="Saved in" htmlFor="goal-wallet" error={errors.walletId}>
        <Select value={form.walletId} onValueChange={(value) => update("walletId", value)}>
          <SelectTrigger
            id="goal-wallet"
            className={selectTriggerClasses}
            aria-invalid={errors.walletId ? true : undefined}
            aria-describedby={errors.walletId ? "goal-wallet-error" : undefined}
          >
            <SelectValue placeholder="Choose a wallet" />
          </SelectTrigger>
          <SelectContent position="popper">
            {wallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                <WalletOption wallet={wallet} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Target date (optional)"
        htmlFor="goal-date"
        hint="Add one to see how much to save each month."
      >
        <DatePicker
          id="goal-date"
          value={form.targetDate}
          onChange={(value) => update("targetDate", value)}
          min={today}
          placeholder="No target date"
          clearable
        />
      </Field>

      <GoalIconPicker value={form.icon} onChange={(icon) => update("icon", icon)} />

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : editing ? "Save changes" : "Add goal"}
        </Button>
      </DialogFooter>
    </form>
  )
}
