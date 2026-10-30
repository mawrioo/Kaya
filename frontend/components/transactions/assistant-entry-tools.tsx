"use client"

import { useEffect, useState } from "react"
import { Bookmark, Pencil, Trash2 } from "lucide-react"
import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorMessage } from "@/lib/api"
import { deleteFavouriteTemplate, deleteRememberedCategory, loadEntryAssistant, saveFavouriteTemplate, saveRememberedCategory, type EntryAssistantData, type FavouriteTemplate } from "@/lib/assistant-api"
import type { TransactionForm } from "@/lib/transaction-form"

const selectClass = "h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

interface Props { mode?: "manage" | "pick" | "save"; editor?: React.ReactNode; form: TransactionForm; disabled: boolean; canSaveTemplate: boolean; refreshKey: number; onUse: (template: FavouriteTemplate) => void }
export function AssistantEntryTools({ form, disabled, canSaveTemplate, refreshKey, onUse, mode = "manage", editor }: Props) {
  const { categories } = useData()
  const [data, setData] = useState<EntryAssistantData>({ rules: [], templates: [] })
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState("")
  const [fixedAmount, setFixedAmount] = useState(false)
  const [editing, setEditing] = useState<string>()
  const [editingRule, setEditingRule] = useState<{ id: string; phrase: string }>()

  useEffect(() => {
    const controller = new AbortController()
    void loadEntryAssistant(controller.signal).then(result => { if (!controller.signal.aborted) setData(result) }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)) })
    return () => controller.abort()
  }, [refreshKey])

  async function mutate(work: () => Promise<unknown>, message: string) {
    if (busy || disabled) return
    setBusy(true)
    setError("")
    try {
      await work()
      setData(await loadEntryAssistant())
      setStatus(message)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  async function saveTemplate() {
    const draft: FavouriteTemplate["draft"] = { type: form.type, ...(form.walletId ? { walletId: form.walletId } : {}), ...(form.type === "transfer" && form.toWalletId ? { toWalletId: form.toWalletId } : {}), ...(form.type !== "transfer" && form.categoryId ? { categoryId: form.categoryId } : {}), description: form.note, ...(fixedAmount && form.amount ? { amount: Number(form.amount) } : {}) }
    await mutate(async () => {
      await saveFavouriteTemplate({ ...(editing ? { id: editing } : {}), name: name.trim(), draft })
      setName("")
      setEditing(undefined)
    }, editing ? "Favourite updated." : "Favourite saved. It will use today's date when opened.")
  }
  function editTemplate(template: FavouriteTemplate) {
    onUse(template)
    setEditing(template.id)
    setName(template.name)
    setFixedAmount(template.draft.amount !== undefined)
    setStatus("Edit the favourite, then update it below.")
  }
  return <div className="text-sm" onKeyDown={event => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault() }}>
    <div className="mt-3 grid gap-4">
      <div className="grid gap-2">
        <p className="font-medium">{mode === "save" ? "Save as favourite" : "Favourites"}</p>
        {mode === "save" ? null : !data.templates.length ? <p className="text-muted-foreground">Save a familiar entry once, then open it as a fresh draft.</p> : <ul className="grid gap-2">
          {data.templates.map(template => <li key={template.id} className="flex min-w-0 flex-wrap items-center gap-1">
            {mode === "manage" ? <span className="min-w-0 flex-1 wrap-anywhere">{template.name}</span> : <Button type="button" variant="secondary" size="sm" className="h-auto min-h-9 max-w-full whitespace-normal text-left wrap-anywhere" disabled={disabled || busy} onClick={() => onUse(template)}><Bookmark className="size-4 shrink-0" aria-hidden />{template.name}</Button>}
            {mode === "manage" ? <><Button type="button" variant="ghost" size="sm" aria-label={`Edit favourite ${template.name}`} disabled={disabled || busy} onClick={() => editTemplate(template)}><Pencil className="size-4" aria-hidden /></Button>
            <Button type="button" variant="ghost" size="sm" aria-label={`Delete favourite ${template.name}`} disabled={disabled || busy} onClick={() => void mutate(() => deleteFavouriteTemplate(template.id), "Favourite deleted.")}><Trash2 className="size-4" aria-hidden /></Button></> : null}
          </li>)}
        </ul>}
        {(mode === "save" && canSaveTemplate) || editing ? <div className="grid gap-2">
          {editing ? editor : null}
          <label className="grid gap-1" htmlFor="assistant-template-name">Favourite name<Input id="assistant-template-name" value={name} maxLength={40} onChange={event => setName(event.target.value)} placeholder="e.g. Lunch" disabled={disabled || busy} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={fixedAmount} onChange={event => setFixedAmount(event.target.checked)} disabled={disabled || busy || (!form.amount && !fixedAmount)} />Keep this amount; otherwise ask each time</label>
          <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" disabled={disabled || busy || !name.trim() || (fixedAmount && (!form.amount || Number(form.amount) <= 0))} onClick={() => void saveTemplate()}>{editing ? "Update favourite" : "Save favourite"}</Button>{editing ? <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(undefined); setName("") }}>Cancel favourite edit</Button> : null}</div>
        </div> : <p className="text-muted-foreground">Prepare a draft or use the form to save a template.</p>}
      </div>
      {mode === "manage" ? <div className="grid gap-2 border-t border-border pt-3">
        <p className="font-medium">Remembered categories</p>
        {!data.rules.length ? <p className="text-muted-foreground">Choose Remember this category on a draft. It is learned only after you save the transaction.</p> : <ul className="grid gap-3">
          {data.rules.map(rule => <li key={rule.id} className="grid gap-1">
            <div className="flex min-w-0 items-center gap-1"><span className="min-w-0 flex-1 wrap-anywhere">{rule.phrase} <span className="text-muted-foreground">&middot; {rule.type}</span></span><Button type="button" variant="ghost" size="sm" disabled={disabled || busy} aria-label={`Edit matching note ${rule.phrase}`} onClick={() => setEditingRule({ id: rule.id, phrase: rule.phrase })}><Pencil className="size-4" aria-hidden /></Button></div>
            {editingRule?.id === rule.id ? <div className="grid gap-2"><label className="grid gap-1" htmlFor={`phrase-${rule.id}`}>Exact matching note<Input id={`phrase-${rule.id}`} value={editingRule.phrase} maxLength={100} disabled={disabled || busy} onChange={event => setEditingRule({ id: rule.id, phrase: event.target.value })} /></label><div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant="secondary" disabled={disabled || busy || !editingRule.phrase.trim()} onClick={() => void mutate(async () => { await saveRememberedCategory({ ...rule, phrase: editingRule.phrase.trim() }); setEditingRule(undefined) }, "Matching note updated.")}>Update matching note</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditingRule(undefined)}>Cancel note edit</Button></div></div> : null}
            <div className="flex min-w-0 items-center gap-2"><label className="sr-only" htmlFor={`remembered-${rule.id}`}>Category for {rule.phrase}</label><select id={`remembered-${rule.id}`} value={rule.categoryId} className={selectClass} disabled={disabled || busy} onChange={event => void mutate(() => saveRememberedCategory({ ...rule, categoryId: event.target.value }), "Remembered category updated.")}>{categories.filter(category => category.type === rule.type).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Button type="button" variant="ghost" size="sm" aria-label={`Forget category for ${rule.phrase}`} disabled={disabled || busy} onClick={() => void mutate(() => deleteRememberedCategory(rule.id), "Category rule forgotten.")}><Trash2 className="size-4" aria-hidden /></Button></div>
          </li>)}
        </ul>}
      </div> : null}
      {error ? <p role="alert" className="text-muted-foreground">{error}</p> : null}
      <p role="status" aria-live="polite" className={status ? "text-muted-foreground" : "sr-only"}>{status}</p>
    </div>
  </div>
}
