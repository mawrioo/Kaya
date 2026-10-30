"use client"

import { useEffect, useRef, useState } from "react"
import { Undo2 } from "lucide-react"
import { useIsBalanceHidden } from "@/components/balance-visibility"
import { useData } from "@/components/data-provider"
import { AmountInput } from "@/components/amount-input"
import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ApiError, errorMessage, loadData } from "@/lib/api"
import { previewAssistantBatch, replyToBatchItem, saveAssistantBatch } from "@/lib/assistant-api"
import { formatRupiah } from "@/lib/format"
import { duplicateSignature, findTransactionDuplicates } from "@/lib/transaction-duplicates"
import { emptyForm, formToTransaction, validateForm, type TransactionForm } from "@/lib/transaction-form"
import type { NewTransaction, PreviewConversation, PreviewField, Transaction, TransactionPreviewDraft, TransactionType } from "@/lib/types"

const selectClass = "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
interface RowSnapshot { form: TransactionForm; conversation?: PreviewConversation; typeChosen: boolean }
interface Row extends RowSnapshot { id: string; text: string; included: boolean; reply: string; busy: boolean; message: string; history: RowSnapshot[]; revision: number }
const formFromDraft = (draft: TransactionPreviewDraft): TransactionForm => ({ ...emptyForm("", new Date()), type: draft.type ?? "expense", amount: draft.amount === undefined ? "" : String(draft.amount), walletId: draft.walletId ?? "", toWalletId: draft.toWalletId ?? "", categoryId: draft.categoryId ?? "", date: draft.date ?? "", note: draft.description ?? "" })
function contextFor(row: Row): PreviewConversation {
  const form = row.form
  const draft: TransactionPreviewDraft = { ...(row.typeChosen ? { type: form.type } : {}), ...(form.amount && Number(form.amount) > 0 ? { amount: Number(form.amount) } : {}), ...(form.walletId ? { walletId: form.walletId } : {}), ...(form.type === "transfer" && form.toWalletId ? { toWalletId: form.toWalletId } : {}), ...(row.typeChosen && form.type !== "transfer" && form.categoryId ? { categoryId: form.categoryId } : {}), ...(form.date ? { date: form.date } : {}), description: form.note }
  const sources = { ...row.conversation?.sources }
  for (const field of Object.keys(draft) as PreviewField[]) if (draft[field] !== row.conversation?.draft[field]) sources[field] = "manual"
  let pending = row.conversation?.pending
  if (pending && pending.field !== "sentence" && pending.field !== "transferEnd" && draft[pending.field] !== undefined) pending = undefined
  if (pending?.field === "transferEnd" && (draft.walletId !== row.conversation?.draft.walletId || draft.toWalletId !== row.conversation?.draft.toWalletId)) pending = undefined
  return { revision: row.revision, draft, sources, ...(pending ? { pending } : {}) }
}

