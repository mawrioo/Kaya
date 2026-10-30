"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpDown, Plus } from "lucide-react"
import { toast } from "sonner"

import { BudgetDialog } from "@/components/categories/budget-dialog"
import { CategoryDialog } from "@/components/categories/category-dialog"
import { CategoryReorderDialog } from "@/components/categories/category-reorder-dialog"
import { CategoryRow, categoryMenuId, categoryRowId } from "@/components/categories/category-row"
import { DeleteCategoryDialog } from "@/components/categories/delete-category-dialog"
import { NeedsCategory } from "@/components/categories/needs-category"
import { WHOLE_MONTH_MENU_ID, WholeMonthRow } from "@/components/categories/whole-month-row"
import { useData } from "@/components/data-provider"
import { Panel } from "@/components/panel"
import { Button } from "@/components/ui/button"
import { useReturnFocus } from "@/hooks/use-return-focus"
import { errorMessage } from "@/lib/api"
import { formToChanges, formToNewCategory, type CategoryForm } from "@/lib/category-form"
import { formatMonth, formatMonthName, formatRupiah } from "@/lib/format"
import { MONTH_BUDGET_NAME } from "@/lib/month-budget"
import { categoryTotals, categoryTransactionCount, monthTotals, pickMonth } from "@/lib/stats"
import type { Category, RestoreCategory } from "@/lib/types"
import { UNDO_FOR } from "@/lib/undo"

/** Which dialog is open. Only one ever is. */
type DialogName = "form" | "delete" | "budget" | "monthBudget" | "reorder"

const ADD_BUTTON_ID = "add-category-button"
const REORDER_BUTTON_ID = "reorder-categories-button"

/**
 * Everything under the heading on the Categories page: the expense categories and the income categories
 * with what was spent or earned in each this month, and the flows for adding, changing, budgeting,
 * reordering and deleting, and, while anything is still filed under "Other", a panel to sort it. Totals, shares and
 * comparisons between months are on the Insights page.
 * `nowIso` comes from the server so the server and the browser agree on the month.
 */
