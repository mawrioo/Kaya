/**
 * The add/edit goal form as plain data: its starting values, its checks, and
 * how it turns into what the backend expects. No React in here.
 */
import type { Goal, GoalIconName, GoalInput } from "@/lib/types"

/** The same limit the backend enforces. */
export const MAX_GOAL_NAME_LENGTH = 40

export interface GoalForm {
  name: string
  /** Digits only, e.g. "30000000". Empty until the owner types. */
  target: string
  /** Digits only. Empty means nothing saved yet. */
  saved: string
  /** The wallet the money is kept in. */
  walletId: string
  /** "2027-03-31", or "" for no date. */
  targetDate: string
  icon: GoalIconName
}

export type GoalFormField = "name" | "target" | "walletId"
export type GoalFormErrors = Partial<Record<GoalFormField, string>>

/** The icons a goal can wear, in the order they are offered, with a name for screen readers. */
export const goalIconOptions: { value: GoalIconName; label: string }[] = [
  { value: "piggy-bank", label: "Savings" },
  { value: "umbrella", label: "Rainy day" },
  { value: "plane", label: "Travel" },
  { value: "key-round", label: "Home" },
  { value: "car", label: "Vehicle" },
  { value: "laptop", label: "Gadget" },
  { value: "graduation-cap", label: "Education" },
  { value: "heart", label: "Family" },
  { value: "gift", label: "Gift" },
  { value: "heart-pulse", label: "Health" },
  { value: "gem", label: "Big purchase" },
  { value: "camera", label: "Hobby" },
]

/** A fresh form: nothing typed, in the wallet a goal was saved in last, wearing the piggy bank. */
export function emptyGoalForm(walletId: string): GoalForm {
  return { name: "", target: "", saved: "", walletId, targetDate: "", icon: "piggy-bank" }
}

/** The form filled in from an existing goal, for editing. */
export function goalToForm(goal: Goal): GoalForm {
  return {
    name: goal.name,
    target: String(goal.targetAmount),
    saved: goal.savedAmount === 0 ? "" : String(goal.savedAmount),
    walletId: goal.walletId,
    targetDate: goal.targetDate,
    icon: goal.icon,
  }
}

/** Plain-English problems with the form. An empty object means it is ready to save. */
export function validateGoalForm(form: GoalForm): GoalFormErrors {
  const errors: GoalFormErrors = {}
  if (!form.name.trim()) errors.name = "Give the goal a name."
  if (!form.target) errors.target = "Enter the amount you're saving toward."
  else if (Number(form.target) <= 0) errors.target = "The target must be more than zero."
  if (!form.walletId) errors.walletId = "Choose the wallet it's saved in."
  return errors
}

/** What to save, from a form that has passed validateGoalForm. */
export function formToGoal(form: GoalForm): GoalInput {
  return {
    name: form.name.trim(),
    targetAmount: Number(form.target),
    savedAmount: Number(form.saved || 0),
    targetDate: form.targetDate,
    walletId: form.walletId,
    icon: form.icon,
  }
}
