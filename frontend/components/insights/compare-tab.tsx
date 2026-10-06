"use client"

import { ChevronDown } from "lucide-react"

import { useData } from "@/components/data-provider"
import { Panel } from "@/components/panel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { changeText } from "@/lib/category-summary"
import { formatMonth, formatRupiah } from "@/lib/format"
import { compareCategories } from "@/lib/insights"
import type { CompareWith } from "@/lib/insights-address"
import { monthTotals, shiftMonth } from "@/lib/stats"
import { cn } from "@/lib/utils"

type Kind = "expense" | "income" | "net"

/** An amount the way the rest of the app writes it: spending in clay with "−", income in green with "+", and a muted "Rp 0". */
function amountCell(kind: Kind, amount: number): { text: string; className: string } {
  if (amount === 0) return { text: formatRupiah(0), className: "text-muted-foreground" }
  if (kind === "income") return { text: formatRupiah(amount, { sign: "always" }), className: "text-positive" }
  if (kind === "expense") return { text: formatRupiah(-amount), className: "text-negative" }
  return { text: formatRupiah(amount), className: amount > 0 ? "text-positive" : "text-negative" }
}

/** The month a choice stands for: the one before, the same one a year earlier, or the month itself. */
export function compareMonth(month: string, mode: CompareWith): string {
  return mode === "before" ? shiftMonth(month, -1) : mode === "year" ? shiftMonth(month, -12) : mode
}

interface CompareTabProps {
  month: string
  bounds: { first: string; last: string }
  mode: CompareWith
  onChooseMode: (mode: CompareWith) => void
}

/**
 * The Compare view of Insights: the chosen month beside another one (the month before, the same month a year ago, or
 * any month with transactions), as a table of totals and then each category. The difference is said in plain words and
 * never coloured: more or less is not good or bad news in itself.
 */
export function CompareTab({ month, bounds, mode, onChooseMode }: CompareTabProps) {
  const { categories, transactions } = useData()
  const other = compareMonth(month, mode)
  const usable = other >= bounds.first && other <= bounds.last && other !== month

  const totalsA = monthTotals(transactions, month)
  const totalsB = monthTotals(transactions, other)
  const spendingRows = compareCategories(transactions, categories, "expense", month, other)
  const incomeRows = compareCategories(transactions, categories, "income", month, other)

  const months: string[] = []
  for (let m = bounds.last; m >= bounds.first; m = shiftMonth(m, -1)) if (m !== month) months.push(m)
  const lastYear = shiftMonth(month, -12)

  return (
    <Panel title="Compare two months" caption={usable ? `${formatMonth(month)} with ${formatMonth(other)}` : formatMonth(month)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="lg" data-slot="compare-with-button">
              Compare with {formatMonth(other)}
              <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] min-w-64 overflow-y-auto">
            <DropdownMenuLabel>Compare {formatMonth(month)} with</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mode} onValueChange={(value) => onChooseMode(value)}>
              <DropdownMenuRadioItem value="before" disabled={shiftMonth(month, -1) < bounds.first}>
                <span className="flex-1">The month before</span>
                <span className="text-xs text-muted-foreground">{formatMonth(shiftMonth(month, -1))}</span>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="year" disabled={lastYear < bounds.first}>
                <span className="flex-1">The same month last year</span>
                <span className="text-xs text-muted-foreground">{formatMonth(lastYear)}</span>
              </DropdownMenuRadioItem>
              {months.length > 0 ? <DropdownMenuSeparator /> : null}
              {months.length > 0 ? <DropdownMenuLabel>Or pick any month</DropdownMenuLabel> : null}
              {months.map((m) => (
                <DropdownMenuRadioItem key={m} value={m}>
                  {formatMonth(m)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!usable ? (
        <p data-slot="compare-empty" className="mt-5 text-muted-foreground">
          There is no {mode === "year" ? "same month last year" : mode === "before" ? "month before" : "other month"} in your history to compare{" "}
          {formatMonth(month)} with. Choose another month above.
        </p>
      ) : (
        <div className="@container mt-6 space-y-8" data-slot="compare-table">
          <CompareSection
            title="Totals"
            visibleHeader
            aLabel={formatMonth(month)}
            bLabel={formatMonth(other)}
            rows={[
              { id: "spent", name: "Spent", kind: "expense", a: totalsA.spending, b: totalsB.spending },
              { id: "earned", name: "Earned", kind: "income", a: totalsA.income, b: totalsB.income },
              { id: "left", name: "Left over", kind: "net", a: totalsA.net, b: totalsB.net },
            ]}
          />
          {spendingRows.length > 0 ? (
            <CompareSection
              title="Spending by category"
              aLabel={formatMonth(month)}
              bLabel={formatMonth(other)}
              rows={spendingRows.map((row) => ({ id: row.category.id, name: row.category.name, kind: "expense", a: row.a, b: row.b }))}
            />
          ) : null}
          {incomeRows.length > 0 ? (
            <CompareSection
              title="Income by category"
              aLabel={formatMonth(month)}
              bLabel={formatMonth(other)}
              rows={incomeRows.map((row) => ({ id: row.category.id, name: row.category.name, kind: "income", a: row.a, b: row.b }))}
            />
          ) : null}
        </div>
      )}
    </Panel>
  )
}

interface CompareLine {
  id: string
  name: string
  kind: Kind
  a: number
  b: number
}

const GRID = "@xl:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr]"

/** One table: a heading, a header row (only seen on a wide screen, and for the first table), and a line for each row. */
function CompareSection({ title, aLabel, bLabel, rows, visibleHeader = false }: { title: string; aLabel: string; bLabel: string; rows: CompareLine[]; visibleHeader?: boolean }) {
  return (
    <section data-slot="compare-section" aria-label={title}>
      <h3 className="type-title text-lg">{title}</h3>
      <div role="table" aria-label={`${title}: ${aLabel} and ${bLabel}`} className="mt-2 divide-y">
        <div role="row" className={cn("gap-x-4 pb-2 text-sm text-muted-foreground", visibleHeader ? "sr-only @xl:not-sr-only @xl:grid" : "sr-only", GRID)}>
          <div role="columnheader">{title === "Totals" ? "" : "Category"}</div>
          <div role="columnheader" className="text-right">
            {aLabel}
          </div>
          <div role="columnheader" className="text-right">
            {bLabel}
          </div>
          <div role="columnheader" className="text-right">
            Difference
          </div>
        </div>
        {rows.map((row) => {
          const a = amountCell(row.kind, row.a)
          const b = amountCell(row.kind, row.b)
          return (
            <div key={row.id} role="row" data-slot="compare-row" className={cn("grid grid-cols-2 gap-x-4 gap-y-1 py-3 @xl:items-baseline", GRID)}>
              <div role="rowheader" data-slot="compare-name" className="col-span-2 min-w-0 font-medium break-words @xl:col-span-1">
                {row.name}
              </div>
              <div role="cell" data-slot="compare-a" className="@xl:text-right">
                <span className="block text-xs text-muted-foreground @xl:hidden">{aLabel}</span>
                <span className={cn("whitespace-nowrap tabular-nums", a.className)}>{a.text}</span>
              </div>
              <div role="cell" data-slot="compare-b" className="@xl:text-right">
                <span className="block text-xs text-muted-foreground @xl:hidden">{bLabel}</span>
                <span className={cn("whitespace-nowrap tabular-nums", b.className)}>{b.text}</span>
              </div>
              <div role="cell" data-slot="compare-diff" className="col-span-2 text-sm text-muted-foreground @xl:col-span-1 @xl:text-right">
                {changeText(row.a, row.b) ?? "—"}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
