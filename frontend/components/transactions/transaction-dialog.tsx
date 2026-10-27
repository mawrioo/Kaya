"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CircleAlert, Plus } from "lucide-react"
import { toast } from "sonner"

import { useIsBalanceHidden } from "@/components/balance-visibility"
import { CategoryDialog } from "@/components/categories/category-dialog"
import { useData } from "@/components/data-provider"
import { DatePicker } from "@/components/date-picker"
import { AmountInput } from "@/components/amount-input"
import { Field } from "@/components/form-field"
import { CategoryOption, WalletOption, selectTriggerClasses } from "@/components/transactions/options"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiError, errorMessage, previewTransaction } from "@/lib/api"
import { formToNewCategory, type CategoryForm } from "@/lib/category-form"
import { suggestCategory, type CategorySuggestion } from "@/lib/category-suggestion"
import { toDateInput } from "@/lib/dates"
import { prepareQuickExpense } from "@/lib/quick-add"
import { describeTransaction } from "@/lib/stats"
import {
  emptyForm,
  formToTransaction,
  transactionToForm,
  validateForm,
  walletGoingBelowZero,
  type FormErrors,
  type FormField,
  type TransactionForm,
} from "@/lib/transaction-form"
import type { NewTransaction, PreviewConversation, PreviewField, Transaction, TransactionPreviewDraft, TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction being edited. Leave out to add a new one. */
  editing?: Transaction
  /** A transaction to start a new one from: everything is copied, and the date is today. It is saved as a new transaction. */
  duplicateOf?: Transaction
  /** The wallet to pre-select when adding, so repeat entries are quicker. */
  defaultWalletId: string
  /** Open with a sentence before showing the editable review form. */
  quickAdd?: boolean
  /** Saves the transaction. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (input: NewTransaction, editing?: Transaction) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

export function TransactionDialog({
  open,
  onOpenChange,
  editing,
  duplicateOf,
  defaultWalletId,
  quickAdd = false,
  onSave,
  onCloseAutoFocus,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* The form is mounted only while the dialog is open, so it starts fresh every time. */}
        <TransactionFormBody
          editing={editing}
          duplicateOf={duplicateOf}
          defaultWalletId={defaultWalletId}
          quickAdd={quickAdd}
          onCancel={() => onOpenChange(false)}
          onSave={async (input, another) => {
            await onSave(input, editing)
            // "Save and add another" keeps the box open for the next one.
            if (!another) onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** The last choice in the category list. It is never saved: it opens a small dialog to add a category instead. */
const NEW_CATEGORY = "__new__"

const TYPE_OPTIONS: { value: TransactionType; label: string; icon: typeof ArrowUpRight; selectedTone: string }[] = [
  { value: "income", label: "Income", icon: ArrowDownLeft, selectedTone: "peer-checked:text-positive" },
  { value: "expense", label: "Expense", icon: ArrowUpRight, selectedTone: "peer-checked:text-negative" },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight, selectedTone: "peer-checked:text-foreground" },
]

interface BodyProps {
  editing?: Transaction
  duplicateOf?: Transaction
  defaultWalletId: string
  quickAdd: boolean
  onCancel: () => void
  /** Saves it. `another` is true for "Save and add another": the box then stays open. */
  onSave: (input: NewTransaction, another: boolean) => Promise<void>
}

function TransactionFormBody({ editing, duplicateOf, defaultWalletId, quickAdd, onCancel, onSave }: BodyProps) {
  const { wallets: allWallets, categories, transactions, addCategory } = useData()
  // A deposito's balance follows its rate and dates, so no transaction can be recorded in it.
  const wallets = useMemo(() => allWallets.filter((wallet) => wallet.kind !== "deposito"), [allWallets])
  const isHidden = useIsBalanceHidden()
  const [form, setForm] = useState<TransactionForm>(() =>
    editing
      ? transactionToForm(editing)
      : duplicateOf
        ? { ...transactionToForm(duplicateOf), date: toDateInput(new Date()) }
        : emptyForm(defaultWalletId, new Date())
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const focusNext = useRef(false)
  const [quickLine, setQuickLine] = useState("")
  const [quickError, setQuickError] = useState("")
  const [quickStatus, setQuickStatus] = useState("")
  const [smartEntry, setSmartEntry] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [uncertainSave, setUncertainSave] = useState(false)
  const [conversation, setConversation] = useState<PreviewConversation>()
  const [reply, setReply] = useState("")
  const revision = useRef(0)
  const previewRequest = useRef<AbortController | null>(null)
  const saveInFlight = useRef(false)
  const [reviewing, setReviewing] = useState(!quickAdd || !!editing)
  const formRef = useRef<HTMLFormElement>(null)
  // A category suggested from what the note says, and whether the owner has picked one by hand. From then on
  // nothing is suggested, so their choice is never overwritten. Suggestions are only for a new transaction.
  const [suggestion, setSuggestion] = useState<CategorySuggestion>()
  // A copy keeps the category it was copied with, so a note that is changed never swaps it for a suggestion.
  const [chosenByHand, setChosenByHand] = useState(!!duplicateOf)
  // What to tell a screen reader after "Save and add another", which keeps the box open.
  const [savedStatus, setSavedStatus] = useState("")
  // The small dialog for adding a category without leaving this form.
  const [addingCategory, setAddingCategory] = useState(false)
  // True from choosing "Add new category" until the list has closed, so the list doesn't hand focus back to its own
  // button behind the little dialog (the dialog owns the keyboard then).
  const openingCategoryDialog = useRef(false)

  const isTransfer = form.type === "transfer"
  // A quiet heads-up, never a block. Left out while that wallet's balance is hidden, because it would give the balance away.
  const goingBelow = walletGoingBelowZero(form, wallets, editing)
  const belowZero = goingBelow && !isHidden(goingBelow.id) ? goingBelow : undefined
  const categoryChoices = categories.filter((category) => category.type === form.type)

  useEffect(() => () => { previewRequest.current?.abort() }, [])

  function stopPreparing() {
    revision.current++
    previewRequest.current?.abort()
    previewRequest.current = null
    setPreparing(false)
  }

  function useManualForm() {
    stopPreparing()
    setConversation(undefined)
    setReply("")
    setReviewing(true)
    setQuickStatus("Check each field below. Nothing is saved until you confirm.")
    requestAnimationFrame(() => document.getElementById("tx-amount")?.focus())
  }

  // Manual edits join the same draft. Only changed fields gain manual provenance.
  function currentConversation(): PreviewConversation | undefined {
    if (!conversation) return
    const draft: TransactionPreviewDraft = {
      ...(conversation.draft.type || form.type !== "expense" ? { type: form.type } : {}),
      ...(form.amount && !validateForm(form).amount ? { amount: Number(form.amount) } : {}),
      ...(form.walletId ? { walletId: form.walletId } : {}),
      ...(form.type === "transfer" && form.toWalletId && form.toWalletId !== form.walletId ? { toWalletId: form.toWalletId } : {}),
      ...(form.type !== "transfer" && form.categoryId ? { categoryId: form.categoryId } : {}),
      ...(form.date && !validateForm(form).date ? { date: form.date } : {}),
      description: form.note,
    }
    const sources = { ...conversation.sources }
    for (const field of Object.keys(draft) as PreviewField[]) if (draft[field] !== conversation.draft[field]) sources[field] = "manual"
    let pending = conversation.pending
    if (pending?.field === "transferEnd" && (draft.walletId !== conversation.draft.walletId || draft.toWalletId !== conversation.draft.toWalletId)) pending = undefined
    if (pending && pending.field !== "sentence" && pending.field !== "transferEnd" && draft[pending.field] !== undefined) pending = undefined
    if (!pending) {
      const missing: [PreviewField, string][] = [["type", "Is this an expense, income or transfer?"], ["amount", "How much was it?"], ["walletId", "Which wallet should this use?"], ...(form.type === "transfer" ? [["toWalletId", "Which wallet receives the money?"] as [PreviewField, string]] : []), ["date", "Which date?"], ...(form.type !== "transfer" ? [["categoryId", "Which category should this use?"] as [PreviewField, string]] : [])]
      const next = missing.find(([field]) => draft[field] === undefined)
      if (next) pending = { field: next[0], reason: "missing", message: next[1] }
    }
    return { revision: conversation.revision, draft, sources, ...(pending ? { pending } : {}) }
  }
  const activeConversation = currentConversation()
  const pendingQuestion = activeConversation?.pending
  const smartInvalid = quickAdd && smartEntry && (!!pendingQuestion || Object.keys(validateForm(form)).length > 0)

  function startNewDraft() {
    stopPreparing()
    setConversation(undefined)
    setReply("")
    setQuickLine("")
    setQuickError("")
    setQuickStatus("")
    setReviewing(false)
    setForm(emptyForm(form.walletId, new Date()))
    setChosenByHand(false)
    requestAnimationFrame(() => document.getElementById("tx-quick-add")?.focus())
  }

  async function prepareSmartEntry(answer?: string) {
    const text = answer ?? quickLine
    if (saveInFlight.current || previewRequest.current || uncertainSave || !text.trim()) return
    const base = answer === undefined ? undefined : currentConversation()
    if (base) base.revision = revision.current
    const requestRevision = revision.current
    const controller = new AbortController()
    previewRequest.current = controller
    setPreparing(true)
    if (!base) setReviewing(false)
    setQuickError("")
    setQuickStatus("Preparing on this computer…")
    try {
      const result = await previewTransaction(text, form.walletId, controller.signal, base)
      if (controller.signal.aborted || previewRequest.current !== controller || revision.current !== requestRevision || (base && result.conversation?.revision !== base.revision + 1)) return
      const draft = result.draft
      const next = {
        ...emptyForm("", new Date()),
        type: draft.type ?? "expense",
        amount: draft.amount === undefined ? "" : String(draft.amount),
        walletId: draft.walletId ?? "",
        toWalletId: draft.toWalletId ?? "",
        categoryId: draft.categoryId ?? "",
        date: draft.date ?? "",
        note: draft.description ?? "",
      }
      setConversation(result.conversation)
      revision.current = result.conversation?.revision ?? revision.current + 1
      setReply("")
      setForm(next)
      setErrors({})
      setSuggestion(undefined)
      // Keep the reviewed suggestion when its note is edited, just like a category chosen in the form.
      setChosenByHand(!!next.categoryId)
      if (result.status !== "ready") {
        setQuickError(result.message)
        setQuickStatus("")
        setReviewing(!!Object.keys(result.draft).length)
        requestAnimationFrame(() => document.getElementById("tx-reply")?.focus())
        return
      }
      setReviewing(true)
      const defaults = result.defaults.map(field => field === "wallet"
        ? `Default wallet: ${wallets.find(w => w.id === next.walletId)?.name ?? "choose below"}.`
        : field === "date" ? "Date defaults to today." : "Category defaults to Other.")
      setQuickStatus([...defaults, result.message].join(" "))
      requestAnimationFrame(() => document.getElementById(base ? "tx-reply" : "tx-amount")?.focus())
    } catch (error) {
      if (controller.signal.aborted || previewRequest.current !== controller) return
      setQuickError(errorMessage(error))
      setQuickStatus("")
    } finally {
      if (previewRequest.current === controller) {
        previewRequest.current = null
        setPreparing(false)
      }
    }
  }

  /** Fixing a field clears its message straight away. */
  function clearError(field: FormField) {
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  function update<K extends keyof TransactionForm>(field: K, value: TransactionForm[K]) {
    stopPreparing()
    setForm((current) => ({ ...current, [field]: value }))
    clearError(field as FormField)
  }

  function changeType(type: TransactionType) {
    stopPreparing()
    setQuickError("")
    setQuickStatus("")
    if (conversation) setConversation({ ...conversation, draft: { ...conversation.draft, type }, sources: { ...conversation.sources, type: "manual" } })
    // A new transaction may already have a note to suggest a category from.
    const found = !editing && type !== "transfer" ? suggestCategory(form.note, type, transactions, categories) : undefined
    setChosenByHand(false)
    setSuggestion(found)
    setForm((current) => ({
      ...current,
      type,
      // An income category can't be used for spending (or the other way round), and transfers have none.
      categoryId:
        found?.category.id ?? (categories.some((c) => c.id === current.categoryId && c.type === type) ? current.categoryId : ""),
      toWalletId: type === "transfer" && current.toWalletId !== current.walletId ? current.toWalletId : "",
    }))
    setErrors({})
  }

  /** Typing a note suggests the category it was filed under before, until the owner picks one themselves. */
  function changeNote(note: string) {
    stopPreparing()
    const suggesting = !editing && !chosenByHand && form.type !== "transfer"
    const found = suggesting ? suggestCategory(note, form.type, transactions, categories) : undefined
    setForm((current) => ({ ...current, note, ...(suggesting ? { categoryId: found?.category.id ?? "" } : {}) }))
    if (suggesting) {
      setSuggestion(found)
      if (found) clearError("categoryId")
    }
  }

  function chooseCategory(value: string) {
    // The list never reports "nothing chosen" when a person picks something. It does report it by itself when a
    // category has only just been added (its hidden native list doesn't know the new option yet), and that must
    // not wipe the category we have just chosen.
    if (value === "") return
    if (value === NEW_CATEGORY) {
      openingCategoryDialog.current = true
      setAddingCategory(true)
      return
    }
    setChosenByHand(true)
    setSuggestion(undefined)
    update("categoryId", value)
  }

  function fillFromQuickLine() {
    if (smartEntry) { void prepareSmartEntry(); return }
    if (saving || uncertainSave) return
    const result = prepareQuickExpense(quickLine, form, wallets, categories, transactions, chosenByHand)
    setQuickStatus("")
    if (!result.ok) {
      setQuickError(result.error)
      return
    }
    setForm(result.form)
    setSuggestion(result.suggestion)
    setErrors({})
    setQuickError("")
    setReviewing(true)
    const wallet = wallets.find((entry) => entry.id === result.form.walletId)
    setQuickStatus(`Form filled. ${result.walletMatched ? "Wallet" : "Kept wallet"}: ${wallet?.name ?? "choose below"}. ${result.form.categoryId ? "Review the details, then add the transaction." : "Choose a category below, then add the transaction."}`)
    // Leave the text available to correct; put the keyboard on the filled amount for review.
    requestAnimationFrame(() => document.getElementById("tx-amount")?.focus())
  }

  /** Saves a category made from inside this form, and picks it for the transaction. */
  async function handleNewCategory(categoryForm: CategoryForm) {
    try {
      const saved = await addCategory(formToNewCategory(categoryForm))
      setChosenByHand(true)
      setSuggestion(undefined)
      update("categoryId", saved.id)
      toast.success("Category added", { description: saved.name })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the little form to stay open
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || preparing || uncertainSave) return
    if (!reviewing) {
      fillFromQuickLine()
      return
    }
    // Smart entry saves only through a deliberate footer button, never an implicit Enter submission.
    if (!(quickAdd && smartEntry)) await save(false)
  }

  useEffect(() => {
    if (!saving && focusNext.current) {
      focusNext.current = false
      document.getElementById(quickAdd ? "tx-quick-add" : "tx-amount")?.focus()
    }
  }, [saving, quickAdd])

  /** Checks the form and saves it. With `another`, the box stays open and starts over for the next one. */
  async function save(another: boolean) {
    if (saveInFlight.current || preparing || uncertainSave || smartInvalid) return
    const found = validateForm(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Send the keyboard to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus())
      return
    }
    saveInFlight.current = true
    setSaving(true)
    try {
      await onSave(formToTransaction(form, new Date(), editing), another)
      if (another) startNext()
    } catch (error) {
      if (error instanceof ApiError && error.mayHaveSaved) setUncertainSave(true)
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      saveInFlight.current = false
      setSaving(false)
    }
  }

  /**
   * After "Save and add another": the kind, the wallets and the date stay (entries tend to come in batches from one day and
   * one wallet), and the amount, the note and the category start over. The keyboard goes to the amount, or, in Quick add,
   * back to the one-line box.
   */
  function startNext() {
    setConversation(undefined)
    setReply("")
    revision.current++
    focusNext.current = true
    // Simple expense entry starts over as an expense; smart entry keeps the chosen type.
    setForm((current) => ({
      ...current,
      ...(quickAdd && !smartEntry ? { type: "expense" as const, toWalletId: "" } : {}),
      amount: "",
      note: "",
      categoryId: "",
    }))
    setSuggestion(undefined)
    setChosenByHand(false)
    setErrors({})
    setSavedStatus("Saved. The form is ready for the next one.")
    if (quickAdd) {
      setQuickLine("")
      setQuickError("")
      setQuickStatus("Saved. Type the next one.")
      setReviewing(false)

    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
        <DialogHeader>
          <DialogTitle className="type-title">
            {editing ? "Edit transaction" : duplicateOf ? "Duplicate transaction" : quickAdd && smartEntry && reviewing ? "Review transaction" : reviewing ? "Add transaction" : "Quick add"}
          </DialogTitle>
          {duplicateOf && !editing ? (
            <DialogDescription>
              A copy of &ldquo;{describeTransaction(duplicateOf, allWallets, categories).title}&rdquo;, dated today. Change what you
              like, then save it.
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              Record money coming in, money going out, or a move between your wallets.
            </DialogDescription>
          )}
        </DialogHeader>

        {quickAdd && !editing ? (
          <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Entry method">
              {[true, false].map(smart => <Button key={String(smart)} type="button" size="sm" variant={smartEntry === smart ? "secondary" : "ghost"} aria-pressed={smartEntry === smart} disabled={saving || uncertainSave} onClick={() => {
                stopPreparing()
                setSmartEntry(smart)
                setConversation(undefined)
                setReply("")
                setReviewing(false)
                setQuickError("")
                setQuickStatus("")
                setForm(emptyForm(form.walletId, new Date()))
                setChosenByHand(false)
                requestAnimationFrame(() => document.getElementById("tx-quick-add")?.focus())
              }}>{smart ? "Smart entry" : "Simple expense"}</Button>)}
            </div>
            <Field label={smartEntry ? "Your transaction" : "Your expense"} htmlFor="tx-quick-add" error={conversation ? undefined : quickError}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="tx-quick-add"
                  value={quickLine}
                  maxLength={smartEntry ? 500 : 240}
                  autoComplete="off"
                  autoFocus={!reviewing}
                  placeholder={smartEntry ? "paid 35rb for lunch from BCA yesterday" : "nasi goreng 25rb BCA"}
                  aria-invalid={quickError ? true : undefined}
                  aria-describedby={`tx-quick-help${quickError ? " tx-quick-add-error" : ""}`}
                  disabled={saving || uncertainSave}
                  readOnly={smartEntry && !!conversation}
                  onChange={(event) => {
                    stopPreparing()
                    setQuickLine(event.target.value)
                    setQuickError("")
                    setQuickStatus("")
                    if (smartEntry) {
                      setReviewing(false)
                      setForm(emptyForm(form.walletId, new Date()))
                      setChosenByHand(false)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    if (!conversation && !event.nativeEvent.isComposing && !event.repeat) fillFromQuickLine()
                  }}
                  className="h-10 min-w-0 flex-1 bg-card dark:bg-card"
                />
                {!conversation ? <Button type="button" variant="secondary" size="lg" disabled={saving || preparing || uncertainSave || !quickLine.trim()} onClick={fillFromQuickLine}>
                  {preparing ? "Preparing…" : smartEntry ? "Prepare" : "Fill form"}
                </Button> : null}
              </div>
            </Field>
            <p id="tx-quick-help" className="text-sm text-muted-foreground">
              {smartEntry ? "Expense, income or transfer. English or Indonesian. Runs on this computer; you confirm every save." : "An expense in one line. Try 25rb, 25k or 1,5jt. Fill, check, then save."}
            </p>
            {smartEntry && conversation ? <div className="grid gap-2">
              <p id="tx-question" role="status" aria-live="polite" className="text-sm wrap-anywhere">{pendingQuestion?.message ?? "Anything to change? Try make that 40rb or use BCA."}</p>
              <Field label="Reply or correction" htmlFor="tx-reply" error={quickError && !pendingQuestion ? quickError : undefined}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="tx-reply" value={reply} maxLength={500} autoComplete="off" disabled={saving || uncertainSave} aria-describedby="tx-question" placeholder={pendingQuestion?.field === "amount" ? "e.g. 35rb" : "One answer or correction"} className="h-10 min-w-0 flex-1 bg-card dark:bg-card" onChange={event => { stopPreparing(); setReply(event.target.value); setQuickError("") }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!event.nativeEvent.isComposing && !event.repeat) void prepareSmartEntry(reply) } }} />
                  <Button type="button" variant="secondary" disabled={saving || preparing || uncertainSave || !reply.trim()} onClick={() => void prepareSmartEntry(reply)}>Apply</Button>
                </div>
              </Field>
              {pendingQuestion && quickError && quickError !== pendingQuestion.message ? <p role="alert" className="text-sm text-muted-foreground">{quickError}</p> : null}
              {pendingQuestion?.field === "transferEnd" ? <div className="flex gap-2">{["Source", "Destination"].map(label => <Button key={label} type="button" variant="secondary" size="sm" disabled={preparing || saving || uncertainSave} onClick={() => void prepareSmartEntry(label)}>{label}</Button>)}</div> : null}
              <Button type="button" variant="ghost" size="sm" className="justify-self-start" disabled={saving || uncertainSave} onClick={startNewDraft}>Start new</Button>
            </div> : null}
            {smartEntry && (!reviewing || conversation) ? <div className="flex flex-wrap gap-2">
              {preparing ? <Button type="button" variant="ghost" size="sm" onClick={() => { stopPreparing(); setQuickStatus("Preparation stopped. Your sentence is still here.") }}>Stop</Button> : null}
              <Button type="button" variant="ghost" size="sm" disabled={saving || uncertainSave} onClick={useManualForm}>Use form instead</Button>
            </div> : null}
            <p role="status" aria-live="polite" aria-atomic="true" className={cn("text-sm text-muted-foreground wrap-anywhere", !quickStatus && "sr-only")}>
              {quickStatus}
            </p>
          </div>
        ) : null}

        {reviewing ? <>
        <fieldset>
          <legend className="sr-only">Type of transaction</legend>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon, selectedTone }) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="transaction-type"
                  value={value}
                  checked={(!conversation || !!conversation.draft.type) && form.type === value}
                  onChange={() => changeType(value)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground peer-checked:bg-card peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    selectedTone
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Amount"
          htmlFor="tx-amount"
          error={errors.amount}
          hint={
            belowZero ? (
              <span role="status" data-slot="below-zero" className="flex items-start gap-1.5">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
                <span>This takes {belowZero.name} below zero. You can still save it.</span>
              </span>
            ) : undefined
          }
        >
          <AmountInput
            id="tx-amount"
            autoFocus
            value={form.amount}
            onChange={(digits) => update("amount", digits)}
            invalid={!!errors.amount}
            describedBy={errors.amount ? "tx-amount-error" : undefined}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {isTransfer ? null : (
            <Field
              label="Category"
              htmlFor="tx-category"
              error={errors.categoryId}
              hint={suggestion ? <>Suggested from your earlier &ldquo;{suggestion.basedOn}&rdquo;.</> : undefined}
            >
              <Select value={form.categoryId} onValueChange={chooseCategory}>
                <SelectTrigger
                  id="tx-category"
                  className={selectTriggerClasses}
                  aria-invalid={errors.categoryId ? true : undefined}
                  aria-describedby={errors.categoryId ? "tx-category-error" : undefined}
                >
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  onCloseAutoFocus={(event) => {
                    if (!openingCategoryDialog.current) return
                    openingCategoryDialog.current = false
                    event.preventDefault()
                  }}
                >
                  {categoryChoices.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <CategoryOption category={category} />
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  {/* The text value starts with "+", so typing letters to pick a category can never land here by accident. */}
                  <SelectItem value={NEW_CATEGORY} textValue="+ Add new category">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Plus className="size-3.5" aria-hidden />
                      </span>
                      Add new category
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label={isTransfer ? "From wallet" : "Wallet"} htmlFor="tx-wallet" error={errors.walletId}>
            <Select value={form.walletId} onValueChange={(value) => update("walletId", value)}>
              <SelectTrigger
                id="tx-wallet"
                className={selectTriggerClasses}
                aria-invalid={errors.walletId ? true : undefined}
                aria-describedby={errors.walletId ? "tx-wallet-error" : undefined}
              >
                <SelectValue placeholder="Choose a wallet" />
              </SelectTrigger>
              <SelectContent position="popper">
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <WalletOption wallet={wallet} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isTransfer ? (
            <Field label="To wallet" htmlFor="tx-to-wallet" error={errors.toWalletId}>
              <Select value={form.toWalletId} onValueChange={(value) => update("toWalletId", value)}>
                <SelectTrigger
                  id="tx-to-wallet"
                  className={selectTriggerClasses}
                  aria-invalid={errors.toWalletId ? true : undefined}
                  aria-describedby={errors.toWalletId ? "tx-to-wallet-error" : undefined}
                >
                  <SelectValue placeholder="Choose a wallet" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id} disabled={wallet.id === form.walletId}>
                      <WalletOption wallet={wallet} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <Field label="Date" htmlFor="tx-date" error={errors.date}>
            <DatePicker
              id="tx-date"
              value={form.date}
              onChange={(value) => update("date", value)}
              invalid={!!errors.date}
              describedBy={errors.date ? "tx-date-error" : undefined}
            />
          </Field>

          <Field label="Note (optional)" htmlFor="tx-note">
            <Input
              id="tx-note"
              value={form.note}
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Lunch with the team"
              onChange={(event) => changeNote(event.target.value)}
              className="h-10 bg-card dark:bg-card"
            />
          </Field>
        </div>

        <p role="status" className="sr-only">
          {savedStatus}
        </p>

        <DialogFooter className="mt-1">
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
          {editing ? null : (
            <Button type="button" variant="secondary" size="lg" disabled={saving || preparing || uncertainSave || smartInvalid} onClick={() => void save(true)}>
              Save and add another
            </Button>
          )}
          <Button type={quickAdd && smartEntry ? "button" : "submit"} onClick={quickAdd && smartEntry ? () => void save(false) : undefined} size="lg" disabled={saving || preparing || uncertainSave || smartInvalid}>
            {saving ? "Saving..." : editing ? "Save changes" : quickAdd && smartEntry ? "Confirm and save" : "Add transaction"}
          </Button>
        </DialogFooter>
        {uncertainSave ? <p role="alert" className="text-sm text-muted-foreground">The save could not be confirmed. <a href="/transactions" className="underline underline-offset-4">Check Transactions</a> before adding it again.</p> : null}
        </> : null}
      </form>

      {/* Outside the form on purpose: a form inside this dialog's form would also submit this one. */}
      {isTransfer ? null : (
        <CategoryDialog
          open={addingCategory}
          onOpenChange={setAddingCategory}
          fixedType={form.type === "income" ? "income" : "expense"}
          onSave={handleNewCategory}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById("tx-category")?.focus({ preventScroll: true })
          }}
        />
      )}
    </>
  )
}
