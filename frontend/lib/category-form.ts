/**
 * The add/edit category form as plain data: its starting values, its checks,
 * and how it turns into what the backend expects. No React in here.
 */
import type { Category, CategoryChanges, CategoryType, IconName, NewCategory, PaletteColor } from "@/lib/types"
import { walletColorChoices } from "@/lib/wallet-kinds"

/** The same limit the backend enforces. */
export const MAX_CATEGORY_NAME_LENGTH = 30

export interface CategoryForm {
  name: string
  /** Chosen when adding. It isn't asked for again when editing, because the transactions in it would no longer fit. */
  type: CategoryType
  icon: IconName
  color: PaletteColor
}

export type CategoryFormField = "name"
export type CategoryFormErrors = Partial<Record<CategoryFormField, string>>

/** The icons a category can wear, in the order they are offered, with a name for screen readers. */
export const categoryIconOptions: { value: IconName; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "utensils", label: "Food" },
  { value: "coffee", label: "Coffee" },
  { value: "shopping-basket", label: "Groceries" },
  { value: "shopping-bag", label: "Shopping" },
  { value: "shirt", label: "Clothes" },
  { value: "bus", label: "Transport" },
  { value: "car", label: "Car" },
  { value: "house", label: "Home" },
  { value: "receipt", label: "Bills" },
  { value: "zap", label: "Electricity" },
  { value: "smartphone", label: "Phone" },
  { value: "clapperboard", label: "Entertainment" },
  { value: "gamepad-2", label: "Games" },
  { value: "heart-pulse", label: "Health" },
  { value: "dumbbell", label: "Fitness" },
  { value: "graduation-cap", label: "Education" },
  { value: "plane", label: "Travel" },
  { value: "paw-print", label: "Pets" },
  { value: "heart-handshake", label: "Family" },
  { value: "gift", label: "Gifts" },
  { value: "briefcase", label: "Work" },
  { value: "hand-coins", label: "Extra income" },
  { value: "circle-ellipsis", label: "Other" },
]

/** The colour used by the fewest categories of this kind so far, so a new one looks different. Ties go to the earlier colour. */
function leastUsedColor(categories: Category[], type: CategoryType): PaletteColor {
  const used = new Map<PaletteColor, number>()
  for (const category of categories) {
    if (category.type === type) used.set(category.color, (used.get(category.color) ?? 0) + 1)
  }
  return walletColorChoices.reduce((best, { value }) => ((used.get(value) ?? 0) < (used.get(best) ?? 0) ? value : best), walletColorChoices[0].value)
}

/** A fresh form: nothing typed, for spending unless told otherwise, with the plain tag icon and a colour that isn't taken yet. */
export function emptyCategoryForm(categories: Category[], type: CategoryType = "expense"): CategoryForm {
  return { name: "", type, icon: "tag", color: leastUsedColor(categories, type) }
}

/** A plain-English problem with a budget typed as digits, or undefined when it is fine. */
export function validateBudget(amount: string): string | undefined {
  if (!amount) return "Enter the most you want to spend in a month."
  if (Number(amount) <= 0) return "The budget must be more than zero."
  return undefined
}

/** The form filled in from an existing category, for editing. */
export function categoryToForm(category: Category): CategoryForm {
  return { name: category.name, type: category.type, icon: category.icon, color: category.color }
}

/**
 * Plain-English problems with the form. An empty object means it is ready to save.
 * `editing` is the category being changed, if any: it may keep its own name.
 */
export function validateCategoryForm(form: CategoryForm, categories: Category[], editing?: Category): CategoryFormErrors {
  const errors: CategoryFormErrors = {}
  const name = form.name.trim()
  const clash = categories.find(
    (category) => category.id !== editing?.id && category.type === form.type && category.name.toLowerCase() === name.toLowerCase()
  )

  if (!name) errors.name = "Give the category a name."
  else if (clash) errors.name = `You already have an ${form.type} category called ${clash.name}.`
  return errors
}

/** A new category from a form that has passed validateCategoryForm. */
export function formToNewCategory(form: CategoryForm): NewCategory {
  return { name: form.name.trim(), type: form.type, icon: form.icon, color: form.color }
}

/** What to save on the category being edited. Its type stays as it is. */
export function formToChanges(form: CategoryForm): CategoryChanges {
  return { name: form.name.trim(), icon: form.icon, color: form.color }
}
