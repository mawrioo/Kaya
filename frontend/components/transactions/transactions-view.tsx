"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { LedgerArt } from "@/components/illustrations/ledger"
import { MagnifierArt } from "@/components/illustrations/magnifier"
import { TagArt } from "@/components/illustrations/tag"
import { WalletArt } from "@/components/illustrations/wallet"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog"
import { TransactionDialog } from "@/components/transactions/transaction-dialog"
import { TransactionFiltersBar } from "@/components/transactions/transaction-filters-bar"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Button } from "@/components/ui/button"
import { useReturnFocus } from "@/hooks/use-return-focus"
import { errorMessage } from "@/lib/api"
import { monthDates, toDateInput, yearDates } from "@/lib/dates"
import { formatRupiah } from "@/lib/format"
import { describeTransaction } from "@/lib/stats"
import { UNDO_FOR } from "@/lib/undo"
import {
  NO_FILTERS,
  emptyScope,
  filterTransactions,
  groupByDay,
  hasActiveFilters,
  sortNewestFirst,
  type EmptyScope,
  type TransactionFilters,
} from "@/lib/transaction-filters"
import type { NewTransaction, Transaction, TransactionType } from "@/lib/types"

/** How many transactions show at first, and how many more each press of "Load more" adds. */
const PAGE_SIZE = 30

/**
 * The whole Transactions page under its heading: search and filters, the list
 * grouped by day, and the add, edit and delete flows. `nowIso` comes from the
 * server so the server and the browser agree on what "today" is.
 */
