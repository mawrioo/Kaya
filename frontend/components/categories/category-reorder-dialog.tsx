"use client"

import { useEffect, useRef, useState } from "react"
import { Reorder, useDragControls } from "motion/react"
import { ChevronDown, ChevronUp, GripVertical, Lock } from "lucide-react"

import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { icons } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import type { Category, CategoryType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategoryReorderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Saves the new order, as every category id (spending first, then income). Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (ids: string[]) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/** The categories in two simple lists, spending and income, to drag into a new order. Nothing is saved until "Save order". */
export function CategoryReorderDialog({ open, onOpenChange, onSave, onCloseAutoFocus }: CategoryReorderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* Mounted only while open, so it always starts from the current order. */}
        <ReorderBody
          onCancel={() => onOpenChange(false)}
          onSave={async (ids) => {
            await onSave(ids)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

const LISTS: { type: CategoryType; title: string }[] = [
  { type: "expense", title: "Expense categories" },
  { type: "income", title: "Income categories" },
]

function ReorderBody({ onCancel, onSave }: { onCancel: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const { categories } = useData()
  const [order, setOrder] = useState<Record<CategoryType, Category[]>>(() => ({
    expense: categories.filter((category) => category.type === "expense"),
    income: categories.filter((category) => category.type === "income"),
  }))
  const [saving, setSaving] = useState(false)

  const changed = LISTS.some(({ type }) => {
    const current = categories.filter((category) => category.type === type)
    return order[type].some((category, i) => category.id !== current[i]?.id)
  })
  // Which arrow was just pressed, so keyboard focus can follow the row to its new place.
  const pressed = useRef<{ id: string; by: -1 | 1 }>(null)

  /** The arrow buttons: the same job as dragging, for the keyboard and for precise taps. */
  function move(type: CategoryType, from: number, by: -1 | 1) {
    const list = order[type]
    const to = from + by
    if (to < 0 || to >= list.length) return
    const next = [...list]
    pressed.current = { id: list[from].id, by }
    next.splice(to, 0, ...next.splice(from, 1))
    setOrder((current) => ({ ...current, [type]: next }))
  }

  // Moving a row takes it out of the page and puts it back, which drops keyboard focus. Put it back on the
  // same arrow, or on the opposite one when the row has reached the end of the list and that arrow is now off.
  useEffect(() => {
    const last = pressed.current
    if (!last) return
    pressed.current = null
    const same = document.getElementById(arrowId(last.id, last.by)) as HTMLButtonElement | null
    const other = document.getElementById(arrowId(last.id, last.by === -1 ? 1 : -1)) as HTMLButtonElement | null
    ;(same && !same.disabled ? same : other)?.focus()
  }, [order])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave([...order.expense, ...order.income].map((category) => category.id))
    } catch {
      // The page has already explained what went wrong. Stay open so the new order isn't lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="type-title">Reorder categories</DialogTitle>
        <DialogDescription>
          Drag the handle, or use the arrows. This is the order here and in every list of categories. Presets can
          move too, so &quot;Other&quot; can go last.
        </DialogDescription>
      </DialogHeader>

      {LISTS.map(({ type, title }) => (
        <section key={type} aria-label={title} className="grid grid-cols-1 gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <Reorder.Group
            axis="y"
            values={order[type]}
            onReorder={(next) => setOrder((current) => ({ ...current, [type]: next }))}
            className="grid grid-cols-1 gap-2"
          >
            {order[type].map((category, index) => (
              <ReorderRow
                key={category.id}
                category={category}
                isFirst={index === 0}
                isLast={index === order[type].length - 1}
                onMove={(by) => move(type, index, by)}
              />
            ))}
          </Reorder.Group>
        </section>
      ))}

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="lg" disabled={!changed || saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save order"}
        </Button>
      </DialogFooter>
    </>
  )
}

/** The DOM id of a row's up (-1) or down (1) arrow. */
const arrowId = (categoryId: string, by: -1 | 1) => `move-${categoryId}-${by === -1 ? "up" : "down"}`

function ReorderRow({
  category,
  isFirst,
  isLast,
  onMove,
}: {
  category: Category
  isFirst: boolean
  isLast: boolean
  onMove: (by: -1 | 1) => void
}) {
  // Only the handle starts a drag, so the rest of the row (and the page) can still be scrolled by touch.
  const controls = useDragControls()
  const Icon = icons[category.icon]
  const palette = paletteClasses[category.color]

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-lg border bg-card p-2 pr-1 shadow-xs"
      whileDrag={{ scale: 1.02, boxShadow: "0 10px 28px -8px rgb(31 61 43 / 0.25)" }}
    >
      <button
        type="button"
        aria-label={`Drag ${category.name} to a new place`}
        onPointerDown={(event) => controls.start(event)}
        className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.07] hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-[1.125rem]" aria-hidden />
      </button>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", palette.soft, palette.icon)}>
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 font-medium break-words">
        {category.name}
        {category.preset ? <Lock className="ml-1.5 inline size-3.5 align-[-0.1em] text-muted-foreground" aria-hidden /> : null}
      </span>
      <Button
        id={arrowId(category.id, -1)}
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label={`Move ${category.name} up`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="size-[1.125rem]" aria-hidden />
      </Button>
      <Button
        id={arrowId(category.id, 1)}
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label={`Move ${category.name} down`}
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="size-[1.125rem]" aria-hidden />
      </Button>
    </Reorder.Item>
  )
}
