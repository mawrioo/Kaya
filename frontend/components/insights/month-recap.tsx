"use client"

import Link from "next/link"

import { useData } from "@/components/data-provider"
import { CalendarArt } from "@/components/illustrations/calendar"
import { Seal } from "@/components/illustrations/seal"
import { Money } from "@/components/money"
import { Button } from "@/components/ui/button"
import { formatDate, formatMonthName } from "@/lib/format"
import { monthRecap } from "@/lib/recap"
import { describeTransaction } from "@/lib/stats"
import { cn } from "@/lib/utils"

/**
 * The month in one look, at the top of the Month view: what came in, what went out, what was left and the biggest treat,
 * with the round seal behind it like the one on a banknote. A month with no money in it gets a calendar drawing and a
 * plain sentence instead. `today` is "2026-10-04", from the server, so "yet" is only said for a month that isn't over.
 */
export function MonthRecap({ month, today }: { month: string; today: string }) {
  const { transactions, categories, wallets } = useData()
  const recap = monthRecap(transactions, categories, month)
  const name = formatMonthName(month) + (month.slice(0, 4) === today.slice(0, 4) ? "" : ` ${month.slice(0, 4)}`)

  if (!recap) {
    return (
      <section
        aria-labelledby="month-recap-title"
        data-slot="month-recap-empty"
        className="flex flex-col items-center rounded-xl border bg-card px-6 py-10 text-center shadow-sm"
      >
        <CalendarArt className="w-44" />
        <h2 id="month-recap-title" className="type-title mt-3 wrap-anywhere">
          Nothing came in or went out in {name}
          {month >= today.slice(0, 7) ? " yet" : ""}
        </h2>
        <p className="mt-2 max-w-[42ch] text-muted-foreground">Add a transaction and this page fills in.</p>
        <div className="mt-6">
          <Button asChild variant="secondary" size="lg">
            <Link href="/transactions">Go to Transactions</Link>
          </Button>
        </div>
      </section>
    )
  }

  const treat = recap.treat ? describeTransaction(recap.treat, wallets, categories) : undefined
  const leftTone = recap.left === 0 ? "text-muted-foreground" : recap.left > 0 ? "text-positive" : "text-negative"

  return (
    <section
      aria-labelledby="month-recap-title"
      data-slot="month-recap"
      className="relative isolate overflow-hidden rounded-xl border bg-card p-5 shadow-sm md:p-6"
    >
      {/* The seal: decoration only, behind the words, in the top corner (above the amounts, never under one). */}
      <Seal className="pointer-events-none absolute -top-5 -right-5 -z-10 hidden size-[6.5rem] text-sage-foreground md:block" />
      <h2 id="month-recap-title" className="type-title wrap-anywhere">
        {name} in one look
      </h2>

      {/* Two across from 380px (figures at 24px on a phone, the size from which the softer thousands dots still pass), so the card stays short; four across from 1280px. */}
      <dl className={cn("mt-5 grid grid-cols-1 gap-x-4 gap-y-5 min-[380px]:grid-cols-2 sm:gap-x-6", treat ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        <Fact label="Came in">
          <Money amount={recap.came} sign="always" className={recap.came === 0 ? "text-muted-foreground" : "text-positive"} />
        </Fact>
        <Fact label="Went out">
          <Money amount={-recap.went} className={recap.went === 0 ? "text-muted-foreground" : "text-negative"} />
        </Fact>
        <Fact label="Left over">
          <Money amount={recap.left} className={leftTone} />
        </Fact>
        {recap.treat && treat ? (
          <Fact label="Biggest treat">
            <Money amount={-recap.treat.amount} className="text-negative" />
            <span className="mt-1.5 block font-sans text-sm leading-snug font-medium wrap-anywhere text-foreground">{treat.title}</span>
            <span className="block font-sans text-sm leading-snug text-muted-foreground">{formatDate(recap.treat.date)}</span>
          </Fact>
        ) : null}
      </dl>
    </section>
  )
}

/** One fact: a small label, and its figure in the serif amount style. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 type-amount max-sm:text-2xl">{children}</dd>
    </div>
  )
}
