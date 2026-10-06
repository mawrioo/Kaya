"use client"

import Link from "next/link"
import { Lock } from "lucide-react"

import { RankedRow } from "@/components/insights/ranked-row"
import { Panel } from "@/components/panel"
import { compareText, compareYearText, countText } from "@/lib/category-summary"
import { formatMonth, formatRupiah } from "@/lib/format"
import { icons } from "@/lib/icons"
import type { BreakdownRow } from "@/lib/insights"
import { paletteClasses } from "@/lib/palette"
import type { CategoryType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategoryBreakdownProps {
  title: string
  /** What to say when the period has nothing, e.g. "Nothing spent this month." */
  emptyText: string
  type: CategoryType
  /** What the amounts are for: a month ("2026-09") or a whole year ("2026"). Each row links to that period's transactions. */
  period: string
  /** The period before it, for the comparison, or undefined when there is nothing to compare with. */
  previousPeriod?: string
  rows: BreakdownRow[]
}

/**
 * Where a month's (or a year's) spending or income went: the categories that had something, biggest first, each with
 * what it came to, its share, how many transactions that was, how it compares with the period before, and a bar for
 * the share. Each row is a link to the transactions behind the number.
 */
export function CategoryBreakdown({ title, emptyText, type, period, previousPeriod, rows }: CategoryBreakdownProps) {
  const isYear = period.length === 4
  return (
    <Panel title={title} caption={isYear ? period : formatMonth(period)}>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y">
          {rows.map(({ category, amount, count, previous, share }) => {
            const Icon = icons[category.icon]
            const palette = paletteClasses[category.color]
            const compare =
              previousPeriod === undefined
                ? undefined
                : isYear
                  ? compareYearText(amount, previous, previousPeriod)
                  : compareText(amount, previous, previousPeriod, period)
            return (
              <RankedRow
                key={category.id}
                badge={
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", palette.soft, palette.icon)}>
                    <Icon className="size-[1.125rem]" aria-hidden />
                  </span>
                }
                name={
                  <>
                    <Link
                      href={`/transactions?category=${encodeURIComponent(category.id)}&${isYear ? "year" : "month"}=${period}`}
                      className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
                    >
                      {category.name}
                    </Link>
                    {category.preset ? (
                      <span className="ml-1.5 inline-block align-baseline" title="Preset">
                        <Lock className="inline size-3.5 align-[-0.1em] text-muted-foreground" aria-hidden />
                        <span className="sr-only">Preset.</span>
                      </span>
                    ) : null}
                  </>
                }
                amount={
                  type === "income"
                    ? { text: formatRupiah(amount, { sign: "always" }), className: "text-positive" }
                    : { text: formatRupiah(-amount), className: "text-negative" }
                }
                share={share}
                meta={[countText(count), compare].filter(Boolean).join(" · ")}
                barClass={palette.fill}
              />
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
