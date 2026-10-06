"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { Panel } from "@/components/panel"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { errorMessage } from "@/lib/api"
import { formatDate, formatRupiah } from "@/lib/format"
import { icons } from "@/lib/icons"
import { inOther } from "@/lib/insights"
import { paletteClasses } from "@/lib/palette"
import { describeTransaction } from "@/lib/stats"
import type { Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

/** More than this are left for the Transactions page, so the panel never grows tall. */
const MOST_SHOWN = 5

/**
 * What is still filed under "Other", newest first, with a button on each to choose where it belongs. Choosing one files
 * it there at once (the amount and wallet don't change) and the row goes. It is only here while something is in "Other":
 * with nothing there, nothing is shown. It sits under the income categories on the Categories page, as it is not urgent.
 * `fallbackFocusId` is the button that takes keyboard focus once the last row is gone.
 */
export function NeedsCategory({ fallbackFocusId }: { fallbackFocusId: string }) {
  const { transactions, categories, wallets, updateTransaction } = useData()
  const waiting = inOther(transactions, categories)
  const [savingId, setSavingId] = useState<string>()
  const list = useRef<HTMLUListElement>(null)
  if (waiting.length === 0) return null

  const others = new Set(categories.filter((category) => category.preset && category.name === "Other").map((category) => category.id))
  const shown = waiting.slice(0, MOST_SHOWN)
  const leftOver = waiting.length - shown.length
  const otherOf = (type: "expense" | "income") => categories.find((category) => category.preset && category.name === "Other" && category.type === type)

  async function move(tx: Transaction, category: Category) {
    if (tx.type === "transfer") return
    const { title, walletLabel } = describeTransaction(tx, wallets, categories)
    // Where focus goes once this row is gone: the next row's button, or the last one's.
    const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>("button[data-move]") ?? [])]
    const place = buttons.findIndex((button) => button.dataset.move === tx.id)
    setSavingId(tx.id)
    try {
      const { id, ...rest } = tx
      await updateTransaction(id, { ...rest, categoryId: category.id })
      toast.success(`Moved to ${category.name}`, {
        description: `${title} · ${tx.type === "income" ? formatRupiah(tx.amount, { sign: "always" }) : formatRupiah(-tx.amount)} · ${walletLabel}`,
      })
      requestAnimationFrame(() => {
        const left = [...(list.current?.querySelectorAll<HTMLButtonElement>("button[data-move]") ?? [])]
        const target = left[Math.min(Math.max(place, 0), left.length - 1)]
        // Nothing left in this panel: the Add button, as after deleting a category.
        ;(target ?? document.getElementById(fallbackFocusId))?.focus()
      })
    } catch (error) {
      toast.error("Couldn't move that", { description: errorMessage(error) })
    } finally {
      setSavingId(undefined)
    }
  }

  return (
    <Panel title="Needs a category" caption="These are in “Other”. Choose where each one belongs.">
      <ul ref={list} className="divide-y" data-slot="needs-list">
        {shown.map((tx) => {
          if (tx.type === "transfer") return null
          const { category, title, walletLabel } = describeTransaction(tx, wallets, categories)
          const Icon = category ? icons[category.icon] : icons.tag
          const palette = category ? paletteClasses[category.color] : undefined
          const choices = categories.filter((entry) => entry.type === tx.type && !others.has(entry.id))

          return (
            <li key={tx.id} data-slot="needs-row" className="@container flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", palette ? [palette.soft, palette.icon] : "bg-muted text-muted-foreground")}>
                <Icon className="size-[1.125rem]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-2">
                <div className="flex flex-col @md:flex-row @md:items-baseline @md:justify-between @md:gap-4">
                  <p data-slot="needs-title" className="min-w-0 font-medium break-words">
                    {title}
                  </p>
                  <p data-slot="needs-amount" className={cn("shrink-0 font-medium whitespace-nowrap tabular-nums", tx.type === "income" ? "text-positive" : "text-negative")}>
                    {tx.type === "income" ? formatRupiah(tx.amount, { sign: "always" }) : formatRupiah(-tx.amount)}
                  </p>
                </div>
                <p data-slot="needs-meta" className="mt-0.5 text-sm text-muted-foreground">
                  {formatDate(tx.date)} {"·"} {walletLabel}
                </p>
                <div className="mt-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-move={tx.id}
                        disabled={savingId === tx.id}
                        aria-label={`Choose a category for ${title}, ${formatDate(tx.date)}`}
                      >
                        Choose category
                        <ChevronDown aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[min(18rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto">
                      {choices.map((choice) => {
                        const ChoiceIcon = icons[choice.icon]
                        return (
                          <DropdownMenuItem key={choice.id} onSelect={() => void move(tx, choice)}>
                            <ChoiceIcon className={paletteClasses[choice.color].icon} aria-hidden />
                            {choice.name}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {leftOver > 0 ? (
        <p data-slot="needs-more" className="mt-4 border-t pt-4 text-sm text-muted-foreground">
          {leftOver} more in Other.{" "}
          {(["expense", "income"] as const).flatMap((type) => {
            const other = otherOf(type)
            const count = waiting.slice(MOST_SHOWN).filter((tx) => tx.type !== "transfer" && tx.categoryId === other?.id).length
            return other && count > 0
              ? [
                  <Link key={type} href={`/transactions?category=${encodeURIComponent(other.id)}`} className="mr-3 font-medium text-primary underline underline-offset-4">
                    See {type === "expense" ? "spending" : "income"} in Transactions
                  </Link>,
                ]
              : []
          })}
        </p>
      ) : null}
    </Panel>
  )
}