export function CategoriesView({ nowIso }: { nowIso: string }) {
  const {
    categories,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
    setCategoryBudget,
    monthlyBudget,
    setMonthlyBudget,
    reorderCategories,
  } = useData()
  // The month Home shows: this one, or the latest with activity while this one is still empty.
  const month = pickMonth(transactions, new Date(nowIso))
  const totals = categoryTotals(transactions, month)
  // Everything spent in that month, for the "Whole month" row.
  const monthSpent = monthTotals(transactions, month).spending

  const [open, setOpen] = useState<DialogName>()
  // The category the open dialog is about. Kept after it closes so its content doesn't vanish mid-fade.
  const [target, setTarget] = useState<Category>()
  // The category the form is changing (none when adding). Kept apart so the form doesn't flip to "Add" as it fades.
  const [editing, setEditing] = useState<Category>()
  // The category just added, so its row can ease in and be brought into view.
  const [newId, setNewId] = useState<string>()
  // Where keyboard focus goes when a dialog closes: the button that opened it.
  const returnFocus = useReturnFocus()
  // True from pressing Delete until the question closes: the category's row is going, so focus goes to the Add button.
  const focusAddButton = useRef(false)

  // On a phone the new row can be far down the page, so scroll to it if it isn't on screen.
  useEffect(() => {
    if (!newId) return
    const row = document.getElementById(categoryRowId(newId))
    if (!row) return
    const { top, bottom } = row.getBoundingClientRect()
    if (top >= 0 && bottom <= window.innerHeight) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    row.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" })
  }, [newId])

  function openDialog(name: DialogName, category?: Category) {
    const active = document.activeElement
    if (category && active instanceof HTMLElement && active.closest('[role="menu"]')) {
      // A menu item is about to disappear, so come back to the "more" button that opened the menu.
      returnFocus.redirect(document.getElementById(categoryMenuId(category.id)))
    } else {
      returnFocus.remember()
    }
    setTarget(category)
    if (name === "form") setEditing(category)
    setOpen(name)
  }

  /** Opens the box for the budget for the whole month, from the row's menu or from its "set a budget" button. */
  function openMonthBudget() {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.closest('[role="menu"]')) {
      // A menu item is about to disappear, so come back to the "more" button that opened the menu.
      returnFocus.redirect(document.getElementById(WHOLE_MONTH_MENU_ID))
    } else {
      returnFocus.remember()
    }
    setOpen("monthBudget")
  }

  /** The "set a budget" button gives way to the bar once there is a budget, so focus then goes to the row's "more" button. */
  function closeMonthBudgetDialog(event: Event) {
    returnFocus.restore(event)
    if (document.activeElement === document.body) document.getElementById(WHOLE_MONTH_MENU_ID)?.focus({ preventScroll: true })
  }

  const closeDialog = (isOpen: boolean) => {
    if (!isOpen) setOpen(undefined)
  }

  async function handleSave(form: CategoryForm) {
    try {
      if (editing) {
        await updateCategory(editing.id, formToChanges(form))
        toast.success("Category updated")
      } else {
        const saved = await addCategory(formToNewCategory(form))
        setNewId(saved.id)
        toast.success("Category added", { description: saved.name })
      }
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the form to stay open
    }
  }

  async function handleBudget(budget: number | null) {
    if (!target) return
    const had = target.budget !== undefined
    try {
      await setCategoryBudget(target.id, budget)
      toast.success(budget === null ? "Budget removed" : had ? "Budget changed" : "Budget set", {
        description: budget === null ? target.name : `${target.name}: ${formatRupiah(budget)} a month`,
      })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  async function handleMonthBudget(budget: number | null) {
    const had = monthlyBudget !== undefined
    try {
      await setMonthlyBudget(budget)
      toast.success(budget === null ? "Budget removed" : had ? "Budget changed" : "Budget set", {
        description: budget === null ? MONTH_BUDGET_NAME : `${MONTH_BUDGET_NAME}: ${formatRupiah(budget)} a month`,
      })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  async function handleReorder(ids: string[]) {
    try {
      await reorderCategories(ids)
      toast.success("Order saved")
    } catch (error) {
      toast.error("Couldn't save the order", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  async function handleDelete() {
    if (!target) return
    focusAddButton.current = true
    // What it takes to put it back: the category as it was, the place it had in the list, and what moved.
    const { id, name, type, icon, color, budget } = target
    try {
      const { movedTransactionIds, position } = await deleteCategory(id)
      const moved = movedTransactionIds.length
      toast.success("Category deleted", {
        description: moved === 0 ? name : `${name}. ${moved} ${moved === 1 ? "transaction" : "transactions"} moved to Other.`,
        // Long enough to notice it and change your mind, and gone after that.
        duration: UNDO_FOR,
        action: {
          label: "Undo",
          onClick: () => void undoDelete({ category: { id, name, type, icon, color, ...(budget === undefined ? {} : { budget }) }, position, transactionIds: movedTransactionIds }),
        },
      })
    } catch (error) {
      toast.error("Couldn't delete that", { description: errorMessage(error) })
    }
  }

  /** The Undo button in the "Category deleted" message: the category comes back, with its budget, its place and its transactions. */
  async function undoDelete(request: RestoreCategory) {
    try {
      const restored = await restoreCategory(request)
      setNewId(restored.id)
      toast.success("Category restored", { description: restored.name })
    } catch (error) {
      toast.error("Couldn't undo that", { description: errorMessage(error) })
    }
  }

  /** After a delete, focus goes to the Add button, because the row it was on is gone. */
  function closeDeleteDialog(event: Event) {
    if (!focusAddButton.current) return returnFocus.restore(event)
    focusAddButton.current = false
    event.preventDefault()
    document.getElementById(ADD_BUTTON_ID)?.focus({ preventScroll: true })
  }

  const sectionProps = {
    month,
    totals,
    newId,
    onEdit: (category: Category) => openDialog("form", category),
    onBudget: (category: Category) => openDialog("budget", category),
    onDelete: (category: Category) => openDialog("delete", category),
  }

  return (
    <div className="mt-4 flex flex-col gap-4 md:mt-10 md:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* The same quiet line, now at the left of the buttons, since the month switcher moved to Insights. */}
        <p className="min-w-0 flex-1 basis-64 text-sm text-muted-foreground">
          A lock means a preset. Presets come with the app, so they can&apos;t be renamed or deleted.
        </p>
        <div className="flex items-center gap-2">
          <Button
            id={REORDER_BUTTON_ID}
            variant="outline"
            size="lg"
            onClick={() => openDialog("reorder")}
            aria-label="Reorder categories"
            className="max-sm:min-w-10"
          >
            <ArrowUpDown aria-hidden />
            <span className="hidden sm:inline">Reorder</span>
          </Button>
          <Button id={ADD_BUTTON_ID} size="lg" onClick={() => openDialog("form")}>
            <Plus aria-hidden />
            Add category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:gap-6 xl:grid-cols-2">
        <CategorySection
          title="Expense categories"
          verb="Spent"
          categories={categories.filter((category) => category.type === "expense")}
          lead={<WholeMonthRow month={month} spent={monthSpent} budget={monthlyBudget} onBudget={openMonthBudget} />}
          {...sectionProps}
        />
        {/* The shorter income card leaves room under it, so "Needs a category" sits there: out of the way, since it is not urgent. */}
        <div className="flex flex-col gap-6">
          <CategorySection
            title="Income categories"
            verb="Earned"
            categories={categories.filter((category) => category.type === "income")}
            {...sectionProps}
          />
          <NeedsCategory fallbackFocusId={ADD_BUTTON_ID} />
        </div>
      </div>

      <CategoryDialog
        open={open === "form"}
        onOpenChange={closeDialog}
        editing={editing}
        onSave={handleSave}
        onCloseAutoFocus={returnFocus.restore}
      />
      <BudgetDialog
        open={open === "budget"}
        onOpenChange={closeDialog}
        subject={target ? { kind: "category", category: target } : undefined}
        spent={target ? (totals.get(target.id) ?? 0) : 0}
        monthName={formatMonthName(month)}
        onSave={handleBudget}
        onCloseAutoFocus={returnFocus.restore}
      />
      <BudgetDialog
        open={open === "monthBudget"}
        onOpenChange={closeDialog}
        subject={{ kind: "month", budget: monthlyBudget }}
        spent={monthSpent}
        monthName={formatMonthName(month)}
        onSave={handleMonthBudget}
        onCloseAutoFocus={closeMonthBudgetDialog}
      />
      <CategoryReorderDialog
        open={open === "reorder"}
        onOpenChange={closeDialog}
        onSave={handleReorder}
        onCloseAutoFocus={returnFocus.restore}
      />
      <DeleteCategoryDialog
        open={open === "delete"}
        onOpenChange={closeDialog}
        category={target}
        transactionCount={target ? categoryTransactionCount(transactions, target.id) : 0}
        onConfirm={handleDelete}
        onCloseAutoFocus={closeDeleteDialog}
      />
    </div>
  )
}

interface CategorySectionProps {
  title: string
  /** "Spent" or "Earned", for the caption. */
  verb: string
  categories: Category[]
  /** A row that comes before the categories (the "Whole month" row, on the spending card). */
  lead?: React.ReactNode
  /** The month being shown, "2026-09". */
  month: string
  /** What was spent or earned in each category this month, by category id. */
  totals: Map<string, number>
  newId?: string
  onEdit: (category: Category) => void
  onBudget: (category: Category) => void
  onDelete: (category: Category) => void
}

/** One card: the categories for spending, or the ones for income, as rows divided by hairlines. */
function CategorySection({ title, verb, categories, lead, month, totals, newId, onEdit, onBudget, onDelete }: CategorySectionProps) {
  return (
    <Panel title={title} caption={`${verb} in ${formatMonth(month)}`}>
      <ul className="divide-y">
        {lead}
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            month={month}
            amount={totals.get(category.id) ?? 0}
            isNew={category.id === newId}
            onEdit={onEdit}
            onBudget={onBudget}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </Panel>
  )
}
