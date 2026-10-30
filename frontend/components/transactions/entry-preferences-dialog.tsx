"use client"

import { useState } from "react"
import { useData } from "@/components/data-provider"
import { AssistantEntryTools } from "@/components/transactions/assistant-entry-tools"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { emptyForm, type TransactionForm } from "@/lib/transaction-form"
import type { FavouriteTemplate } from "@/lib/assistant-api"

export function EntryPreferencesDialog({ open, onOpenChange, onCloseAutoFocus }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg [&>[data-slot=dialog-close]]:size-11 [&>[data-slot=dialog-close]]:top-2 [&>[data-slot=dialog-close]]:right-2" onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader><DialogTitle>Entry preferences</DialogTitle><DialogDescription>Manage favourites and remembered categories.</DialogDescription></DialogHeader>
      <Preferences />
    </DialogContent>
  </Dialog>
}

function Preferences() {
  const { wallets, categories } = useData()
  const [form, setForm] = useState(() => emptyForm("", new Date()))
  const update = <K extends keyof TransactionForm>(key: K, value: TransactionForm[K]) => setForm(previous => ({ ...previous, [key]: value }))
  const useTemplate = (template: FavouriteTemplate) => setForm({ ...emptyForm("", new Date()), ...template.draft, amount: template.draft.amount === undefined ? "" : String(template.draft.amount), note: template.draft.description ?? "" })
  const fieldClass = "min-h-11 min-w-0 rounded-lg border border-input bg-card px-3 text-base"
  const editor = <div className="grid gap-3">
    <label className="grid gap-1">Type<select className={fieldClass} value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value as TransactionForm["type"], categoryId: "" }))}>{["expense", "income", "transfer"].map(type => <option key={type} value={type}>{type}</option>)}</select></label>
    <label className="grid gap-1">{form.type === "transfer" ? "From wallet" : "Wallet"}<select className={fieldClass} value={form.walletId} onChange={event => update("walletId", event.target.value)}><option value="">Choose a wallet</option>{wallets.filter(wallet => wallet.kind !== "deposito").map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
    {form.type === "transfer" ? <label className="grid gap-1">To wallet<select className={fieldClass} value={form.toWalletId} onChange={event => update("toWalletId", event.target.value)}><option value="">Choose a wallet</option>{wallets.filter(wallet => wallet.kind !== "deposito").map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label> : <label className="grid gap-1">Category<select className={fieldClass} value={form.categoryId} onChange={event => update("categoryId", event.target.value)}><option value="">Choose a category</option>{categories.filter(category => category.type === form.type).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
    <label className="grid gap-1">Amount<input className={fieldClass} inputMode="numeric" value={form.amount} onChange={event => update("amount", event.target.value.replace(/\D/g, ""))} /></label>
    <label className="grid gap-1">Note<input className={fieldClass} maxLength={100} value={form.note} onChange={event => update("note", event.target.value)} /></label>
  </div>
  return <AssistantEntryTools mode="manage" form={form} disabled={false} canSaveTemplate={false} refreshKey={0} onUse={useTemplate} editor={editor} />
}
