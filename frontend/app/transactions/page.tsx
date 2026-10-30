import type { Metadata } from "next"
import { connection } from "next/server"

import { PageHeader } from "@/components/page-header"
import { TransactionsView } from "@/components/transactions/transactions-view"
import { fromDateInput, isMonth, isYear, toDateInput } from "@/lib/dates"

export const metadata: Metadata = { title: "Transactions" }

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  await connection()
  const { wallet, category, month, year, type, from, to, ids } = await searchParams
  const walletId = typeof wallet === "string" ? wallet : undefined
  const typeValue = type === "income" || type === "expense" || type === "transfer" ? type : undefined
  const categoryId = typeof category === "string" ? category : undefined
  const monthValue = typeof month === "string" && isMonth(month) ? month : undefined
  const yearValue = typeof year === "string" && isYear(year) ? year : undefined

  const validDay = (value: unknown): value is string => typeof value === "string" && !!fromDateInput(value) && toDateInput(fromDateInput(value)!) === value
  const fromValue = validDay(from) ? from : undefined
  const toValue = validDay(to) ? to : undefined
  const explicitRange = fromValue && toValue && fromValue <= toValue ? { from: fromValue, to: toValue } : undefined
  const recordIds = typeof ids === "string" && ids.length <= 5500 ? [...new Set(ids.split(",").filter(id => /^[a-zA-Z0-9_-]{1,100}$/.test(id)))].slice(0, 50) : []

  return (
    <>
      <PageHeader title="Transactions" description="Every rupiah in and out, across all your wallets." />
      {/* The key restarts the filters when a different wallet, category, kind of transaction or month is picked */}
      <TransactionsView
        key={`${walletId ?? "all"}|${categoryId ?? "all"}|${typeValue ?? "all"}|${monthValue ?? "all"}|${yearValue ?? "all"}|${explicitRange?.from ?? ""}|${explicitRange?.to ?? ""}|${recordIds.join(",")}`}
        nowIso={new Date().toISOString()}
        initialWalletId={walletId}
        initialCategoryId={categoryId}
        initialType={typeValue}
        initialMonth={monthValue}
        initialYear={yearValue}
        initialFrom={explicitRange?.from}
        initialTo={explicitRange?.to}
        initialTransactionIds={recordIds.length ? recordIds : undefined}
      />
    </>
  )
}
