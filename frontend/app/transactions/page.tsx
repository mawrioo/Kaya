import type { Metadata } from "next"
import { connection } from "next/server"

import { PageHeader } from "@/components/page-header"
import { TransactionsView } from "@/components/transactions/transactions-view"
import { isMonth, isYear } from "@/lib/dates"

export const metadata: Metadata = { title: "Transactions" }

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  await connection()
  const { wallet, category, month, year, type } = await searchParams
  const walletId = typeof wallet === "string" ? wallet : undefined
  const typeValue = type === "income" || type === "expense" || type === "transfer" ? type : undefined
  const categoryId = typeof category === "string" ? category : undefined
  const monthValue = typeof month === "string" && isMonth(month) ? month : undefined
  const yearValue = typeof year === "string" && isYear(year) ? year : undefined

  return (
    <>
      <PageHeader title="Transactions" description="Every rupiah in and out, across all your wallets." />
      {/* The key restarts the filters when a different wallet, category, kind of transaction or month is picked */}
      <TransactionsView
        key={`${walletId ?? "all"}|${categoryId ?? "all"}|${typeValue ?? "all"}|${monthValue ?? "all"}|${yearValue ?? "all"}`}
        nowIso={new Date().toISOString()}
        initialWalletId={walletId}
        initialCategoryId={categoryId}
        initialType={typeValue}
        initialMonth={monthValue}
        initialYear={yearValue}
      />
    </>
  )
}
