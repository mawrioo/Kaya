"use client"

import { useRef, useState } from "react"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

import { CategoryColorPicker, CategoryIconPicker } from "@/components/categories/category-pickers"
import { useData } from "@/components/data-provider"
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
import { Input } from "@/components/ui/input"
import {
  MAX_CATEGORY_NAME_LENGTH,
  categoryToForm,
  emptyCategoryForm,
  validateCategoryForm,
  type CategoryForm,
  type CategoryFormErrors,
  type CategoryFormField,
} from "@/lib/category-form"
import type { Category, CategoryType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category being edited. Leave out to add a new one. */
  editing?: Category
  /** When adding: the kind the new category must be, so the choice isn't offered (used inside the transaction form). */
  fixedType?: CategoryType
  /** Saves the category. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (form: CategoryForm) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

export function CategoryDialog({ open, onOpenChange, editing, fixedType, onSave, onCloseAutoFocus }: CategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* The form is mounted only while the dialog is open, so it starts fresh every time. */}
        <CategoryFormBody
          editing={editing}
          fixedType={fixedType}
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

const TYPE_OPTIONS: { value: CategoryType; label: string; icon: typeof ArrowUpRight; selectedTone: string }[] = [
  { value: "expense", label: "Expense", icon: ArrowUpRight, selectedTone: "peer-checked:text-negative" },
  { value: "income", label: "Income", icon: ArrowDownLeft, selectedTone: "peer-checked:text-positive" },
]

interface BodyProps {
  editing?: Category
  fixedType?: CategoryType
  onCancel: () => void
  onSave: (form: CategoryForm) => Promise<void>
}

function CategoryFormBody({ editing, fixedType, onCancel, onSave }: BodyProps) {
  const { categories } = useData()
  const [form, setForm] = useState<CategoryForm>(() =>
    editing ? categoryToForm(editing) : emptyCategoryForm(categories, fixedType)
  )
  const [errors, setErrors] = useState<CategoryFormErrors>({})
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function update<K extends keyof CategoryForm>(field: K, value: CategoryForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    // Fixing a field clears its message straight away.
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field as CategoryFormField]
        return next
      })
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const found = validateCategoryForm(form, categories, editing)
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
        <DialogTitle className="type-title">{editing ? "Edit category" : "Add category"}</DialogTitle>
        <DialogDescription className={fixedType && !editing ? undefined : "sr-only"}>
          {editing
            ? "Change this category's name, colour or icon."
            : fixedType
              ? `A new category for ${fixedType === "income" ? "income" : "spending"}.`
              : "Add a way to group your spending or your income, with a name, a colour and an icon."}
        </DialogDescription>
      </DialogHeader>

      {editing || fixedType ? null : (
        <fieldset>
          <legend className="sr-only">Is this category for spending or for income?</legend>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon, selectedTone }) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="category-type"
                  value={value}
                  checked={form.type === value}
                  onChange={() => {
                    update("type", value)
                    // A name that clashed with the other kind may not clash with this one.
                    setErrors({})
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground peer-checked:bg-card peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    selectedTone
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Name" htmlFor="category-name" error={errors.name}>
        <Input
          id="category-name"
          autoFocus
          value={form.name}
          maxLength={MAX_CATEGORY_NAME_LENGTH}
          autoComplete="off"
          placeholder={form.type === "income" ? "e.g. Freelance" : "e.g. Coffee"}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "category-name-error" : undefined}
          onChange={(event) => update("name", event.target.value)}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>

      <CategoryColorPicker value={form.color} onChange={(color) => update("color", color)} />

      <CategoryIconPicker value={form.icon} onChange={(icon) => update("icon", icon)} color={form.color} />

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : editing ? "Save changes" : "Add category"}
        </Button>
      </DialogFooter>
    </form>
  )
}
