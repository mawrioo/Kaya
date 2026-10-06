"use client"

import { Download } from "lucide-react"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadTextFile } from "@/lib/download"
import { csvFileName, transactionsOfPeriod, transactionsToCsv } from "@/lib/export-csv"
import { formatMonth } from "@/lib/format"

/**
 * An "Export" button with a short menu: the month on screen, and the whole of its year, each as a CSV file that opens in a
 * spreadsheet. On the Year view only the year is offered. The file is made on this computer from what is already on
 * screen, so nothing is sent anywhere.
 */
export function ExportMenu({ month, year }: { /** Left out on the Year view. */ month?: string; year: string }) {
  const { transactions, wallets, categories } = useData()
  const choices = [
    ...(month ? [{ period: month, label: formatMonth(month) }] : []),
    { period: year, label: `All of ${year}` },
  ].map((choice) => ({ ...choice, count: transactionsOfPeriod(transactions, choice.period).length }))

  function exportPeriod(period: string, label: string) {
    const rows = transactionsOfPeriod(transactions, period)
    if (rows.length === 0) {
      toast.info(`Nothing to export in ${label}`)
      return
    }
    downloadTextFile(csvFileName(period), transactionsToCsv(rows, wallets, categories))
    toast.success("File saved", { description: `${csvFileName(period)} · ${rows.length} ${rows.length === 1 ? "transaction" : "transactions"}` })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="lg">
          <Download aria-hidden />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-60">
        <DropdownMenuLabel>Save as a CSV file</DropdownMenuLabel>
        {choices.map(({ period, label, count }) => (
          <DropdownMenuItem key={period} disabled={count === 0} onSelect={() => exportPeriod(period, label)}>
            <span className="flex-1">{label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{count} {count === 1 ? "transaction" : "transactions"}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