export function AssistantBatchEntry({ defaultWalletId, onBack, onDone }: { defaultWalletId: string; onBack: () => void; onDone: () => void }) {
  const { wallets: allWallets, categories, transactions, refreshData } = useData()
  const wallets = allWallets.filter(wallet => wallet.kind !== "deposito")
  const isHidden = useIsBalanceHidden()
  const [text, setText] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [frozen, setFrozen] = useState<{ requestId: string; transactions: NewTransaction[] }>()
  const [freshDuplicates, setFreshDuplicates] = useState<{ baseline: Transaction[]; transactions: Transaction[] }>()
  const prepareRequest = useRef<AbortController | null>(null)
  const replyRequests = useRef(new Map<string, AbortController>())
  const rowRevisions = useRef(new Map<string, number>())
  const editingField = useRef<string | undefined>(undefined)
  const saveInFlight = useRef(false)
  const saveCheck = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; const requests = replyRequests.current; return () => { mounted.current = false; prepareRequest.current?.abort(); saveCheck.current?.abort(); for (const controller of requests.values()) controller.abort() } }, [])
  const duplicateTransactions = freshDuplicates?.baseline === transactions ? freshDuplicates.transactions : transactions
  function issues(row: Row) {
    const form = row.form
    const found = Object.values(validateForm(form))
    if (!row.typeChosen) found.unshift("Choose expense, income or transfer.")
    if (!Number.isSafeInteger(Number(form.amount)) || Number(form.amount) > 999_999_999_999) found.push("Choose a whole-rupiah amount within the limit.")
    if (!wallets.some(w => w.id === form.walletId) || (form.type === "transfer" && !wallets.some(w => w.id === form.toWalletId))) found.push("Choose existing wallets.")
    if (form.type !== "transfer" && !categories.some(c => c.id === form.categoryId && c.type === form.type)) found.push("Choose a compatible category.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(Date.parse(form.date)) || new Date(form.date).toISOString().slice(0, 10) !== form.date) found.push("Choose a valid calendar date.")
    const pending = contextFor(row).pending
    if (pending?.field === "sentence" || pending?.field === "transferEnd") found.push(pending.message)
    return [...new Set(found)]
  }
  const selected = rows.filter(row => row.included)
  const valid = selected.length > 0 && selected.every(row => !row.busy && issues(row).length === 0)
  const deltas = new Map<string, number>()
  for (const row of selected.filter(row => issues(row).length === 0)) {
    const amount = Number(row.form.amount)
    const source = row.form.walletId
    deltas.set(source, (deltas.get(source) ?? 0) + (row.form.type === "income" ? amount : -amount))
    if (row.form.type === "transfer") deltas.set(row.form.toWalletId, (deltas.get(row.form.toWalletId) ?? 0) + amount)
  }
  function invalidateRow(id: string) {
    replyRequests.current.get(id)?.abort()
    replyRequests.current.delete(id)
    const next = (rowRevisions.current.get(id) ?? 0) + 1
    rowRevisions.current.set(id, next)
    return next
  }
  function patch(id: string, field: keyof TransactionForm, value: string) {
    if (saving || frozen) return
    const nextRevision = invalidateRow(id)
    const group = `${id}:${field}`
    const remember = editingField.current !== group
    editingField.current = group
    setRows(current => current.map(row => {
      if (row.id !== id) return row
      const form = { ...row.form, [field]: value }
      if (field === "type") {
        if (value === "transfer" || !categories.some(c => c.id === form.categoryId && c.type === value)) form.categoryId = ""
        if (value !== "transfer") form.toWalletId = ""
      }
      return { ...row, form, typeChosen: field === "type" ? true : row.typeChosen, busy: false, revision: nextRevision, message: "Draft updated. Review its fields.", history: remember ? [...row.history.slice(-19), structuredClone({ form: row.form, conversation: contextFor(row), typeChosen: row.typeChosen })] : row.history }
    }))
    setError("")
  }
  function undo(row: Row) {
    if (!row.history.length || saving || frozen) return
    const last = structuredClone(row.history[row.history.length - 1])
    const revision = invalidateRow(row.id)
    if (last.conversation) last.conversation.revision = revision
    editingField.current = undefined
    setRows(current => current.map(item => item.id === row.id ? { ...item, ...last, revision, busy: false, reply: "", history: item.history.slice(0, -1), message: "Last change undone." } : item))
  }
  async function prepare() {
    if (preparing || saving || frozen || !text.trim()) return
    prepareRequest.current?.abort()
    const controller = new AbortController()
    prepareRequest.current = controller
    setPreparing(true)
    setError("")
    setStatus("Preparing each entry on this computer...")
    try {
      const result = await previewAssistantBatch(text, defaultWalletId, controller.signal)
      if (controller.signal.aborted || !mounted.current) return
      rowRevisions.current.clear()
      setRows(result.items.map(item => {
        rowRevisions.current.set(item.id, item.preview.conversation?.revision ?? 1)
        return { id: item.id, text: item.text, form: formFromDraft(item.preview.draft), conversation: item.preview.conversation, typeChosen: item.preview.draft.type !== undefined, included: true, reply: "", busy: false, message: item.preview.message, history: [], revision: item.preview.conversation?.revision ?? 1 }
      }))
      setStatus(result.message)
    } catch (error) { if (!controller.signal.aborted && mounted.current) { setError(errorMessage(error)); setStatus("") } }
    finally { if (prepareRequest.current === controller && mounted.current) { prepareRequest.current = null; setPreparing(false) } }
  }
  async function answer(row: Row, value = row.reply) {
    if (!value.trim() || row.busy || saving || frozen) return
    const before = structuredClone({ form: row.form, conversation: contextFor(row), typeChosen: row.typeChosen })
    const controller = new AbortController()
    replyRequests.current.get(row.id)?.abort()
    replyRequests.current.set(row.id, controller)
    const revision = row.revision
    setRows(current => current.map(item => item.id === row.id ? { ...item, busy: true } : item))
    editingField.current = undefined
    try {
      const result = await replyToBatchItem(value, before.conversation, controller.signal)
      if (controller.signal.aborted || !mounted.current || rowRevisions.current.get(row.id) !== revision) return
      const form = formFromDraft(result.draft)
      const next = result.conversation?.revision ?? revision + 1
      rowRevisions.current.set(row.id, next)
      const changed = JSON.stringify(before.form) !== JSON.stringify(form) || JSON.stringify(before.conversation.pending) !== JSON.stringify(result.conversation?.pending)
      setRows(current => current.map(item => item.id === row.id ? { ...item, form, conversation: result.conversation, typeChosen: result.draft.type !== undefined, reply: "", busy: false, revision: next, message: result.message, history: changed ? [...item.history.slice(-19), before] : item.history } : item))
    } catch (error) { if (!controller.signal.aborted && mounted.current) setRows(current => current.map(item => item.id === row.id ? { ...item, busy: false, message: errorMessage(error) } : item)) }
    finally { if (replyRequests.current.get(row.id) === controller) replyRequests.current.delete(row.id) }
  }
  async function save() {
    if (saveInFlight.current || (!frozen && !valid)) return
    saveInFlight.current = true
    setSaving(true)
    setError("")
    let payload = frozen
    try {
      if (!payload) {
        const controller = new AbortController()
        saveCheck.current = controller
        const latest = await loadData(undefined, controller.signal)
        if (controller.signal.aborted || !mounted.current) return
        const unseen = selected.some(row => duplicateSignature(findTransactionDuplicates(row.form, latest.transactions)) !== duplicateSignature(findTransactionDuplicates(row.form, duplicateTransactions)) && findTransactionDuplicates(row.form, latest.transactions).length > 0)
        if (unseen) { setFreshDuplicates({ baseline: transactions, transactions: latest.transactions }); setError("A similar entry appeared since preparation. Review the notices, then confirm again if these are separate payments."); return }
        const now = new Date()
        payload = { requestId: crypto.randomUUID(), transactions: selected.map(row => formToTransaction(row.form, now)) }
      }
      saveCheck.current = null
      setFrozen(payload)
      await saveAssistantBatch(payload.requestId, payload.transactions)
      if (!mounted.current) return
      await refreshData().catch(() => {})
      setStatus("Batch saved.")
      onDone()
    } catch (error) {
      if (!mounted.current) return
      const status = error instanceof ApiError ? error.status : undefined
      if (status && status >= 400 && status < 500) setFrozen(undefined)
      setError(payload && !(status && status >= 400 && status < 500) ? "The save acknowledgement was not received. This batch may already be saved. Retry the same batch safely, or check Transactions before starting another." : errorMessage(error))
    } finally { saveCheck.current = null; saveInFlight.current = false; if (mounted.current) setSaving(false) }
  }
  function startOver() {
    prepareRequest.current?.abort()
    for (const request of replyRequests.current.values()) request.abort()
    replyRequests.current.clear()
    setRows([])
    setStatus("")
    setError("")
    setPreparing(false)
  }
  return <div className="grid min-w-0 gap-5" onBlurCapture={() => { editingField.current = undefined }}>
    <DialogHeader><DialogTitle className="type-title">Several transactions</DialogTitle><DialogDescription>Prepare up to five entries, review each one, then confirm the selected entries together.</DialogDescription></DialogHeader>
    {!rows.length ? <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor="assistant-batch-text">Your transactions</label>
      <textarea id="assistant-batch-text" value={text} maxLength={2500} rows={4} autoFocus disabled={saving} className="w-full resize-y rounded-xl border border-input bg-card p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" placeholder={"Food 35rb BCA; parking 5rb Cash\nSalary 5jt Bank Jago"} onChange={event => { prepareRequest.current?.abort(); setPreparing(false); setText(event.target.value); setError(""); setStatus("") }} />
      <p className="text-sm text-muted-foreground">Use a semicolon or a new line between entries. Name the wallet/date in each entry when they differ. Nothing saves during preparation.</p>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={preparing || !text.trim()} onClick={() => void prepare()}>{preparing ? "Preparing entries..." : "Prepare entries"}</Button>{preparing ? <Button type="button" variant="ghost" onClick={() => { prepareRequest.current?.abort(); setPreparing(false); setStatus("Preparation stopped.") }}>Stop</Button> : null}</div>
    </div> : <>
      <ol className="grid min-w-0 gap-5">
        {rows.map((row, index) => {
          const problems = issues(row)
          const duplicate = findTransactionDuplicates(row.form, duplicateTransactions)
          const sameBatch = rows.filter(other => other.included && other.id !== row.id && issues(other).length === 0).map(other => ({ ...formToTransaction(other.form, new Date()), id: other.id }) as Transaction)
          const withinBatch = findTransactionDuplicates(row.form, sameBatch)
          const context = contextFor(row)
          return <li key={row.id} data-testid={`assistant-batch-${index + 1}`} className="grid min-w-0 gap-3 border-b border-border pb-5 last:border-b-0">
            <label className="flex items-start gap-2 text-sm font-medium"><input className="mt-1" type="checkbox" checked={row.included} disabled={saving || !!frozen} onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, included: event.target.checked } : item))} /><span className="wrap-anywhere">Entry {index + 1}: {row.text}</span></label>
            <fieldset disabled={saving || !!frozen || !row.included} className="grid min-w-0 gap-3">
              <legend className="sr-only">Fields for entry {index + 1}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 text-sm">Type<select aria-label={`Type for entry ${index + 1}`} value={row.typeChosen ? row.form.type : ""} className={selectClass} onChange={event => patch(row.id, "type", event.target.value as TransactionType)}><option value="" disabled>Choose a type</option>{["expense", "income", "transfer"].map(type => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>
                <div className="grid min-w-0 gap-1 text-sm"><label htmlFor={`batch-amount-${row.id}`}>Amount</label><AmountInput id={`batch-amount-${row.id}`} value={row.form.amount} onChange={value => patch(row.id, "amount", value)} /></div>
                <label className="grid min-w-0 gap-1 text-sm">{row.form.type === "transfer" ? "From wallet" : "Wallet"}<select aria-label={`Wallet for entry ${index + 1}`} value={row.form.walletId} className={selectClass} onChange={event => patch(row.id, "walletId", event.target.value)}><option value="">Choose a wallet</option>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
                {row.form.type === "transfer" ? <label className="grid min-w-0 gap-1 text-sm">To wallet<select aria-label={`Destination for entry ${index + 1}`} value={row.form.toWalletId} className={selectClass} onChange={event => patch(row.id, "toWalletId", event.target.value)}><option value="">Choose a wallet</option>{wallets.map(wallet => <option key={wallet.id} value={wallet.id} disabled={wallet.id === row.form.walletId}>{wallet.name}</option>)}</select></label> : <label className="grid min-w-0 gap-1 text-sm">Category<select aria-label={`Category for entry ${index + 1}`} value={row.form.categoryId} className={selectClass} onChange={event => patch(row.id, "categoryId", event.target.value)}><option value="">Choose a category</option>{categories.filter(category => category.type === row.form.type).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
                <div className="grid min-w-0 gap-1 text-sm"><label htmlFor={`batch-date-${row.id}`}>Date</label><DatePicker id={`batch-date-${row.id}`} value={row.form.date} onChange={value => patch(row.id, "date", value)} /></div>
                <div className="grid min-w-0 gap-1 text-sm"><label htmlFor={`batch-note-${row.id}`}>Note</label><Input id={`batch-note-${row.id}`} value={row.form.note} maxLength={100} onChange={event => patch(row.id, "note", event.target.value)} /></div>
              </div>
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground wrap-anywhere">{problems.length ? problems[0] : row.message}</p>
              {context.pending?.field === "sentence" ? <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setRows(current => current.map(item => item.id === row.id ? { ...item, conversation: undefined, typeChosen: false, message: "Use the fields to complete this entry." } : item))}>Use fields for this entry</Button> : null}
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row"><Input aria-label={`Reply for entry ${index + 1}`} value={row.reply} maxLength={500} placeholder="An answer or one correction" disabled={row.busy} onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, reply: event.target.value } : item))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!event.repeat && !event.nativeEvent.isComposing) void answer(row) } }} /><Button type="button" variant="secondary" size="sm" disabled={row.busy || !row.reply.trim()} onClick={() => void answer(row)}>{row.busy ? "Applying..." : `Apply to entry ${index + 1}`}</Button></div>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" size="sm" disabled={!row.history.length} onClick={() => undo(row)}><Undo2 className="size-4" aria-hidden />Undo entry {index + 1} change</Button>{context.pending?.field === "transferEnd" ? ["source", "destination"].map(end => <Button key={end} type="button" variant="secondary" size="sm" disabled={row.busy} onClick={() => void answer(row, end)}>{end}</Button>) : null}</div>
              {duplicate.length || withinBatch.length ? <p className="rounded-lg bg-muted/60 p-2 text-sm">{duplicate.length ? `${duplicate.length} similar saved ${duplicate.length === 1 ? "entry" : "entries"}. ` : ""}{withinBatch.length ? "Another selected entry has the same amount, wallet and date. " : ""}Keep selected only if these are separate payments.</p> : null}
            </fieldset>
          </li>
        })}
      </ol>
      <div className="grid gap-1 rounded-xl bg-muted/50 p-3 text-sm"><p className="font-medium">After {selected.length} selected {selected.length === 1 ? "entry" : "entries"}</p>{[...deltas].map(([id, delta]) => { const wallet = wallets.find(w => w.id === id)!; return <p key={id}>{wallet.name}: {isHidden(id) ? "balance hidden; this wallet will be updated" : `${formatRupiah(wallet.balance)} → ${formatRupiah(wallet.balance + delta)} (${formatRupiah(delta, { sign: "always" })})`}</p> })}{!valid ? <p className="text-muted-foreground">Complete every selected entry before saving. Untick an entry to leave it out.</p> : null}</div>
      <Button type="button" variant="ghost" className="justify-self-start" disabled={saving || !!frozen} onClick={startOver}>Start new batch</Button>
    </>}
    {error ? <p role="alert" className="text-sm text-muted-foreground">{error} {frozen ? <a className="underline underline-offset-4" href="/transactions" target="_blank" rel="noopener noreferrer">Check Transactions</a> : null}</p> : null}
    <p role="status" aria-live="polite" className={status ? "text-sm text-muted-foreground" : "sr-only"}>{status}</p>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" disabled={saving} onClick={frozen ? onDone : onBack}>{frozen ? "Close" : "Back to one transaction"}</Button>{rows.length ? <Button type="button" disabled={saving || (!frozen && !valid)} onKeyDown={event => { if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault() }} onClick={event => { if (event.detail < 2) void save() }}>{saving ? "Saving entries..." : frozen ? "Retry same batch safely" : `Confirm and save ${selected.length} ${selected.length === 1 ? "entry" : "entries"}`}</Button> : null}</div>
  </div>
}