export function TransactionsView({
  nowIso,
  initialWalletId,
  initialCategoryId,
  initialType,
  initialMonth,
  initialYear,
}: {
  nowIso: string
  initialWalletId?: string
  /** Arriving from a category on the Categories page: only its transactions... */
  initialCategoryId?: string
  /** ...or from the "Whole month" budget: only spending (or only income, or only transfers). */
  initialType?: TransactionType
  /** ...and only those of this month, "2026-09", so the list adds up to the number that was clicked. */
  initialMonth?: string
  /** Or of a whole year, "2026" (from the Year view on Insights). A month wins if both are given. */
  initialYear?: string
}) {
  const { wallets, categories, transactions, addTransaction, updateTransaction, deleteTransaction, undoDelete } = useData()

  // Arriving from a wallet card starts with that wallet's transactions, and from a category with that category's (for a month).
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    ...NO_FILTERS,
    walletId: initialWalletId && wallets.some((wallet) => wallet.id === initialWalletId) ? initialWalletId : "all",
    categoryId: initialCategoryId && categories.some((category) => category.id === initialCategoryId) ? initialCategoryId : "all",
    type: initialType ?? "all",
    ...(initialMonth ? monthDates(initialMonth) : initialYear ? yearDates(initialYear) : {}),
  }))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Transaction>()
  const [lastWalletId, setLastWalletId] = useState<string>()
  const [limit, setLimit] = useState(PAGE_SIZE)
  // The transaction just saved, so the list can make sure it is on screen even if it is an old one.
  const [revealId, setRevealId] = useState<string>()
  // The transaction being deleted, so its row can slide out.
  const [leavingId, setLeavingId] = useState<string>()
  // Where keyboard focus goes when a dialog closes: the button that opened it, or after a delete, the next row.
  const returnFocus = useReturnFocus()

  // Work out which transactions are new since the data last changed, so only those slide in.
  // (Setting state while rendering, guarded like this, is React's way of deriving it from changing data.)
  const currentIds = transactions.map((tx) => tx.id)
  const [seenIds, setSeenIds] = useState(() => new Set(currentIds))
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(() => new Set())
  if (currentIds.some((id) => !seenIds.has(id))) {
    setFreshIds(new Set(currentIds.filter((id) => !seenIds.has(id))))
    setSeenIds(new Set(currentIds))
  }

  const matching = sortNewestFirst(filterTransactions(transactions, filters, wallets, categories))
  const revealIndex = revealId ? matching.findIndex((tx) => tx.id === revealId) : -1
  const shownCount = Math.min(matching.length, Math.max(limit, revealIndex + 1))
  const groups = groupByDay(matching.slice(0, shownCount))
  const filtered = hasActiveFilters(filters)
  const total = transactions.length

  const summary = filtered
    ? shownCount < matching.length
      ? `Showing ${shownCount} of ${matching.length} matching transactions`
      : `Showing ${matching.length} of ${total} transactions`
    : shownCount < total
      ? `Showing ${shownCount} of ${total} transactions`
      : `${total} ${total === 1 ? "transaction" : "transactions"}`

  /** Every change to the filters starts the list again from the newest. */
  function updateFilters(next: TransactionFilters) {
    setFilters(next)
    setLimit(PAGE_SIZE)
    setRevealId(undefined)
  }

  function openAdd() {
    returnFocus.remember()
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(tx: Transaction) {
    returnFocus.remember()
    setEditing(tx)
    setFormOpen(true)
  }

  function openDelete(tx: Transaction) {
    returnFocus.remember()
    setDeleting(tx)
    setDeleteOpen(true)
  }

  /** "−Rp 215.000 · Food & drinks": a short recap for the toast, so a typo is easy to spot. */
  function recap(tx: Transaction): string {
    const { categoryName } = describeTransaction(tx, wallets, categories)
    const amount =
      tx.type === "income"
        ? formatRupiah(tx.amount, { sign: "always" })
        : tx.type === "expense"
          ? formatRupiah(-tx.amount)
          : formatRupiah(tx.amount)
    return `${amount} · ${categoryName}`
  }

  async function handleSave(input: NewTransaction, original?: Transaction) {
    try {
      if (original) {
        const { transaction: saved } = await updateTransaction(original.id, input)
        setRevealId(saved.id)
        toast.success("Transaction updated", { description: recap(saved) })
      } else {
        const { transaction: saved } = await addTransaction(input)
        setRevealId(saved.id)
        toast.success("Transaction added", { description: recap(saved) })
      }
      setLastWalletId(input.type === "transfer" ? input.fromWalletId : input.walletId)
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the form to stay open
    }
  }

  async function handleDelete() {
    if (!deleting) return
    // The row is about to disappear, so hand focus to its neighbour's edit button.
    const shown = groups.flatMap((group) => group.items)
    const at = shown.findIndex((tx) => tx.id === deleting.id)
    const neighbour = shown[at + 1] ?? shown[at - 1]
    const neighbourButton = neighbour ? document.getElementById(`edit-${neighbour.id}`) : null
    returnFocus.redirect(neighbourButton)
    setDeleteOpen(false)
    setLeavingId(deleting.id)
    const gone = deleting
    try {
      const { undoId } = await deleteTransaction(gone.id)
      toast.success("Transaction deleted", {
        description: recap(gone),
        // Long enough to notice it and change your mind, and gone after that.
        duration: UNDO_FOR,
        action: { label: "Undo", onClick: () => void undoTransactionDelete(undoId, gone) },
      })
    } catch (error) {
      toast.error("Couldn't delete that", { description: errorMessage(error) })
    } finally {
      setLeavingId(undefined)
    }
  }

  /** The Undo button in the "Transaction deleted" message: it comes back as a new row, which eases in and is brought into view. */
  async function undoTransactionDelete(undoId: string, gone: Transaction) {
    // The list slides in what it hasn't seen before, so forget that it has seen this one.
    setSeenIds((seen) => {
      const next = new Set(seen)
      next.delete(gone.id)
      return next
    })
    try {
      const result = await undoDelete(undoId)
      if (result.kind !== "transaction") return
      setRevealId(result.transaction.id)
      toast.success("Transaction restored", { description: recap(result.transaction) })
    } catch (error) {
      toast.error("Couldn't undo that", { description: errorMessage(error) })
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-6 md:mt-10">
      <TransactionFiltersBar
        filters={filters}
        onChange={updateFilters}
        onClear={() => updateFilters(NO_FILTERS)}
        onAdd={openAdd}
        wallets={wallets}
        categories={categories}
        today={toDateInput(new Date(nowIso))}
      />

      <p aria-live="polite" className="-mb-2 text-sm text-muted-foreground">
        {summary}
      </p>

      {groups.length > 0 ? (
        <TransactionList
          groups={groups}
          wallets={wallets}
          categories={categories}
          today={toDateInput(new Date(nowIso))}
          freshIds={freshIds}
          leavingId={leavingId}
          onEdit={openEdit}
          onDelete={openDelete}
        />
      ) : (
        <EmptyState
          hasAny={transactions.length > 0}
          scope={emptyScope(filters, wallets, categories)}
          onClear={() => updateFilters(NO_FILTERS)}
          onAdd={openAdd}
        />
      )}

      {shownCount < matching.length ? (
        <div className="flex justify-center">
          <Button variant="outline" size="lg" onClick={() => setLimit(shownCount + PAGE_SIZE)}>
            Load more
            <span className="text-muted-foreground">({matching.length - shownCount} left)</span>
          </Button>
        </div>
      ) : null}

      <TransactionDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        defaultWalletId={lastWalletId ?? wallets[0]?.id ?? ""}
        onSave={handleSave}
        onCloseAutoFocus={returnFocus.restore}
      />
      <DeleteTransactionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transaction={deleting}
        wallets={wallets}
        categories={categories}
        onConfirm={handleDelete}
        onCloseAutoFocus={returnFocus.restore}
      />
    </div>
  )
}

/**
 * Shown when there is nothing to list: no matches, no transactions at all, or (when the owner opened a wallet or a
 * category from its link and nothing else is filtered) a wallet or category with nothing in it.
 */
function EmptyState({
  hasAny,
  scope,
  onClear,
  onAdd,
}: {
  hasAny: boolean
  scope?: EmptyScope
  onClear: () => void
  onAdd: () => void
}) {
  if (hasAny && scope) {
    const isWallet = scope.kind === "wallet"
    return (
      <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
        {isWallet ? <WalletArt className="w-44" /> : <TagArt className="w-44" />}
        <h2 className="type-title mt-3 wrap-anywhere">
          Nothing in {scope.name} {scope.kind === "category" && scope.period ? `in ${scope.period}` : "yet"}
        </h2>
        <p className="mt-2 max-w-[42ch] text-muted-foreground">
          {isWallet
            ? "Add a transaction, or move some money here, and it will show up in this list."
            : "Anything you file under it will show up in this list."}
        </p>
        <div className="mt-6">
          {isWallet ? (
            <Button size="lg" onClick={onAdd}>
              <Plus aria-hidden />
              Add transaction
            </Button>
          ) : (
            <Button variant="secondary" size="lg" onClick={onClear}>
              Show every transaction
            </Button>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
      {hasAny ? <MagnifierArt className="w-44" /> : <LedgerArt className="w-44" />}
      <h2 className="type-title mt-3">{hasAny ? "Nothing matches these filters" : "No transactions yet"}</h2>
      <p className="mt-2 max-w-[42ch] text-muted-foreground">
        {hasAny
          ? "Try a different search, or clear the filters to see everything again."
          : "Add your first one to start seeing where your money goes."}
      </p>
      <div className="mt-6">
        {hasAny ? (
          <Button variant="secondary" size="lg" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button size="lg" onClick={onAdd}>
            <Plus aria-hidden />
            Add transaction
          </Button>
        )}
      </div>
    </div>
  )
}
