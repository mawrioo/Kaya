import { ArrowLeftRight, Shapes } from "lucide-react"

import { formatDate, formatRupiah } from "@/lib/format"
import { icons } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import { describeTransaction } from "@/lib/stats"
import type { Category, Transaction, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TransactionRowContentProps {
  tx: Transaction
  wallets: Wallet[]
  categories: Category[]
  /** Show the date on the second line. Turn off where a heading already gives the day. */
  showDate?: boolean
  /**
   * Small buttons for the second line, on the right, instead of the date. They
   * are hidden on touch screens, where the row is swiped instead.
   */
  actions?: React.ReactNode
}

/**
 * The inside of one line of money moving. Line one: what it was and the
 * amount. Line two: where it belongs and when. Income is green with "+",
 * spending is red with "−", and a transfer between your own wallets is
 * neutral. Without a note the category name stands in as the title.
 */
export function TransactionRowContent({
  tx,
  wallets,
  categories,
  showDate = true,
  actions,
}: TransactionRowContentProps) {
  const { category, categoryName, walletLabel, title } = describeTransaction(tx, wallets, categories)

  const Icon = category ? icons[category.icon] : tx.type === "transfer" ? ArrowLeftRight : Shapes
  const badge = category
    ? cn(paletteClasses[category.color].soft, paletteClasses[category.color].icon)
    : "bg-muted text-muted-foreground"

  const amount =
    tx.type === "income"
      ? { text: formatRupiah(tx.amount, { sign: "always" }), className: "text-positive" }
      : tx.type === "expense"
        ? { text: formatRupiah(-tx.amount), className: "text-negative" }
        : { text: formatRupiah(tx.amount, { sign: "never" }), className: "text-muted-foreground" }

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <span className={cn("grid size-8 md:size-10 shrink-0 place-items-center rounded-full", badge)}>
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 font-medium wrap-anywhere">{title}</p>
          <p className={cn("shrink-0 font-medium whitespace-nowrap tabular-nums", amount.className)}>
            {amount.text}
          </p>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
          {/* The wallet (or "BCA → Pluang") wraps as one piece when it can, so the arrow never starts a line. */}
          <p className="min-w-0 wrap-anywhere">
            {tx.description.trim() ? <>{categoryName} · </> : null}
            <span className="inline-block max-w-full">{walletLabel}</span>
          </p>
          {showDate ? <p className="shrink-0 whitespace-nowrap tabular-nums">{formatDate(tx.date)}</p> : null}
          {actions ? (
            // With a mouse the buttons appear when the row is pointed at, or when one of them has the keyboard.
            <div className="row-actions -my-2 -mr-2 flex shrink-0 items-center self-center pointer-coarse:hidden">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** A row in a plain list, such as Home's recent transactions. */
export function TransactionRow(props: TransactionRowContentProps) {
  return (
    <li className="py-2.5 md:py-3.5 first:pt-0 last:pb-0">
      <TransactionRowContent {...props} />
    </li>
  )
}
