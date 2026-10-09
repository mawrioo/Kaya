"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"

import { useData } from "@/components/data-provider"
import { MonthSwitcher } from "@/components/insights/month-switcher"
import { MonthReport } from "@/components/report/month-report"
import { Button } from "@/components/ui/button"
import { toDateInput } from "@/lib/dates"
import { monthBounds, pickMonth } from "@/lib/stats"

/**
 * The page behind "Report" on Insights: a month laid out as a sheet of paper, and a button that opens the browser's print
 * window (where "Save as PDF" keeps it as a file). The bar above the sheet isn't printed, and neither is the menu, so only
 * the sheet comes out. `nowIso` comes from the server so the server and the browser agree on today.
 */
export function ReportView({ nowIso, month: asked }: { nowIso: string; month?: string }) {
  const router = useRouter()
  const { user, transactions, categories, wallets, goals, monthlyBudget } = useData()
  const now = new Date(nowIso)
  const bounds = monthBounds(transactions, now)
  // The month in the address, if it is one with data to show; otherwise the one Home shows.
  const month = asked !== undefined && asked >= bounds.first && asked <= bounds.last ? asked : pickMonth(transactions, now)

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Button asChild variant="ghost" size="lg" className="-ml-2.5">
          <Link href={`/insights?month=${month}`}>
            <ArrowLeft aria-hidden />
            Back to Insights
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <MonthSwitcher
              month={month}
              first={bounds.first}
              last={bounds.last}
              onChange={(next) => router.replace(`/insights/report?month=${next}`, { scroll: false })}
            />
          </div>
          <Button type="button" size="lg" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print or save as PDF
          </Button>
        </div>
      </div>
      <p className="print-hidden max-w-[62ch] text-sm text-muted-foreground">
        This is the sheet as it will print. In the print window, choose &ldquo;Save as PDF&rdquo; instead of a printer to keep it as a file.
      </p>

      <MonthReport
        month={month}
        today={toDateInput(now)}
        userName={user.name}
        transactions={transactions}
        categories={categories}
        wallets={wallets}
        goals={goals}
        monthlyBudget={monthlyBudget}
        firstMonth={bounds.first}
      />
    </div>
  )
}
