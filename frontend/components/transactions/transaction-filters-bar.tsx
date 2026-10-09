"use client"

import { useRef } from "react"
import { Plus, Search, Upload, X } from "lucide-react"

import { DateRangePicker } from "@/components/date-picker"
import { CategoryOption, WalletOption, selectTriggerClasses } from "@/components/transactions/options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hasActiveFilters, type TransactionFilters } from "@/lib/transaction-filters"
import type { Category, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TransactionFiltersBarProps {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
  onClear: () => void
  onAdd: () => void
  /** Opens the box for importing a bank's CSV file. */
  onImport: () => void
  wallets: Wallet[]
  categories: Category[]
  /** Today's date, "2026-09-30", for the date presets. */
  today: string
}

/** Search, the four filters, "Clear filters", and the Add button. */
export function TransactionFiltersBar({
  filters,
  onChange,
  onClear,
  onAdd,
  onImport,
  wallets,
  categories,
  today,
}: TransactionFiltersBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const spendingCategories = categories.filter((category) => category.type === "expense")
  const incomeCategories = categories.filter((category) => category.type === "income")
  const showSpending = filters.type === "all" || filters.type === "expense"
  const showIncome = filters.type === "all" || filters.type === "income"

  function changeType(type: TransactionFilters["type"]) {
    // Keep the chosen category only while it still fits the chosen type. Transfers have no category.
    const stillFits = categories.some(
      (category) => category.id === filters.categoryId && (type === "all" || category.type === type)
    )
    onChange({ ...filters, type, categoryId: type !== "transfer" && stillFits ? filters.categoryId : "all" })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1 basis-60">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search transactions"
            placeholder="Search notes and categories"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            className="h-10 bg-card pr-11 pl-10 dark:bg-card"
          />
          {filters.search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onChange({ ...filters, search: "" })
                searchRef.current?.focus()
              }}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-foreground/[0.07] hover:text-foreground active:scale-90"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="flex w-full gap-3 sm:ml-auto sm:w-auto">
          <Button variant="outline" size="lg" onClick={onImport} className="flex-1 sm:flex-none">
            <Upload aria-hidden />
            Import CSV
          </Button>
          <Button size="lg" onClick={onAdd} className="flex-1 sm:flex-none">
            <Plus aria-hidden />
            Add transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:flex xl:flex-wrap xl:items-center">
        <DateRangePicker
          className="col-span-2 sm:col-span-1 xl:w-64"
          from={filters.from}
          to={filters.to}
          today={today}
          onChange={(from, to) => onChange({ ...filters, from, to })}
        />

        <Select value={filters.type} onValueChange={(value) => changeType(value as TransactionFilters["type"])}>
          <SelectTrigger aria-label="Filter by type" className={cn(selectTriggerClasses, "xl:w-40")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId}
          onValueChange={(categoryId) => onChange({ ...filters, categoryId })}
          disabled={filters.type === "transfer"}
        >
          <SelectTrigger aria-label="Filter by category" className={cn(selectTriggerClasses, "xl:w-52")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All categories</SelectItem>
            {showSpending ? (
              <SelectGroup>
                <SelectLabel>Spending</SelectLabel>
                {spendingCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <CategoryOption category={category} />
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            {showIncome ? (
              <SelectGroup>
                <SelectLabel>Income</SelectLabel>
                {incomeCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <CategoryOption category={category} />
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>

        <Select value={filters.walletId} onValueChange={(walletId) => onChange({ ...filters, walletId })}>
          <SelectTrigger aria-label="Filter by wallet" className={cn(selectTriggerClasses, "col-span-2 sm:col-span-1 xl:w-44")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All wallets</SelectItem>
            {wallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                <WalletOption wallet={wallet} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters(filters) ? (
          <Button variant="ghost" size="lg" onClick={onClear} className="col-span-2 sm:col-span-1 xl:col-span-1">
            <X aria-hidden />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}
