"use client"

import { formatDate, formatRupiah } from "@/lib/format"
import type { TransactionForm } from "@/lib/transaction-form"
import type { PreviewConversation, Wallet, Category } from "@/lib/types"

/** The complete money movement stays visible before the owner chooses Save. */
export function QuickEntryReview({ form, wallets, categories, conversation }: {
  form: TransactionForm
  wallets: Wallet[]
  categories: Category[]
  conversation?: PreviewConversation
}) {
  const walletName = (id: string) => wallets.find(wallet => wallet.id === id)?.name ?? "Choose a wallet"
  const row = (label: string, value: string, defaulted = false) => (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium wrap-anywhere">{value}{defaulted ? <span className="ml-1 text-xs font-normal text-muted-foreground">(default)</span> : null}</dd>
    </div>
  )
  return (
    <section aria-label="Transaction review" className="min-w-0">
      <p className="text-[clamp(1.5rem,7vw,2rem)] leading-tight font-semibold tabular-nums wrap-anywhere">{form.amount ? formatRupiah(Number(form.amount)) : "Amount needed"}</p>
      {form.note ? <p className="mt-1 text-sm text-muted-foreground wrap-anywhere">{form.note}</p> : null}
      <dl className="mt-4 divide-y divide-border text-sm">
        {row(form.type === "transfer" ? "From" : "Wallet", walletName(form.walletId), conversation?.sources.walletId === "default")}
        {form.type === "transfer" ? row("To", walletName(form.toWalletId)) : row("Category", categories.find(category => category.id === form.categoryId)?.name ?? "Choose a category", conversation?.sources.categoryId === "default")}
        {row("Date", form.date ? formatDate(form.date) : "Choose a date", conversation?.sources.date === "default")}
      </dl>
    </section>
  )
}
