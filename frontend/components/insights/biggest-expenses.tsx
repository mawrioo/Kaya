"use client"

import { Panel } from "@/components/panel"
import { SeeAllLink } from "@/components/see-all-link"
import { TransactionRowContent } from "@/components/transaction-row"
import { formatMonth } from "@/lib/format"
import type { Category, Transaction, Wallet } from "@/lib/types"

/**
 * The biggest single expenses of the month, biggest first: what it was, where it was paid from, when, and how much.
 * "See all" opens the month's transactions.
 */
export function BiggestExpenses({
  transactions,
  wallets,
  categories,
  month,
}: {
  /** Already the biggest few, in order. */
  transactions: Transaction[]
  wallets: Wallet[]
  categories: Category[]
  month: string
}) {
  return (
    <Panel title="Biggest expenses" caption={formatMonth(month)} action={<SeeAllLink href={`/transactions?month=${month}`} />}>
      {transactions.length === 0 ? (
        <p className="text-muted-foreground">Nothing spent this month.</p>
      ) : (
        <ul className="divide-y" data-slot="biggest-list">
          {transactions.map((tx) => (
            <li key={tx.id} data-slot="biggest-row" className="py-3 first:pt-0 last:pb-0">
              <TransactionRowContent tx={tx} wallets={wallets} categories={categories} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
