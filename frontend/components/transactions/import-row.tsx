"use client"

import { memo } from "react"
import { CircleAlert } from "lucide-react"

import { NativeSelect } from "@/components/native-select"
import { formatDate, formatRupiah } from "@/lib/format"
import type { ReviewRow } from "@/lib/bank-csv"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ImportRowProps {
  row: ReviewRow
  categories: Category[]
  onToggle: (id: number, include: boolean) => void
  onCategory: (id: number, categoryId: string) => void
}

/**
 * One line of the bank's file, in the list the owner checks before anything is saved: a tick, what it says, the amount, and
 * the category it will be filed under. A line the app already has, or one that couldn't be read, says so and starts unticked.
 */
export const ImportRow = memo(function ImportRow({ row, categories, onToggle, onCategory }: ImportRowProps) {
  const unreadable = !!row.problem
  const choices = categories.filter((category) => category.type === row.type)
  const amount = row.amount === null ? "" : formatRupiah(row.amount, { sign: "always" })
  const name = row.note || "No description"

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2 border-t px-4 py-3 first:border-t-0">
      <input
        type="checkbox"
        checked={row.include}
        disabled={unreadable}
        onChange={(event) => onToggle(row.id, event.target.checked)}
        aria-label={unreadable ? `${name}, can't be imported` : `Import ${name}${amount ? `, ${amount}` : ""}`}
        className="tap-area mt-0.5 size-[1.125rem] cursor-pointer self-start accent-primary disabled:cursor-not-allowed"
      />

      <div className="min-w-0">
        <p className={cn("font-medium wrap-anywhere", !row.include && "text-muted-foreground")}>{name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {row.date ? <span className="tabular-nums">{formatDate(row.date)}</span> : null}
          {row.duplicate ? (
            <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-medium text-sand-foreground">Already in Kaya</span>
          ) : null}
          {row.problem ? (
            <span className="flex items-center gap-1 text-negative">
              <CircleAlert className="size-3.5 shrink-0" aria-hidden />
              {row.problem} <span className="text-muted-foreground">Line {row.line}.</span>
            </span>
          ) : null}
        </p>
        {unreadable ? null : (
          <div className="mt-2 max-w-72">
            <NativeSelect aria-label={`Category for ${name}`} value={row.categoryId} onChange={(event) => onCategory(row.id, event.target.value)}>
              {choices.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
            {row.basedOn && row.include ? (
              <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">From your earlier &ldquo;{row.basedOn}&rdquo;.</p>
            ) : null}
          </div>
        )}
      </div>

      <p
        className={cn(
          "font-medium whitespace-nowrap tabular-nums",
          !row.include ? "text-muted-foreground" : row.type === "income" ? "text-positive" : "text-negative"
        )}
      >
        {amount}
      </p>
    </li>
  )
})
