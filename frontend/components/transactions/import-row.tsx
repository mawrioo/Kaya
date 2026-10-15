"use client"

import { memo } from "react"
import { CircleAlert } from "lucide-react"

import { NativeSelect } from "@/components/native-select"
import { formatDate, formatRupiah } from "@/lib/format"
import type { ReviewRow, TransferSuggestion } from "@/lib/bank-csv"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ImportRowProps {
  row: ReviewRow
  categories: Category[]
  onTransfer: (id: number, transfer?: TransferSuggestion) => void
  onToggle: (id: number, include: boolean) => void
  onCategory: (id: number, categoryId: string) => void
}

/**
 * One line of the bank's file, in the list the owner checks before anything is saved: a tick, what it says, the amount, and
 * the category it will be filed under. A line the app already has, or one that couldn't be read, says so and starts unticked.
 */
export const ImportRow = memo(function ImportRow({ row, categories, onToggle, onCategory, onTransfer }: ImportRowProps) {
  const unreadable = !!row.problem
  const choices = categories.filter((category) => category.type === row.type)
  const amount = row.amount === null ? "" : formatRupiah(row.amount, { sign: "always" })
  const name = row.note || "No description"

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2 border-t px-4 py-3 first:border-t-0">
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
        {!unreadable && !!row.transferSuggestions?.length ? (
          <div className="mt-2 grid max-w-72 gap-1.5">
            <label htmlFor={`transfer-${row.id}`} className="text-xs font-medium text-muted-foreground">Possible transfer · review</label>
            <NativeSelect
              id={`transfer-${row.id}`}
              aria-label={`Record ${name} as`}
              value={row.transfer ? row.transfer.transactionId ?? row.transfer.walletId : ""}
              onChange={(event) => onTransfer(row.id, row.transferSuggestions?.find((entry) => (entry.transactionId ?? entry.walletId) === event.target.value))}
            >
              <option value="">{row.type === "income" ? "Keep as income" : "Keep as spending"}</option>
              {row.transferSuggestions.map((entry, index) => (
                <option key={entry.transactionId ?? entry.walletId} value={entry.transactionId ?? entry.walletId}>
                  Transfer {row.type === "expense" ? "to" : "from"} {entry.walletName}{entry.transactionId ? ` · ${entry.description || `line ${index + 1}`}` : ""}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground wrap-anywhere">
              {row.transfer ? row.transfer.transactionId
                ? `Replaces “${row.transfer.description || "No description"}” in ${row.transfer.walletName}; its balance stays the same.`
                : `Also ${row.type === "expense" ? "adds" : "takes"} ${formatRupiah(Math.abs(row.amount ?? 0))} ${row.type === "expense" ? "into" : "from"} ${row.transfer.walletName}.`
                : "A wallet name or a matching amount and day suggests this. Choose only if the money moved between your wallets."}
            </p>
          </div>
        ) : null}
        {unreadable || row.transfer ? null : (
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
          "col-start-2 font-medium whitespace-nowrap tabular-nums sm:col-start-3 sm:row-start-1",
          !row.include ? "text-muted-foreground" : row.transfer ? "text-foreground" : row.type === "income" ? "text-positive" : "text-negative"
        )}
      >
        {amount}
      </p>
    </li>
  )
})
