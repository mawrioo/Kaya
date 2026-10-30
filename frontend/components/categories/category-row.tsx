"use client"

import { useRef } from "react"
import Link from "next/link"
import { Ellipsis, Gauge, Lock, Pencil, Trash2 } from "lucide-react"

import { BudgetBar } from "@/components/categories/budget-bar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRupiah } from "@/lib/format"
import { icons } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The id of a category's "more" button, so a dialog opened from its menu can hand keyboard focus back to it. */
export const categoryMenuId = (categoryId: string) => `category-menu-${categoryId}`

/** The id of a category's row, so a newly added one can be scrolled into view. */
export const categoryRowId = (categoryId: string) => `category-row-${categoryId}`

interface CategoryRowProps {
  category: Category
  /** The month being shown, "2026-09". The row is a link to that month's transactions in this category. */
  month: string
  /** What was spent (or earned) in it during that month. */
  amount: number
  /** True for a category that was just added, so it eases in. */
  isNew?: boolean
  onEdit: (category: Category) => void
  onBudget: (category: Category) => void
  onDelete: (category: Category) => void
}

/**
 * One category: its icon in its colour, its name, and what was spent (or earned) in it that month.
 * Spending is clay with "−" and income is green with "+", like everywhere else. A spending category
 * with a budget also shows how far through it the month has come. The totals, shares and
 * comparisons live on the Insights page. The whole row is a link to the transactions behind the
 * number; the menu sits above that link so it works on its own.
 */
export function CategoryRow({ category, month, amount, isNew, onEdit, onBudget, onDelete }: CategoryRowProps) {
  const Icon = icons[category.icon]
  const palette = paletteClasses[category.color]
  // A preset has nothing to edit or delete, but a spending preset can still have a budget.
  const hasMenu = !category.preset || category.type === "expense"

  const money =
    amount === 0
      ? { text: formatRupiah(0), className: "text-muted-foreground" }
      : category.type === "income"
        ? { text: formatRupiah(amount, { sign: "always" }), className: "font-medium text-positive" }
        : { text: formatRupiah(-amount), className: "font-medium text-negative" }

  return (
    <li
      id={categoryRowId(category.id)}
      className={cn(
        "group @container relative flex items-start gap-2 py-2 md:gap-3 md:py-3 first:pt-0 last:pb-0 sm:gap-4",
        isNew && "animate-in duration-500 fade-in-0 slide-in-from-bottom-3"
      )}
    >
      <span className={cn("coin-rim grid size-7 md:size-10 shrink-0 place-items-center rounded-full", palette.soft, palette.icon)}>
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>

      {/* The top padding puts the first line level with the middle of the badge. */}
      <div className="min-w-0 flex-1 pt-1 md:pt-2">
        {/* The amount sits at the right of the name when the row is wide enough for both, and under it when it isn't (a phone, or a narrow card), so a name never breaks in the middle of a word. */}
        <div className="flex flex-row items-baseline justify-between gap-2 md:flex-col md:items-stretch @md:flex-row @md:items-baseline @md:justify-between @md:gap-4">
          <p data-slot="category-name" className="min-w-0 font-medium wrap-anywhere">
            <Link
              href={`/transactions?category=${encodeURIComponent(category.id)}&month=${month}`}
              className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
            >
              {category.name}
            </Link>
            {category.preset ? (
              <span className="ml-1.5 inline-block align-baseline" title="Preset: it can't be renamed or deleted">
                <Lock className="inline size-3.5 align-[-0.1em] text-muted-foreground" aria-hidden />
                <span className="sr-only">Preset. It can&apos;t be renamed or deleted.</span>
              </span>
            ) : null}
          </p>
          <p data-slot="category-amount" className="shrink-0 whitespace-nowrap tabular-nums">
            <span className={money.className}>{money.text}</span>
          </p>
        </div>

        {category.budget === undefined ? null : <BudgetBar name={category.name} spent={amount} budget={category.budget} />}
      </div>

      {/* The slot is always 40px wide, so amounts line up whether a row has a menu or not. Negative margins let the round button bleed into the padding. */}
      <div className="relative z-10 -mr-2 size-11 md:size-10 shrink-0">
        {hasMenu ? <CategoryMenu category={category} onEdit={onEdit} onBudget={onBudget} onDelete={onDelete} /> : null}
      </div>
    </li>
  )
}

/** Everything you can do with a category, behind one round "more" button. A preset can only be given a budget. */
function CategoryMenu({
  category,
  onEdit,
  onBudget,
  onDelete,
}: Pick<CategoryRowProps, "category" | "onEdit" | "onBudget" | "onDelete">) {
  // When an item opens a dialog, the dialog takes the keyboard focus instead of the menu handing it back to its button.
  const chose = useRef(false)
  const choose = (action: () => void) => () => {
    chose.current = true
    action()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={categoryMenuId(category.id)}
          variant="ghost"
          size="icon-lg"
          className="rounded-full text-muted-foreground hover:bg-foreground/[0.07] aria-expanded:bg-foreground/[0.07]"
          aria-label={`More options for ${category.name}`}
        >
          <Ellipsis className="size-[1.125rem]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => {
          if (!chose.current) return
          event.preventDefault()
          chose.current = false
        }}
      >
        {category.preset ? null : (
          <DropdownMenuItem onSelect={choose(() => onEdit(category))}>
            <Pencil aria-hidden />
            Edit category
          </DropdownMenuItem>
        )}
        {category.type === "expense" ? (
          <DropdownMenuItem onSelect={choose(() => onBudget(category))}>
            <Gauge aria-hidden />
            {category.budget === undefined ? "Set monthly budget" : "Change monthly budget"}
          </DropdownMenuItem>
        ) : null}
        {category.preset ? null : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={choose(() => onDelete(category))}>
              <Trash2 aria-hidden />
              Delete category
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
