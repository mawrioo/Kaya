import { Panel } from "@/components/panel"
import { SeeAllLink } from "@/components/see-all-link"
import { TransactionRow } from "@/components/transaction-row"
import type { Category, Transaction, Wallet } from "@/lib/types"

interface RecentTransactionsProps {
  /** Already the newest few, see recentTransactions() in lib/stats. */
  transactions: Transaction[]
  wallets: Wallet[]
  categories: Category[]
}

export function RecentTransactions({ transactions, wallets, categories }: RecentTransactionsProps) {
  return (
    <Panel title="Recent transactions" action={<SeeAllLink href="/transactions" />}>
      {transactions.length === 0 ? (
        <p className="text-muted-foreground">No transactions yet.</p>
      ) : (
        <ul className="divide-y">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} wallets={wallets} categories={categories} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
